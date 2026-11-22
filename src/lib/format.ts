const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const inr2 = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(n: number, forceDecimals = false): string {
  const abs = Math.abs(n);
  const exact = Math.round(abs * 100) / 100;
  const usePaise = forceDecimals || !Number.isInteger(exact);
  return (usePaise ? inr2 : inr).format(abs);
}

export function rupees(n: number, forceDecimals = false): string {
  return `₹${formatAmount(n, forceDecimals)}`;
}

/** ₹1,250 / ₹0 / -₹250 */
export function signedRupees(n: number): string {
  if (!n) return '₹0';
  return `${n > 0 ? '+' : '−'}₹${formatAmount(n)}`;
}

export function dateKey(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function dayLabel(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const today = startOfDay(new Date());
  const that = startOfDay(date);
  const diff = Math.round((today.getTime() - that.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}${
    date.getFullYear() !== new Date().getFullYear() ? ` ${String(date.getFullYear()).slice(2)}` : ''
  }`;
}

export function shortDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function timeLabel(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: '#FFE2C2', fg: '#8A4300' },
  { bg: '#D9F1E1', fg: '#155C42' },
  { bg: '#F9DDD5', fg: '#983016' },
  { bg: '#E1E4FB', fg: '#38478F' },
  { bg: '#FBE0EC', fg: '#8C2A56' },
  { bg: '#DAEEF7', fg: '#1F5876' },
  { bg: '#EFE7D3', fg: '#6A5527' },
  { bg: '#E9E1F8', fg: '#513A8A' },
];

export function avatarColor(name: string): { bg: string; fg: string } {
  // FNV-1a gives a much better spread than a simple char loop.
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return AVATAR_COLORS[(h >>> 0) % AVATAR_COLORS.length];
}

/** 1250 -> "1,250" while the user is not typing. */
export function formatAmountInput(value: string): string {
  const clean = value.replace(/,/g, '');
  if (!clean) return '';
  const [intPart, decPart] = clean.split('.');
  const digits = intPart.replace(/[^\d]/g, '');
  if (!digits) return clean;
  const grouped = new Intl.NumberFormat('en-IN').format(Number(digits));
  return decPart !== undefined ? `${grouped}.${decPart.padEnd(2, '0').slice(0, 2)}` : grouped;
}

export function totalBy(personTxns: { direction: 'in' | 'out'; amount: number }[]): number {
  return personTxns.reduce((acc, t) => acc + (t.direction === 'out' ? t.amount : -t.amount), 0);
}
