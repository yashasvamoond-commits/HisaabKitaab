/** End-to-end check on the published URL: upload a UPI screenshot, OCR, review, save. */
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const url = process.argv[2];
if (!url) {
  console.error('usage: node scripts/check-live-ocr.mjs <url>');
  process.exit(1);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280">
  <rect width="720" height="1280" fill="#ffffff"/>
  <text x="60" y="150" font-family="DejaVu Sans" font-size="38" fill="#1b2a41">Paytm UPI</text>
  <text x="60" y="330" font-family="DejaVu Sans" font-weight="bold" font-size="54" fill="#0b7a52">Payment Successful</text>
  <text x="60" y="460" font-family="DejaVu Sans" font-weight="bold" font-size="82" fill="#111111">₹1,250.50</text>
  <text x="60" y="580" font-family="DejaVu Sans" font-size="36" fill="#555555">Paid to</text>
  <text x="60" y="650" font-family="DejaVu Sans" font-weight="bold" font-size="46" fill="#111111">Rahul Sharma</text>
  <text x="60" y="710" font-family="DejaVu Sans" font-size="34" fill="#555555">rahul.sharma@okaxis</text>
  <text x="60" y="840" font-family="DejaVu Sans" font-size="32" fill="#555555">22 Nov 2026, 4:32 PM</text>
  <text x="60" y="900" font-family="DejaVu Sans" font-size="28" fill="#777777">UPI Ref: 123456789012</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('/tmp/live-gpay.png');

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless=new'],
  headless: true,
  defaultViewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
});

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && !/Estimating resolution/.test(message.text())) errors.push(message.text());
});

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await page.evaluate(() => {
  localStorage.setItem(
    'hisaabkitaab.v1',
    JSON.stringify({
      version: 1,
      profile: { name: 'Yashasva', createdAt: new Date().toISOString() },
      settings: { onboarded: true },
      persons: [
        { id: 'p_rahul', name: 'Rahul Sharma', aliases: ['Rahul'], upi: 'rahul.sharma@okaxis', color: 'clay', createdAt: new Date().toISOString() },
      ],
      txns: [
        { id: 't_seed', personId: 'p_rahul', direction: 'out', amount: 250, note: 'Chai', category: 'food', date: new Date().toISOString(), source: 'manual', createdAt: new Date().toISOString() },
      ],
    }),
  );
});

await page.goto(url + '#/scan?mode=image', { waitUntil: 'networkidle2', timeout: 60000 });
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
await page.waitForSelector('input[type=file]', { timeout: 20000 });
const inputs = await page.$$('input[type=file]');
await inputs[0].uploadFile('/tmp/live-gpay.png');

await page.waitForFunction(() => document.body.innerText.includes('Yeh samajh aaya'), { timeout: 150000, polling: 500 });
const review = await page.evaluate(() => ({
  amount: document.querySelector('.amount-input')?.value,
  person: document.querySelector('.person-field-name')?.textContent,
  recordNote: document.querySelector('.record-note')?.textContent?.replace(/\s+/g, ' ').trim() || null,
  signals: [...document.querySelectorAll('.signal')].map((node) => node.textContent?.trim()),
}));

await page.evaluate(() => {
  const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.includes('Hisaab mein daalo'));
  button?.click();
});
await page.waitForFunction(() => document.body.innerText.includes('Hisaab mein daal diya'), { timeout: 15000 });
const saved = await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('hisaabkitaab.v1'));
  return { txnCount: state.txns.length, total: state.txns.reduce((sum, txn) => sum + txn.amount, 0) };
});

console.log(JSON.stringify({ url, review, saved, errors }, null, 2));
await browser.close();
