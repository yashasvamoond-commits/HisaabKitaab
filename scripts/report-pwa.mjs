import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const note = (title, value) => console.log(`::notice title=${title}::${String(value).replace(/\n/g, ' ').slice(0, 900)}`);

note('Manifest errors', JSON.stringify(data.manifestErrors));
note('Installability', JSON.stringify(data.installability));
note('Badge', JSON.stringify(data.info?.badge));
note('App boot', `${data.info?.title} | host=${data.info?.host} | overlapsBadge=${data.info?.overlapsTabbar} | sw=${data.info?.hasServiceWorker} | errors=${(data.errors || []).length}`);
