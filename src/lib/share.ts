import type { AppState } from './types';

const SHARE_CACHE = 'hk-share-inbox';

export interface SharedPayload {
  text?: string;
  file?: File;
  url?: string;
}

const metaUrl = () => new URL('__share-meta', document.baseURI);
const fileUrl = (i: number) => new URL(`__share-file-${i}`, document.baseURI);

/** Reads a payload handed over by the Android share sheet (via the service worker). */
export async function consumeShare(): Promise<SharedPayload | null> {
  if (typeof document === 'undefined') return null;

  // Direct links: ./?share_text=...
  const params = new URLSearchParams(location.search);
  const directText = params.get('share_text') || params.get('text') || params.get('title');
  if (directText) {
    history.replaceState(null, '', location.pathname + location.hash);
    return { text: directText };
  }

  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const metaRes = await cache.match(metaUrl());
    if (!metaRes) return null;
    const meta = (await metaRes.json()) as {
      text?: string;
      url?: string;
      files?: { name: string; type: string }[];
    };

    let file: File | undefined;
    if (meta.files && meta.files.length) {
      const res = await cache.match(fileUrl(0));
      if (res) {
        const blob = await res.blob();
        const name = meta.files[0].name || 'shared-screenshot.png';
        file = new File([blob], name, { type: blob.type || meta.files[0].type || 'image/png' });
      }
    }

    await cache.delete(metaUrl());
    for (let i = 0; i < 4; i++) await cache.delete(fileUrl(i)).catch(() => false);

    // Clean the ?share=1 marker from the URL.
    if (params.get('share')) {
      history.replaceState(null, '', location.pathname + location.hash);
    }

    return { text: meta.text, file, url: meta.url };
  } catch (err) {
    console.warn('share read failed', err);
    return null;
  }
}

/** Builds a short, polite WhatsApp reminder. */
export function reminderText(opts: {
  selfName: string;
  personName: string;
  amount: number;
  direction: 'out' | 'in';
}): string {
  const who = opts.personName.split(' ')[0];
  const amount = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(opts.amount);
  if (opts.direction === 'out') {
    return `Hi ${who}, a quick reminder that ₹${amount} is still pending from our shared expenses. No rush — whenever it works for you.\n\n— ${opts.selfName || 'You'}, via HisaabKitaab`;
  }
  return `Hi ${who}, I'll clear the ₹${amount} I owe you shortly. Thanks for covering it!\n\n— ${opts.selfName || 'You'}, via HisaabKitaab`;
}

export function downloadJson(state: AppState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hisaabkitaab-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readJsonFile(file: File): Promise<AppState> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)) as AppState);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/* ------------------------------------------------------------------ */
/* in-memory handoff between app shell and the scan screen             */
/* ------------------------------------------------------------------ */

let pendingShare: SharedPayload | null = null;

export function setPendingShare(payload: SharedPayload | null) {
  pendingShare = payload;
}

export function takePendingShare(): SharedPayload | null {
  const payload = pendingShare;
  pendingShare = null;
  return payload;
}
