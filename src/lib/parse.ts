import type { Category, Direction, Person, Source } from './types';

export type DirectionGuess = Direction | 'unknown';

export interface PersonHint {
  name: string;
  upi?: string;
  /** 0..1 — how sure are we that this is a real person name */
  score: number;
  method: string;
  personId?: string;
}

export interface ParsedDraft {
  amount: number | null;
  direction: DirectionGuess;
  person: PersonHint | null;
  candidates: PersonHint[];
  /** ISO date string */
  date: string;
  note: string;
  category: Category;
  /** 0..1 overall confidence */
  confidence: number;
  signals: string[];
  rawText: string;
  source: Source;
  app?: string;
}

export interface ParseOptions {
  selfName?: string;
  persons?: Person[];
  now?: Date;
  source?: Source;
}

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

const clean = (s: string) => s.replace(/\u00a0/g, ' ').replace(/[\u200e\u200f\u202a-\u202e]/g, '');

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

const HONORIFICS = /^(?:mr|mrs|ms|miss|shri|smt|dr|sri)\.?\s+/i;

const BAD_NAME_WORDS = new Set([
  'upi', 'vpa', 'bank', 'account', 'ac', 'a/c', 'balance', 'bal', 'avl', 'available', 'amount',
  'amt', 'transaction', 'transactions', 'txn', 'success', 'successful', 'completed', 'complete',
  'pending', 'failed', 'failure', 'pay', 'paid', 'payment', 'payments', 'sent', 'sent', 'receive',
  'received', 'receiver', 'sender', 'money', 'transfer', 'transferred', 'google', 'gpay', 'googlepay',
  'phonepe', 'paytm', 'bhim', 'amazon', 'amazonpay', 'whatsapp', 'hdfc', 'sbi', 'icici', 'axis',
  'kotak', 'ybl', 'okaxis', 'oksbi', 'okhdfcbank', 'okicici', 'paytm', 'apl', 'ibl', 'airtel',
  'jio', 'vi', 'mobikwik', 'freecharge', 'cred', 'slice', 'navi', 'merchant', 'details', 'status',
  'date', 'time', 'note', 'notes', 'india', 'inr', 'rs', 'rupees', 'rupaye', 'you', 'your', 'me',
  'my', 'self', 'new', 'the', 'and', 'with', 'by', 'of', 'to', 'from', 'for', 'on', 'at', 'via',
  'using', 'ref', 'rrn', 'utr', 'id', 'no', 'number', 'today', 'yesterday', 'tomorrow', 'aaj', 'kal',
  'toll', 'free', 'awesome', 'nice', 'great', 'hello', 'hi', 'ok', 'okay', 'thanks', 'thank',
  'rupay', 'kar', 'ka', 'ki', 'ko', 'ke', 'hai', 'hain', 'tha', 'the', 'bhai', 'bro', 'yaar',
]);

const NAME_STOP = new Set([
  ...BAD_NAME_WORDS,
  'has', 'have', 'had', 'was', 'were', 'is', 'are', 'been', 'will', 'be', 'can', 'could', 'would',
  'should', 'this', 'that', 'these', 'those', 'please', 'kindly', 'now', 'then', 'also', 'only',
  'just', 'very', 'more', 'less', 'total', 'balance', 'debit', 'credit', 'through', 'through',
  'towards', 'your', 'our', 'their', 'his', 'her', 'its', 'says', 'said', 'asks', 'asked',
  'sent', 'send', 'sending', 'paid', 'paying', 'received', 'receiving', 'debited', 'credited',
  'successful', 'successfully', 'transaction', 'details', 'reference', 'ref', 'refno', 'upi',
  'vpa', 'bank', 'account', 'acct', 'branch', 'ifsc', 'safe', 'secure', 'security', 'password',
  'otp', 'pin', 'do', 'not', 'share', 'anyone', 'never', 'tap', 'click', 'check', 'view', 'know',
  'more', 'help', 'support', 'customer', 'care', 'team', 'app', 'link', 'open', 'download',
]);

const NAME_STOP_HI = new Set(['ko', 'ne', 'se', 'ka', 'ki', 'ke', 'hai', 'tha', 'diye', 'diya', 'liye', 'liya', 'bheja', 'bheje', 'rupaye', 'kar', 'de']);

