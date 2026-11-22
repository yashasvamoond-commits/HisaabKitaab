/**
 * Copies the Tesseract worker, WASM core and English model into public/ocr so the
 * app can do OCR fully offline with zero third-party CDN calls at runtime.
 */
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';

const step = (msg) => console.log(`[ocr] ${msg}`);
const copy = (from, to) => {
  if (!existsSync(from)) {
    console.warn(`[ocr] missing ${from} — run npm install first`);
    return;
  }
  mkdirSync(to.slice(0, to.lastIndexOf('/')), { recursive: true });
  copyFileSync(from, to);
};

mkdirSync('public/ocr/core', { recursive: true });
mkdirSync('public/ocr/lang', { recursive: true });

copy('node_modules/tesseract.js/dist/worker.min.js', 'public/ocr/worker.min.js');

const cores = [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-lstm.wasm',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm',
];
for (const f of cores) copy(`node_modules/tesseract.js-core/${f}`, `public/ocr/core/${f}`);

copy(
  'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
  'public/ocr/lang/eng.traineddata.gz',
);

try {
  const total = [
    'public/ocr/worker.min.js',
    'public/ocr/lang/eng.traineddata.gz',
    'public/ocr/core/tesseract-core-lstm.wasm',
  ].reduce((n, f) => n + (existsSync(f) ? statSync(f).size : 0), 0);
  step(`ready (${(total / 1024 / 1024).toFixed(1)} MB core assets)`);
} catch {
  step('ready');
}
