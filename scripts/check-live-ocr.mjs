/** End-to-end check on the published URL: upload UPI screenshots, review, save. */
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const url = process.argv[2];
if (!url) {
  console.error('usage: node scripts/check-live-ocr.mjs <url>');
  process.exit(1);
}

const outgoing = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280">
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

const incoming = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280">
  <rect width="720" height="1280" fill="#0e0e12"/>
  <text x="60" y="150" font-family="DejaVu Sans" font-size="40" fill="#9aa4b2">PhonePe</text>
  <circle cx="360" cy="270" r="46" fill="#1cc29f"/>
  <text x="60" y="430" font-family="DejaVu Sans" font-size="34" fill="#9aa4b2">Paid to</text>
  <text x="60" y="490" font-family="DejaVu Sans" font-weight="bold" font-size="44" fill="#ffffff">YASHASVA MOOND</text>
  <text x="60" y="540" font-family="DejaVu Sans" font-size="30" fill="#9aa4b2">adv.yashasva@ibl</text>
  <text x="60" y="680" font-family="DejaVu Sans" font-weight="bold" font-size="80" fill="#1cc29f">₹19,200</text>
  <text x="60" y="800" font-family="DejaVu Sans" font-size="30" fill="#9aa4b2">Debited from</text>
  <text x="60" y="850" font-family="DejaVu Sans" font-size="32" fill="#ffffff">XXXXXX9242</text>
  <text x="60" y="950" font-family="DejaVu Sans" font-size="28" fill="#9aa4b2">22 Nov 2026, 02:13 pm</text>
  <text x="60" y="1000" font-family="DejaVu Sans" font-size="26" fill="#9aa4b2">UTR: 825219614916</text>
  <text x="60" y="1050" font-family="DejaVu Sans" font-size="26" fill="#9aa4b2">Txn ID T2611221413361467580305</text>
</svg>`;

await sharp(Buffer.from(outgoing)).png().toFile('/tmp/live-gpay.png');
await sharp(Buffer.from(incoming)).png().toFile('/tmp/live-incoming.png');

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

const seed = async () => {
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem(
      'hisaabkitaab.v1',
      JSON.stringify({
        version: 1,
        profile: { name: 'Yashasva Moond', createdAt: now },
        settings: { onboarded: true, sound: true },
        persons: [
          { id: 'p_rahul', name: 'Rahul Sharma', aliases: ['Rahul'], upi: 'rahul.sharma@okaxis', color: 'clay', createdAt: now },
        ],
        txns: [],
      }),
    );
  });
};

const run = async (file) => {
  await page.goto(url + '#/scan?mode=image', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('input[type=file]', { timeout: 20000 });
  const inputs = await page.$$('input[type=file]');
  await inputs[0].uploadFile(file);
  await page.waitForFunction(() => document.body.innerText.includes('Review expense'), { timeout: 180000, polling: 500 });
  const review = await page.evaluate(() => ({
    amount: document.querySelector('.amount-input')?.value,
    direction: document.querySelector('[role=tab][aria-selected=true]')?.textContent?.trim(),
    person: document.querySelector('.person-field-name')?.textContent?.trim() || null,
    notice: document.querySelector('.notice.is-info')?.textContent?.replace(/\s+/g, ' ').trim() || null,
    chips: [...document.querySelectorAll('.source-chip, .source-app, .confidence')].map((node) => node.textContent?.trim()),
  }));
  return review;
};

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await seed();

const outgoingReview = await run('/tmp/live-gpay.png');
await page.evaluate(() => {
  document.querySelector('.review-cta .btn-primary')?.click();
});
await page.waitForFunction(() => document.body.innerText.includes('Entry added'), { timeout: 15000 });
const afterOutgoing = await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('hisaabkitaab.v1'));
  return state.txns.map((txn) => ({ amount: txn.amount, direction: txn.direction, personId: txn.personId }));
});

await seed();
await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
const incomingReview = await run('/tmp/live-incoming.png');
// The payer is not in the receipt: pick the existing contact, then save.
await page.evaluate(() => document.querySelector('.person-field')?.click());
await page.waitForSelector('.person-panel .search-field input', { timeout: 10000 });
await page.type('.person-panel .search-field input', 'Rahul');
await new Promise((resolve) => setTimeout(resolve, 300));
await page.evaluate(() => {
  const row = [...document.querySelectorAll('.person-option')].find((node) => node.textContent?.includes('Rahul Sharma'));
  row?.click();
});
await new Promise((resolve) => setTimeout(resolve, 300));
await page.evaluate(() => {
  document.querySelector('.review-cta .btn-primary')?.click();
});
await page.waitForFunction(() => document.body.innerText.includes('Entry added'), { timeout: 15000 });
const afterIncoming = await page.evaluate(() => {
  const state = JSON.parse(localStorage.getItem('hisaabkitaab.v1'));
  return state.txns.map((txn) => ({ amount: txn.amount, direction: txn.direction, personId: txn.personId, person: state.persons.find((p) => p.id === txn.personId)?.name }));
});

console.log(JSON.stringify({ url, outgoingReview, incomingReview, afterOutgoing, afterIncoming, errors }, null, 2));
await browser.close();
