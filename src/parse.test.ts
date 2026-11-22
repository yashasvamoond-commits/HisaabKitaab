import { describe, expect, it } from 'vitest';
import { isSelfName, parseTransaction } from './lib/parse';

const SELF = 'Yashasva Moond';

describe('incoming payment screenshots', () => {
  it('reads a PhonePe receipt paid to me as money in', () => {
    const text = `02:13 pm on 22 Nov 2026
Paid to
YASHASVA MOOND         219,200
adv.yashasva@ibl
Banking Name         * Yashasva Moond
PhonePe Transaction ID
T2611221413361467580305
Debited from
       XXXXXXXXXX48924           19,200
UTR: 825219614916`;
    const out = parseTransaction(text, { selfName: SELF, source: 'screenshot' });
    expect(out.amount).toBe(19200);
    expect(out.direction).toBe('in');
    expect(out.selfPayment).toBe(true);
    expect(out.person).toBeNull();
    expect(out.candidates).toHaveLength(0);
  });

  it('reads the angled pass (€19,200) correctly', () => {
    const text = `Paid to
YASHASVA MOOND  €19,200
adv.yashasva@ibl
Banking Name  Yashasva Moond
PhonePe Transaction ID T2611221413361467580305
Debited from
XXXXXXXXXX48924 219.200
UTR: 825219614916`;
    const out = parseTransaction(text, { selfName: SELF, source: 'screenshot' });
    expect(out.amount).toBe(19200);
    expect(out.direction).toBe('in');
    expect(out.selfPayment).toBe(true);
  });

  it('reads the second receipt even when the first name line is split', () => {
    const text = `Paid to
YASHASVA MOOND
adv.yashasva@ibl
₹10,500
Banking Name: Yashasva Moond
PhonePe Transaction ID T2611221803488517580804
Debited from XXXXXX9242
UTR: 183985502788`;
    const out = parseTransaction(text, { selfName: 'Yashasva', source: 'screenshot' });
    expect(out.amount).toBe(10500);
    expect(out.direction).toBe('in');
    expect(out.selfPayment).toBe(true);
    expect(out.person).toBeNull();
  });

  it('keeps a normal payment to someone else as outgoing', () => {
    const out = parseTransaction('Paid to Rahul Sharma ₹250', { selfName: SELF, source: 'screenshot' });
    expect(out.amount).toBe(250);
    expect(out.direction).toBe('out');
    expect(out.person?.name).toBe('Rahul Sharma');
    expect(out.selfPayment).toBeUndefined();
  });
});

describe('message parsing', () => {
  it('understands a received payment', () => {
    const out = parseTransaction('Received ₹500 from Priya Verma', { selfName: SELF });
    expect(out.amount).toBe(500);
    expect(out.direction).toBe('in');
    expect(out.person?.name).toBe('Priya Verma');
  });

  it('still understands Hinglish chat', () => {
    const out = parseTransaction('Rahul ko 500 diye', { selfName: SELF });
    expect(out.amount).toBe(500);
    expect(out.direction).toBe('out');
    expect(out.person?.name).toBe('Rahul');
  });
});

describe('isSelfName', () => {
  it('matches partial names', () => {
    expect(isSelfName('YASHASVA MOOND', 'Yashasva')).toBe(true);
    expect(isSelfName('Yashasva Moond', 'Yashasva Moond')).toBe(true);
    expect(isSelfName('Rahul Sharma', 'Yashasva')).toBe(false);
  });
});
