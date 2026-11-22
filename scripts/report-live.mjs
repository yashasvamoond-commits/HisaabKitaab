import { existsSync, readFileSync } from 'node:fs';

if (!existsSync(process.argv[2])) {
  console.log('::notice title=Live OCR check::no result file');
  process.exit(0);
}
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const note = (title, value) => console.log(`::notice title=${title}::${String(value).replace(/\n/g, ' ').slice(0, 900)}`);
note('Live OCR review', JSON.stringify(data.review));
note('Live save', JSON.stringify(data.saved));
note('Live errors', JSON.stringify(data.errors));
