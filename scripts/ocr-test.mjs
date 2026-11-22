import { createWorker } from 'tesseract.js';
import path from 'node:path';
const worker = await createWorker('eng', 1, {
  corePath: path.resolve('node_modules/tesseract.js-core'),
  langPath: path.resolve('node_modules/@tesseract.js-data/eng/4.0.0_best_int'),
  gzip: true,
  cacheMethod: 'none',
  logger: (m) => { if (m.status === 'recognizing text' && m.progress % 0.25 < 0.02) console.log('  ', m.status, Math.round(m.progress * 100) + '%'); },
});
await worker.setParameters({ preserve_interword_spaces: '1' });
const { data } = await worker.recognize('/tmp/gpay.png');
console.log('--- OCR TEXT ---');
console.log(data.text);
console.log('--- confidence', data.confidence);
await worker.terminate();