const BAD_FULL_NAMES = new Set([
  'google pay', 'phone pe', 'phonepe', 'amazon pay', 'paytm upi', 'bhim upi', 'upi id', 'upi ref',
  'money sent', 'money received', 'payment successful', 'transaction successful', 'new user',
  'my account', 'your account', 'bank account', 'self transfer', 'scan and pay', 'pay to',
  'paid to', 'received from', 'sent to', 'cash back', 'cashback', 'a/c', 'xx', 'null', 'undefined',
]);

/* ------------------------------------------------------------------ */
/* amount extraction                                                   */
/* ------------------------------------------------------------------ */

interface AmountHit {
  value: number;
  index: number;
  score: number;
  marker: string;
}

const NUM = String.raw`\d[\d,]*(?:\.\d{1,2})?`;

function toNumber(raw: string): number {
  const n = Number.parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function plausibleAmount(value: number, raw: string, text: string, index: number, marker: string): boolean {
  if (!(value > 0) || value > 5000000) return false;
  const before = text.slice(Math.max(0, index - 26), index).toLowerCase();
  const after = text.slice(index + raw.length, index + raw.length + 18).toLowerCase();

  // Skip things that are clearly not the money figure.
  if (/(?:bal|balance|avl|avail|available|limit|otp|pin|pincode|mobile|phone|contact|ref|rrn|utr|txn|transaction\s*(?:id|no)|account\s*(?:no|number)|a\/c|acct|ifsc|xx+)\s*[:#.]?\s*$/.test(before)) {
    return false;
  }
  if (/^\s*(?:%|percent|gb|mb|days?|hours?|mins?|km|kms)\b/.test(after)) return false;
  // 10-digit phone-like numbers
  if (!raw.includes('.') && !raw.includes(',') && raw.length === 10 && /^[6-9]/.test(raw)) return false;
  // Years / dates
  if (!raw.includes('.') && !raw.includes(',') && Number(raw) >= 1900 && Number(raw) <= 2100) return false;
  // long reference numbers
  if (!raw.includes('.') && !raw.includes(',') && raw.length > 6 && marker === 'plain') return false;
  return true;
}

function scoreAmount(
  text: string,
  index: number,
  raw: string,
  marker: string,
  markerStrength: number,
): number {
  let score = markerStrength;
  const window = text.slice(Math.max(0, index - 70), index + raw.length + 70).toLowerCase();
  if (/(?:paid|pay|sent|send|received|receive|transfer|debited|credited|payment|amount|diye|diya|liye|liya|bheja|bheje)/.test(window)) score += 2;
  if (raw.includes('.') || raw.includes(',')) score += 0.6;
  if (/(?:₹|rs|inr)/i.test(marker)) score += 0.8;
  // Number sitting inside a date / phone / id string
  const prev = text[index - 1] || '';
  const next = text[index + raw.length] || '';
  if (/[0-9\/:.-]/.test(prev) || /[0-9\/:.-]/.test(next)) score -= 4;
  return score;
}

function extractAmounts(text: string): AmountHit[] {
  const hits: AmountHit[] = [];
  const push = (raw: string, index: number, marker: string, strength: number) => {
    const value = toNumber(raw);
    if (!plausibleAmount(value, raw, text, index, marker)) return;
    const score = scoreAmount(text, index, raw, marker, strength);
    if (score <= 0) return;
    hits.push({ value, index, score, marker });
  };

  // ₹ / Rs / INR before number
  for (const m of text.matchAll(new RegExp(String.raw`(?:₹|\brs\.?|\binr|\b rupees?|\brupaye)\s*(${NUM})`, 'gi'))) {
    const marker = m[0].slice(0, m[0].indexOf(m[1])).trim();
    push(m[1], (m.index ?? 0) + m[0].indexOf(m[1]), marker, /₹/.test(marker) ? 3.2 : 2.6);
  }
  // number then ₹ / Rs / rupees
  for (const m of text.matchAll(new RegExp(String.raw`(${NUM})\s*(?:₹|\brs\.?\b|\binr\b|\brupees?\b|\brupaye\b)`, 'gi'))) {
    push(m[1], m.index ?? 0, 'suffix', 2.2);
  }
  // "amount of 500", "paid 500", "sent 500"
  for (const m of text.matchAll(/(?:amount|amt|paid|pay|sent|send|received|receive|transferred|transfer|debited|credited|payment of|diye|diya|bheja|bheje|pay kiya|pay kiye|de de|dena)\b[^\d\n]{0,18}(\d[\d,]*(?:\.\d{1,2})?)/gi)) {
    const idx = (m.index ?? 0) + m[0].lastIndexOf(m[1]);
    const gap = m[0].slice(0, m[0].lastIndexOf(m[1])).toLowerCase();
    if (/(?:a\/c|acct|account|ref|rrn|utr|upi|txn|xx+|id|no\.?)\s*[:#.]?\s*$/.test(gap)) continue;
    push(m[1], idx, 'keyword', 1.1);
  }
  // plain decimals like 250.00 / 1,250
  for (const m of text.matchAll(/(?:^|[\s:])(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+\.\d{2})(?=$|[\s\n])/gm)) {
    push(m[1], (m.index ?? 0) + m[0].indexOf(m[1]), 'plain', 0.7);
  }

  // OCR often turns ₹ into * or ~.
  for (const m of text.matchAll(/(?:^|[\s:*≈~])(\d[\d,]*(?:\.\d{1,2})?)(?=$|[\s.,!?])/gm)) {
    const idx = (m.index ?? 0) + m[0].indexOf(m[1]);
    const before = text.slice(Math.max(0, idx - 2), idx);
    if (!/[*≈~]|₹/.test(before)) continue;
    const value = toNumber(m[1]);
    if (value > 0 && value <= 5000000) {
      hits.push({ value, index: idx, score: 1.8, marker: 'ocr' });
    }
  }

  // Chat messages often have no ₹ at all: "Rahul ko 500 de diye".
  if (!hits.length) {
    for (const m of text.matchAll(/(?:^|[\s:])(\d{1,6})(?=$|[\s.,!?])/gm)) {
      const raw = m[1];
      const v = Number(raw);
      if (!(v > 0) || v > 200000) continue;
      if (v >= 1900 && v <= 2100) continue;
      const idx = (m.index ?? 0) + m[0].indexOf(raw);
      const before = text.slice(Math.max(0, idx - 26), idx).toLowerCase();
      const after = text.slice(idx + raw.length, idx + raw.length + 16).toLowerCase();
      if (/(?:ref|utr|rrn|a\/c|acct|account|xx|upi|txn|pin|otp)\s*[:#.]?\s*$/.test(before)) continue;
      let score = 0.5;
      if (/(?:ka|ki|ke|tha|the|hai|dena|de|do|diye|diya|liye|liya|bheja|bheje|pay|paid|sent|received|ko|se|of|for)\s*$/.test(before)) score += 1.3;
      if (/^\s*(?:rupaye|rupees|rs|ka|ki|de|dena|do|tha|hai)\b/.test(after)) score += 1.2;
      hits.push({ value: v, index: idx, score, marker: 'bare' });
    }
  }

  // de-duplicate by index+value, keep best
  const uniq = new Map<string, AmountHit>();
  for (const h of hits.sort((a, b) => b.score - a.score)) {
    const key = `${h.index}:${h.value}`;
    const prev = uniq.get(key);
    if (!prev || prev.score < h.score) uniq.set(key, h);
  }
  return [...uniq.values()].sort((a, b) => b.score - a.score || b.value - a.value);
}

/* ------------------------------------------------------------------ */
/* direction                                                           */
/* ------------------------------------------------------------------ */

type DirRule = [RegExp, Direction, number];

const DIR_RULES: DirRule[] = [
  // ---- paisa gaya (I paid them) ----
  [/\b(?:you|maine|main|me)\s+(?:have\s+)?(?:paid|sent|transferred)\b/i, 'out', 4],
  [/\b(?:maine|main)\b[^.\n]{0,60}\b(?:diye|diya|bheja|bheje|pay\s+kiya|pay\s+kiye|de\s+diya|de\s+diye)\b/i, 'out', 4],
  [/\bpaid\s+to\s+(?!you\b)/i, 'out', 4],
  [/\b(?:pay|payment)\s+to\s+(?!you\b)/i, 'out', 3.4],
  [/\bsent\s+to\s+(?!you\b)/i, 'out', 4],
  [/\bsent\b/i, 'out', 1.6],
  [/\btransfer(?:red)?\b/i, 'out', 1.2],
  [/\bsend\s+money\s+to\b/i, 'out', 4],
  [/\bmoney\s+sent\s+to\b/i, 'out', 4],
  [/\btransferred\s+to\b/i, 'out', 3.6],
  [/\bpayment\s+of\b/i, 'out', 3],
  [/\bdebited\b/i, 'out', 3.2],
  [/\bdebit\b/i, 'out', 2],
  [/\bwithdrawn\b/i, 'out', 2.6],
  [/\bpayment\s+(?:successful|completed?|done)\b/i, 'out', 2.2],
  [/\btransaction\s+successful\b/i, 'out', 1.2],
  [/\bsuccessful\b/i, 'out', 0.8],
  [/\bto\s+(?:vpa|upi|a\/c|account)\b/i, 'out', 2.4],
  [/\b(?:diye|diya|de\s+diye|de\s+diya|bheja|bheje|bhej\s+diye|pay\s+kiye|pay\s+kiya|de\s+diya)\b/i, 'out', 3.2],
  [/\b(?:ko|ke\s+liye)\s+.*\bpay\b/i, 'out', 1.4],
  [/\bpaid\b.*\b(?:for|to)\b/i, 'out', 1.6],
  [/\b(?:bill|rent|recharge|kharcha)\s+(?:paid|bhar\s+diya|diya)\b/i, 'out', 2.4],

  // ---- paisa aaya (they paid me) ----
  [/\breceived\s+from\b/i, 'in', 4],
  [/\b(?:money|payment|amount)\s+received\s+from\b/i, 'in', 4],
  [/\breceived\s+(?:₹|rs|inr)?\s*[\d,]+\s*(?:from|by)\b/i, 'in', 3.6],
  [/\bcredited\s+(?:to|by|from)\b/i, 'in', 3.4],
  [/\bcredited\b/i, 'in', 2.4],
  [/\b(?:you\s+)?received\b/i, 'in', 3],
  [/\bne\b[^.\n]{0,50}\b(?:diye|diya|bheja|bheje)\b/i, 'in', 4],
  [/\b(?:paid|sent|transferred)\s+you\b/i, 'in', 4],
  [/\bto\s+you\b/i, 'in', 3.5],
  [/\b(?:paid|sent|transferred)\s+(?:₹|rs\.?|inr)?[\s\d,.]*\bto\s+you\b/i, 'in', 5],
  [/\b(?:ne\s+)?(?:diye|diya|bheja|bheje)\b/i, 'in', 1.2],
  [/\b(?:liye|liya|mila|mile|aaya|aaye|wapas|wapis|vasool)\b/i, 'in', 2.4],
  [/\bto\s+you\s+by\b/i, 'in', 4.5],
  [/\bfrom\s*:/i, 'in', 1.4],
  [/\bfrom\b/i, 'in', 0.9],
  [/\brefund(?:ed)?\b/i, 'in', 2.2],

  // ---- I sent them, they sent me back ----
  [/\bpaid\s+by\b/i, 'in', 2.2],
  [/\breceived\b/i, 'in', 1.4],
];

function extractDirection(text: string): { direction: DirectionGuess; out: number; in: number; reason?: string } {
  let out = 0;
  let inbound = 0;
  for (const [re, dir, w] of DIR_RULES) {
    if (re.test(text)) {
      if (dir === 'out') out += w;
      else inbound += w;
    }
  }
  const total = out + inbound;
  if (!total || Math.abs(out - inbound) < 1) return { direction: 'unknown', out, in: inbound };
  return out > inbound
    ? { direction: 'out', out, in: inbound, reason: 'Aapne paise diye' }
    : { direction: 'in', out, in: inbound, reason: 'Unhone paise diye' };
}

/* ------------------------------------------------------------------ */
/* name extraction                                                     */
/* ------------------------------------------------------------------ */

export function normalizeName(s: string): string {
  return clean(s)
    .toLowerCase()
    .replace(/[^a-z\u0900-\u097f\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripName(raw: string): string | null {
  let s = clean(raw);
  s = s.split(/\n|\||•/)[0];
  s = s.replace(/^[\s:.\-–—>»]+/, '');
  s = s.replace(/\s*[-–—]\s*$/, '');
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.replace(HONORIFICS, '');
  const tokens = s.split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  for (const tokenRaw of tokens) {
    const token = tokenRaw.replace(/^[^\p{L}]+|[^\p{L}.']+$/gu, '');
    if (!token) continue;
    if (kept.length >= 4) break;
    if (/\d/.test(token)) break;
    const lower = token.toLowerCase();
    if (NAME_STOP.has(lower) || NAME_STOP_HI.has(lower)) break;
    if (token.length > 18) break;
    kept.push(token);
  }
  if (!kept.length) return null;
  let name = kept.join(' ').replace(/[.'-]+$/g, '').trim();
  if (name.length < 2 || name.length > 42) return null;
  if (!/\p{L}{2}/u.test(name)) return null;
  if (/^[A-Z\s.']+$/.test(name) && name.replace(/\s/g, '').length > 2) name = titleCase(name);
  if (BAD_FULL_NAMES.has(normalizeName(name))) return null;
  if (/^(?:xx+|x+)$/i.test(name)) return null;
  return name;
}

interface CandidateInternal extends PersonHint {
  index: number;
  weight: number;
}

function extractNameCandidates(text: string): CandidateInternal[] {
  const found: CandidateInternal[] = [];
  const add = (raw: string, method: string, weight: number, index: number, upi?: string) => {
    let name = stripName(raw);
    if (!name) return;
    if (method === 'upi' && name === name.toLowerCase()) name = titleCase(name);
    found.push({ name, method, score: 0, weight, index, upi });
  };

  // "Paid to Rahul Sharma", "Received from Priya", "From: Rahul", "to VPA rahul@okaxis (Rahul Sharma)"
  const labelRe = /\b(paid\s+to|pay\s+to|payment\s+to|sent\s+to|send\s+money\s+to|transferred\s+to|money\s+sent\s+to|received\s+from|payment\s+received\s+from|credited\s+from|paid\s+by|refund(?:ed)?\s+by|paid\s+you|sent\s+you|paid|from|to)\b/gi;
  const strongLabels = /paid\s+to|sent\s+to|transferred\s+to|received\s+from|credited\s+from|paid\s+by|paid\s+you|sent\s+you|money\s+sent\s+to|payment\s+to|pay\s+to/;
  for (const m of text.matchAll(labelRe)) {
    const label = m[1].toLowerCase().replace(/\s+/g, ' ');
    const tail = text.slice((m.index ?? 0) + m[0].length).replace(/^[\s:\-–>»]+/, '');
    const rest = tail.split(/\n/)[0].slice(0, 70);
    if (!rest) continue;
    add(rest, label, strongLabels.test(label) ? 0.86 : 0.68, m.index ?? 0);
  }

  // Hinglish grammar: "Maine Rahul ko ... diye", "Rahul Sharma ne ... diya", "Rahul ko 500 de de"
  for (const m of text.matchAll(/\b(?:maine|main)\s+([\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*){0,3})\s+ko\b/giu)) {
    add(m[1], 'hindi-main-ko', 0.9, m.index ?? 0);
  }
  for (const m of text.matchAll(/([\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*){0,3})\s+ne\s+[^.\n]{0,50}\b(?:diye|diya|bheja|bheje)\b/giu)) {
    add(m[1], 'hindi-ne', 0.88, m.index ?? 0);
  }
  for (const m of text.matchAll(/([\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*){0,3})\s+ko\s+[^.\n]{0,20}\b(?:diye|diya|bheje|bheja|dena|de)\b/giu)) {
    add(m[1], 'hindi-ko', 0.8, m.index ?? 0);
  }

  // Name immediately before "paid you" / "sent you" / "ne diye"
  for (const m of text.matchAll(/([\p{L}][\p{L}.'-]*(?:\s+[\p{L}][\p{L}.'-]*){0,3})\s+(?:paid\s+you|sent\s+you|has\s+sent\s+you|ne\s+(?:diye|diya|bheje|bheja))/giu)) {
    add(m[1], 'paid-you', 0.9, m.index ?? 0);
  }

  // UPI VPAs
  for (const m of text.matchAll(/\b([a-z0-9][a-z0-9._-]{1,30})@([a-z][a-z0-9]{1,20})\b/gi)) {
    const local = m[1];
    const pretty = local.replace(/[._-]+/g, ' ').replace(/\d+/g, ' ').trim();
    add(pretty, 'upi', 0.42, m.index ?? 0, `${m[1]}@${m[2]}`);
  }

  // Parenthesised names: "VPA rahul@okaxis (Rahul Sharma)"
  for (const m of text.matchAll(/\(([\p{L}][\p{L}.'\s-]{2,40})\)/gu)) {
    add(m[1], 'bracket', 0.86, m.index ?? 0);
  }

  // Chat style "Rahul: 500 bhej de"
  for (const m of text.matchAll(/^\s*([\p{L}][\p{L}.'\s-]{1,30})\s*:\s+/gmu)) {
    add(m[1], 'chat', 0.72, m.index ?? 0);
  }

  // Screenshot style: amount on one line, name on the next ("₹500 / Priya Verma")
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) {
    let cursor = 0;
    for (const line of text.split(/\n/)) {
      const offset = cursor;
      cursor += line.length + 1;
      const trimmed = line.trim();
      if (!trimmed || trimmed.length > 34) continue;
      const words = trimmed.split(/\s+/);
      if (words.length < 1 || words.length > 3) continue;
      if (!/^[\p{L}][\p{L}.'\s-]*$/u.test(trimmed)) continue;
      if (/[.!?]$/.test(trimmed)) continue;
      add(trimmed, 'name-line', 0.52, offset);
    }
  }

  // Bank SMS: "... to VPA xyz@okaxis RAHUL SHARMA" (uppercase run)
  for (const m of text.matchAll(/\b([A-Z][A-Z.'-]+(?:\s+[A-Z][A-Z.'-]+){1,3})\b/g)) {
    add(m[1], 'caps', 0.4, m.index ?? 0);
  }

  return found;
}

/* ------------------------------------------------------------------ */
/* person matching                                                     */
/* ------------------------------------------------------------------ */

function upiLocal(upi?: string): string {
  if (!upi) return '';
  return normalizeName(upi.split('@')[0] || '');
}

export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.replace(/\s/g, '') === nb.replace(/\s/g, '')) return 0.97;
  const ta = na.split(' ');
  const tb = nb.split(' ');
  const setA = new Set(ta);
  const setB = new Set(tb);
  const shared = ta.filter((t) => setB.has(t) && t.length > 1).length;
  if (shared) {
    const jaccard = shared / new Set([...ta, ...tb]).size;
    if (shared === Math.min(ta.length, tb.length)) return Math.max(0.86, 0.72 + jaccard * 0.25);
    return 0.55 + jaccard * 0.35;
  }
  if (na.includes(nb) || nb.includes(na)) return 0.78;
  return 0;
}

export function matchPerson(
  hint: { name?: string; upi?: string },
  persons: Person[],
): { person: Person; score: number } | null {
  let best: { person: Person; score: number } | null = null;
  for (const p of persons) {
    let score = 0;
    if (hint.name) {
      score = Math.max(score, nameSimilarity(hint.name, p.name));
      for (const alias of p.aliases || []) score = Math.max(score, nameSimilarity(hint.name, alias));
    }
    if (hint.upi && p.upi) {
      score = Math.max(score, hint.upi.toLowerCase() === p.upi.toLowerCase() ? 1 : 0);
    }
    if (hint.upi) {
      const local = upiLocal(hint.upi);
      if (local) {
        score = Math.max(score, nameSimilarity(local, p.name) * 0.92);
        for (const alias of p.aliases || []) score = Math.max(score, nameSimilarity(local, alias) * 0.9);
      }
    }
    if (score > (best?.score ?? 0)) best = { person: p, score };
  }
  if (!best || best.score < 0.62) return null;
  return best;
}

function resolveCandidates(
  raw: CandidateInternal[],
  selfName: string | undefined,
  persons: Person[],
): PersonHint[] {
  const self = selfName ? normalizeName(selfName) : '';
  const merged = new Map<string, PersonHint>();

  for (const c of raw) {
    const key = normalizeName(c.name);
    if (!key) continue;
    if (self && (key === self || key === normalizeName(self.split(' ')[0] || ''))) continue;
    if (BAD_NAME_WORDS.has(key)) continue;

    const match = matchPerson({ name: c.name, upi: c.upi }, persons);
    let score = c.weight;
    if (c.name.split(' ').length > 1) score += 0.06;
    if (match) score += 0.22;

    const existing = merged.get(match ? `id:${match.person.id}` : key);
    if (!existing || existing.score < score) {
      merged.set(match ? `id:${match.person.id}` : key, {
        name: match && match.score > 0.8 ? match.person.name : c.name,
        upi: c.upi,
        score: Math.min(0.99, score),
        method: c.method,
        personId: match && match.score >= 0.62 ? match.person.id : undefined,
      });
    }
  }

  return [...merged.values()].sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ */
/* date / category / note                                              */
/* ------------------------------------------------------------------ */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function extractDate(text: string, now = new Date()): { date: string; explicit: boolean } {
  const withTime = (d: Date, timeSource = text) => {
    const t = timeSource.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
    if (t) {
      let h = Number(t[1]);
      const min = Number(t[2]);
      const pm = /pm/i.test(t[3] || '');
      const am = /am/i.test(t[3] || '');
      if (pm && h < 12) h += 12;
      if (am && h === 12) h = 0;
      if (h < 24 && min < 60) d.setHours(h, min, 0, 0);
    } else {
      d.setHours(12, 0, 0, 0);
    }
    return d;
  };
  const valid = (d: Date) => {
    if (Number.isNaN(d.getTime())) return false;
    const min = new Date(2000, 0, 1).getTime();
    const max = now.getTime() + 86400000;
    return d.getTime() >= min && d.getTime() <= max;
  };

  // 2026-11-22
  let m = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (valid(d)) return { date: withTime(d).toISOString(), explicit: true };
  }

  // 22/11/26, 22-11-2026, 22.11.26  (Indian day-first)
  m = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (m) {
    let day = Number(m[1]);
    let month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    if (day > 12 && month <= 12) {
      // fine
    } else if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day);
      if (valid(d)) return { date: withTime(d).toISOString(), explicit: true };
    }
  }

  // 22 Nov 2026 / Nov 22, 2026 / 22 November
  m = text.match(/\b(\d{1,2})\s*[-\s]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s*(\d{2,4})?\b/i);
  if (m) {
    const day = Number(m[1]);
    const month = MONTHS.indexOf(m[2].toLowerCase().slice(0, 3));
    let year = m[3] ? Number(m[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    if (month >= 0 && day >= 1 && day <= 31) {
      const d = new Date(year, month, day);
      if (valid(d)) return { date: withTime(d).toISOString(), explicit: true };
    }
  }
  m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*(\d{1,2})(?:st|nd|rd|th)?\b/i);
  if (m) {
    const month = MONTHS.indexOf(m[1].toLowerCase().slice(0, 3));
    const day = Number(m[2]);
    const d = new Date(now.getFullYear(), month, day);
    if (month >= 0 && valid(d)) return { date: withTime(d).toISOString(), explicit: true };
  }

  if (/\b(yesterday|kal)\b/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return { date: withTime(d).toISOString(), explicit: true };
  }
  if (/\b(today|aaj|abhi|just now)\b/i.test(text)) {
    const d = new Date(now);
    return { date: withTime(d, text).toISOString(), explicit: true };
  }

  return { date: now.toISOString(), explicit: false };
}

const CATEGORY_RULES: [Category, RegExp][] = [
  ['food', /\b(chai|coffee|dinner|lunch|breakfast|nashta|khana|restaurant|swiggy|zomato|biryani|pizza|burger|samosa|momo|thali|cafe|food|party|drinks|beer)\b/i],
  ['travel', /\b(uber|ola|rapido|auto|cab|taxi|metro|train|ticket|flight|bus|petrol|diesel|fuel|toll|parking|travel|trip)\b/i],
  ['bills', /\b(bill|electricity|water|gas|internet|wifi|broadband|recharge|mobile|dth|postpaid|prepaid|insurance)\b/i],
  ['rent', /\b(rent|kiraya|deposit|maintenance|society)\b/i],
  ['shopping', /\b(shopping|amazon|flipkart|myntra|meesho|clothes|kapde|shoes|gift|kirana|grocer|grocery|store|mall)\b/i],
  ['fun', /\b(movie|cinema|concert|game|match|tickets?|netflix|spotify|prime|outing|picnic)\b/i],
  ['health', /\b(medicine|medical|doctor|hospital|clinic|pharmacy|dawai|chemist|gym)\b/i],
];

export function inferCategory(text: string): { category: Category; note?: string } {
  for (const [cat, re] of CATEGORY_RULES) {
    const m = text.match(re);
    if (m) {
      const word = m[0].toLowerCase();
      const pretty: Record<string, string> = {
        chai: 'Chai',
        coffee: 'Coffee',
        dinner: 'Dinner',
        lunch: 'Lunch',
        petrol: 'Petrol',
        auto: 'Auto',
        cab: 'Cab',
        rent: 'Kiraya',
        electricity: 'Bijli bill',
        recharge: 'Recharge',
        medicine: 'Dawai',
        movie: 'Movie',
        kirana: 'Kirana',
        swiggy: 'Swiggy',
        zomato: 'Zomato',
      };
      return { category: cat, note: pretty[word] };
    }
  }
  return { category: 'other' };
}

function detectApp(text: string): string | undefined {
  if (/\bgoogle\s*pay\b|\bg\s*pay\b|\bgpay\b/i.test(text)) return 'GPay';
  if (/\bphone\s*pe\b|\bphonepe\b/i.test(text)) return 'PhonePe';
  if (/\bpaytm\b/i.test(text)) return 'Paytm';
  if (/\bbhim\b/i.test(text)) return 'BHIM';
  if (/\bamazon\s*pay\b/i.test(text)) return 'Amazon Pay';
  if (/\bwhatsapp\b/i.test(text)) return 'WhatsApp';
  if (/\b(?:a\/c|acct|account|utr|rrn|neft|imps|avl\s*bal|available\s+balance)\b/i.test(text)) return 'Bank SMS';
  return undefined;
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

export function parseTransaction(rawInput: string, opts: ParseOptions = {}): ParsedDraft {
  const rawText = clean(rawInput || '').trim();
  const now = opts.now || new Date();
  const persons = opts.persons || [];
  const source = opts.source || 'chat';
  const text = rawText.replace(/[ \t]+/g, ' ');
  const signals: string[] = [];

  if (!text) {
    return {
      amount: null,
      direction: 'unknown',
      person: null,
      candidates: [],
      date: now.toISOString(),
      note: '',
      category: 'other',
      confidence: 0,
      signals: [],
      rawText: '',
      source,
    };
  }

  const app = detectApp(text);
  if (app) signals.push(`${app} se aaya`);

  const amounts = extractAmounts(text);
  const amount = amounts.length ? amounts[0].value : null;
  if (amount != null) signals.push(`₹${formatInr(amount)} mila`);

  const dir = extractDirection(text);
  const candidates = resolveCandidates(extractNameCandidates(text), opts.selfName, persons);

  let direction = dir.direction;
  let dirReason = dir.reason;
  if (direction === 'unknown' && candidates.length) {
    const methods = candidates.map((c) => c.method).join(' ');
    if (/\b(?:paid\s+to|pay\s+to|payment\s+to|sent\s+to|transferred\s+to|to)\b/.test(methods)) {
      direction = 'out';
      dirReason = 'Naam ke hisaab se: aapne diye';
    } else if (/\b(?:received\s+from|credited\s+from|paid\s+by|from)\b/.test(methods)) {
      direction = 'in';
      dirReason = 'Naam ke hisaab se: unhone diye';
    }
  }
  if (dirReason) signals.push(dirReason);

  const person = candidates[0] || null;
  if (person) {
    signals.push(person.personId ? `${person.name} pehchana` : `${person.name} — naya naam`);
  }

  const { date, explicit } = extractDate(text, now);
  if (explicit) signals.push('Date mil gayi');

  const cat = inferCategory(text);
  let note = cat.note || '';

  // A "thanks for the chai" style note, but keep it short.
  if (!note) {
    const merchant = text.match(/(?:paid\s+to|payment\s+to|sent\s+to)\s+([\p{L}][\p{L}&.'\s-]{2,30})/iu);
    if (merchant) {
      const m = stripName(merchant[1]);
      if (m && person && normalizeName(m) !== normalizeName(person.name)) note = m;
    }
  }

  let confidence = 0.18;
  if (amount != null) confidence += 0.34;
  if (person) confidence += 0.22;
  if (direction !== 'unknown') confidence += 0.16;
  if (explicit) confidence += 0.05;
  if (app) confidence += 0.05;
  if (person) confidence += Math.min(0.08, person.score * 0.1);
  if (!amount && !person) confidence = Math.min(confidence, 0.12);
  confidence = Math.min(0.97, confidence);

  return {
    amount,
    direction,
    person,
    candidates,
    date,
    note,
    category: cat.category,
    confidence: Math.round(confidence * 100) / 100,
    signals,
    rawText,
    source,
    app,
  };
}

function formatInr(n: number): string {
  const exact = Math.round(n * 100) / 100;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: Number.isInteger(exact) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(exact);
}

/** Quick helper used by the "paste amount" inputs. */
export function parseAmountInput(s: string): number | null {
  const cleaned = s.replace(/[₹,\s]/g, '').replace(/rs\.?/gi, '').replace(/inr/gi, '');
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}
