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
async function prepareImage(blob: Blob): Promise<Blob | HTMLCanvasElement> {
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

export async function ocrImage(
  blob: Blob,
  onProgress?: (progress: number, status: string) => void,
): Promise<string> {
  progressListener = (p, status) => onProgress?.(p, status);
  const worker = await getWorker();
  const prepared = await prepareImage(blob);
  const result = await worker.recognize(prepared);
  return (result.data.text || '').replace(/\n{3,}/g, '\n\n').trim();
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
