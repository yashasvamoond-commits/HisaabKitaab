import { parseTransaction, nameSimilarity, parseAmountInput } from '../src/lib/parse.ts';

const persons = [
  { id: 'p1', name: 'Rahul Sharma', aliases: ['Rahul'], color: '#eee', createdAt: '' },
  { id: 'p2', name: 'Priya Verma', aliases: ['Priya'], color: '#eee', createdAt: '' },
  { id: 'p3', name: 'Amit Kumar', aliases: ['Amit'], color: '#eee', createdAt: '' },
];

const cases: any[] = [
  {
    name: 'GPay paid screen',
    text: `You paid
₹250
To Rahul Sharma
rahul.sharma@okaxis
Transaction successful
Today, 4:32 PM
UPI Ref: 123456789012`,
    expect: { amount: 250, direction: 'out', person: 'Rahul Sharma', personId: 'p1' },
  },
  {
    name: 'PhonePe paid',
    text: `PhonePe
Payment Successful
Paid to Rahul Sharma
₹1,250.50
From: HDFC Bank
Today at 9:15 PM`,
    expect: { amount: 1250.5, direction: 'out', personId: 'p1' },
  },
  {
    name: 'Paytm received',
    text: `Paytm
Money received!
₹500
Priya Verma paid you ₹500
Transaction ID 4567890123`,
    expect: { amount: 500, direction: 'in', personId: 'p2' },
  },
  {
    name: 'Bank SMS debit to VPA',
    text: `Rs.1200.00 debited from A/c XX1234 on 22-11-26 to VPA rahul@okaxis (RAHUL SHARMA). UPI Ref 456789123456. Avl Bal Rs.8,420.35`,
    expect: { amount: 1200, direction: 'out', personId: 'p1' },
  },
  {
    name: 'Bank SMS credit',
    text: `Dear Customer, Rs 2,000.00 credited to your account XX9821 on 21-11-2026 from PRIYA VERMA (UPI Ref 9988776655).`,
    expect: { amount: 2000, direction: 'in', personId: 'p2' },
  },
  {
    name: 'Hinglish chat',
    text: `Rahul: bhai kal ke chai ke 120 rupaye diye the, 80 baaki hai`,
    expect: { amount: 120, personId: 'p1', direction: 'out' },
  },
  {
    name: 'Hinglish mein diye',
    text: `Maine Rahul ko auto ke liye 90 rupaye diye`,
    expect: { amount: 90, direction: 'out', personId: 'p1' },
  },
  {
    name: 'Uber split chat (actionable share wins)',
    text: `Priya: uber ka 340 tha, maine pay kiya. tu 170 de de`,
    expect: { amountRange: [170, 340], personId: 'p2', direction: 'out' },
  },
  {
    name: 'GPay with name only from VPA',
    text: `₹750\nRahul Sharma\nrahul.sharma@okaxis\nPayment successful`,
    expect: { amount: 750, direction: 'out', personId: 'p1' },
  },
  {
    name: 'Order flipped',
    text: `Paid to Rahul Sharma ₹250 via UPI`,
    expect: { amount: 250, direction: 'out', personId: 'p1' },
  },
  {
    name: 'Received no from keyword adjacency',
    text: `₹1,000 received\nPriya Verma\n11:45 AM`,
    expect: { amount: 1000, direction: 'in', personId: 'p2' },
  },
  {
    name: 'Hinglish without maine',
    text: `Rahul ko 500 diye kal`,
    expect: { amount: 500, direction: 'out', personId: 'p1' },
  },
  {
    name: 'Noisy OCR',
    text: `You pald\n*250\nTo Rahul Sharma\nTransactlon successful\nUPI Ref 99887`,
    expect: { direction: 'out', personId: 'p1' },
  },
  {
    name: 'Multi-line WhatsApp forward',
    text: `Priya Verma: Dinner bill 1800 tha, 3 log the\nPriya Verma: mera hissa 600 hai, baaki tu de de`,
    expect: { personId: 'p2' },
  },
  {
    name: 'Two amounts, balance noise',
    text: `Payment of ₹850 to Amit Kumar successful. Avl Bal ₹4,210. Total limit ₹50,000`,
    expect: { amount: 850, direction: 'out', personId: 'p3' },
  },
  {
    name: 'New person (no record)',
    text: `You paid ₹1,500 to Suresh Menon
suresh.menon@ybl
Completed`,
    expect: { amount: 1500, direction: 'out', person: 'Suresh Menon', personId: undefined },
  },
  {
    name: 'UPI ref must not be amount',
    text: `₹499 paid to Priya Verma
UPI Ref 123456789012
Date 22/11/2026`,
    expect: { amount: 499, direction: 'out', personId: 'p2' },
  },
  {
    name: 'Rent note',
    text: `Rahul Sharma ne November ka kiraya ₹11,000 diya`,
    expect: { amount: 11000, direction: 'in', personId: 'p1' },
  },
  {
    name: 'Garbage text',
    text: `Good morning dost, kya haal hai?`,
    expect: { amount: null },
  },
  {
    name: 'Phone number not amount',
    text: `Paid ₹300 to Amit Kumar. Call 9845012345 for support`,
    expect: { amount: 300, direction: 'out', personId: 'p3' },
  },
  {
    name: 'Screenshot with rupee splits',
    text: `SENT
₹2,34,500
to Rahul Sharma
Transfer successful`,
    expect: { amount: 234500, direction: 'out', personId: 'p1' },
  },
];

