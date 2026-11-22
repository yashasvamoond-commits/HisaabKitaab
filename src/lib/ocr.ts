import { createWorker, PSM } from 'tesseract.js';

type TessWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<TessWorker> | null = null;
let progressListener: ((progress: number, status: string) => void) | null = null;
const asset = (path: string) => new URL(path, document.baseURI).href;

async function getWorker(): Promise<TessWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        workerPath: asset('ocr/worker.min.js'),
        corePath: asset('ocr/core'),
        langPath: asset('ocr/lang'),
        gzip: true,
        logger: (m: { progress: number; status: string }) => {
          progressListener?.(m.progress || 0, m.status || '');
        },
      });
      await worker.setParameters({
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: PSM.AUTO,
        user_defined_dpi: '300',
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/** Make dark UPI screenshots OCR-friendly and keep big images fast. */
async function prepareImage(blob: Blob): Promise<HTMLCanvasElement | Blob> {
  if (typeof document === 'undefined' || !('createImageBitmap' in window)) return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const max = 1800;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    let sum = 0;
    let samples = 0;
    for (let i = 0; i < data.length; i += 4 * 29) {
      sum += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      samples++;
    }
    const invert = samples ? sum / samples < 110 : false;

    for (let i = 0; i < data.length; i += 4) {
      let l = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (invert) l = 255 - l;
      l = Math.max(0, Math.min(255, (l - 128) * 1.22 + 128));
      data[i] = data[i + 1] = data[i + 2] = l;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  } catch {
    return blob;
  }
}

export interface OcrResult {
  /** Best single text (kept for simple callers). */
  text: string;
  /** Every pass that produced text, best first. */
  variants: string[];
}

const cleanText = (raw: string) =>
  (raw || '')
    .replace(/[\u200e\u200f\u202a-\u202e]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/** Cheap signal that a pass found the useful part of a receipt. */
function looksComplete(text: string): boolean {
  const strong = /\b(paid\s+to|received\s+from|sent\s+to|banking\s+name|transaction\s+id|debited\s+from|credited\s+to)\b/i.test(text);
  const amount = /(?:₹|€|£|¥|¢|©|®|rs\.?|inr)\s*\d[\d,]*(?:\.\d{1,2})?|\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b/i.test(text);
  return strong && amount && text.length > 60;
}

function looksTrusted(text: string): boolean {
  if (/(?:₹|€|£|¥|¢|\brs\.?|\binr)\s*\d/i.test(text)) return true;
  // © and ® are usually ₹ misreads; try one more pass before trusting them.
  if (/[©®]\s*\d/.test(text)) return false;
  const values = [...text.matchAll(/\d[\d,]*(?:\.\d{1,2})?/g)]
    .map((m) => Number(m[0].replace(/,/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
  return !values.some((n) => n > 100000);
}

function keywordScore(text: string): number {
  const keys = [
    'paid to', 'received from', 'banking name', 'transaction id', 'utr', 'debited from',
    'credited to', 'amount', 'phonepe', 'google pay', 'paytm', 'upi',
  ];
  let score = 0;
  for (const k of keys) if (text.toLowerCase().includes(k)) score += 4;
  if (/\d[\d,]*\.\d{2}\b/.test(text)) score += 2;
  return score + Math.min(text.length, 700) / 100;
}

/** Rotate a canvas without clipping the corners. */
function rotateCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const rad = (degrees * Math.PI) / 180;
  const w = source.width;
  const h = source.height;
  const out = document.createElement('canvas');
  out.width = Math.ceil(Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad)));
  out.height = Math.ceil(Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad)));
  const ctx = out.getContext('2d');
  if (!ctx) return source;
  // After the grayscale pass dark screenshots are light; a white matte is safe.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.translate(out.width / 2, out.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(source, -w / 2, -h / 2);
  return out;
}

/**
 * Runs up to four OCR passes and returns every distinct text.
 * The first pass handles clean screenshots; the angled / sparse passes
 * recover phone photos that were taken at an angle or in poor light.
 */
export async function ocrImage(
  blob: Blob,
  onProgress?: (progress: number, status: string) => void,
): Promise<OcrResult> {
  const worker = await getWorker();
  const prepared = await prepareImage(blob);
  const variants: string[] = [];
  const seen = new Set<string>();

  const passes: { angle: number; psm: PSM; label: string }[] = [
    { angle: 0, psm: PSM.AUTO, label: 'Reading screenshot' },
    { angle: 5, psm: PSM.AUTO, label: 'Straightening photo' },
    { angle: -5, psm: PSM.AUTO, label: 'Reading again (other angle)' },
    { angle: 0, psm: PSM.SPARSE_TEXT, label: 'Reading details' },
  ];

  let best: string | null = null;
  for (let i = 0; i < passes.length; i += 1) {
    const pass = passes[i];
    const base = i > 0 && typeof document !== 'undefined' && prepared instanceof HTMLCanvasElement
      ? rotateCanvas(prepared, pass.angle)
      : prepared;
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: pass.psm,
      user_defined_dpi: '300',
    });
    progressListener = (p, status) =>
      onProgress?.(Math.min(0.96, (i + Math.max(0, Math.min(1, p))) / passes.length), status || pass.label);
    const result = await worker.recognize(base);
    const text = cleanText(result.data.text);
    if (text.length > 12 && !seen.has(text)) {
      seen.add(text);
      variants.push(text);
    }
    if (!best && looksComplete(text)) best = text;
    // Clean digital screenshots are done after one pass. If the only amount
    // found is a large number with no currency mark (₹ is often read as 2),
    // try one angled pass before trusting it.
    if (best && (looksTrusted(best) || i === passes.length - 1)) break;
  }

  variants.sort((a, b) => keywordScore(b) - keywordScore(a));
  return { text: best || variants[0] || '', variants };
}

export async function warmUpOcr(onProgress?: (progress: number, status: string) => void) {
  progressListener = (p, status) => onProgress?.(p, status);
  await getWorker();
}

export async function disposeOcr() {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    /* ignore */
  }
  workerPromise = null;
}
