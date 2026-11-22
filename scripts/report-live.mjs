import { existsSync, readFileSync } from 'node:fs';

if (!existsSync(process.argv[2])) {
  console.log('::notice title=Live OCR check::no result file');
  process.exit(0);
}
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const note = (title, value) => console.log(`::notice title=${title}::${String(value).replace(/\n/g, ' ').slice(0, 900)}`);
note('Outgoing review', JSON.stringify(data.outgoingReview));
note('Outgoing save', JSON.stringify(data.afterOutgoing));
note('Incoming review', JSON.stringify(data.incomingReview));
note('Incoming save', JSON.stringify(data.afterIncoming));
note('Live errors', JSON.stringify(data.errors));