let failures = 0;
for (const c of cases) {
  const d = parseTransaction(c.text, { persons, selfName: 'Yashasva Moond', source: 'chat' });
  const problems: string[] = [];
  if (c.expect.amount !== undefined && d.amount !== c.expect.amount) problems.push(`amount ${d.amount} != ${c.expect.amount}`);
  if (c.expect.amountRange && (d.amount == null || d.amount < c.expect.amountRange[0] || d.amount > c.expect.amountRange[1])) problems.push(`amount ${d.amount} outside ${c.expect.amountRange}`);
  if (c.expect.direction && d.direction !== c.expect.direction) problems.push(`direction ${d.direction} != ${c.expect.direction}`);
  if (c.expect.personId !== undefined && (d.person?.personId ?? undefined) !== c.expect.personId) problems.push(`personId ${d.person?.personId} != ${c.expect.personId}`);
  if (c.expect.person && d.person?.name !== c.expect.person) problems.push(`person ${d.person?.name} != ${c.expect.person}`);
  const ok = problems.length === 0;
  if (!ok) failures++;
  console.log(`${ok ? '✅' : '❌'} ${c.name}`);
  console.log(`     amount=${d.amount} dir=${d.direction} person=${d.person?.name} (${d.person?.personId ?? 'new'}) conf=${d.confidence} cat=${d.category} note=${JSON.stringify(d.note)} date=${d.date.slice(0, 10)}`);
  if (!ok) console.log(`     → ${problems.join('; ')}\n     raw: ${JSON.stringify(c.text.slice(0, 120))}`);
}

// sanity checks
const extra: [string, boolean][] = [
  ['nameSimilarity exact', nameSimilarity('rahul sharma', 'Rahul Sharma') === 1],
  ['nameSimilarity first name', nameSimilarity('Rahul', 'Rahul Sharma') > 0.8],
  ['nameSimilarity different', nameSimilarity('Suresh', 'Rahul Sharma') < 0.3],
  ['parseAmountInput ₹1,250.50', parseAmountInput('₹1,250.50') === 1250.5],
];

for (const [label, ok] of extra) {
  if (!ok) failures++;
  console.log(`${ok ? '✅' : '❌'} ${label}`);
}

console.log(`\n${failures === 0 ? 'All good 🎉' : `${failures} failure(s)`}`);
process.exit(failures ? 1 : 0);
