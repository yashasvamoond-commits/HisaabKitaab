import type { Person, Txn } from './types';

export interface PersonBalance {
  person: Person;
  balance: number;
  lastDate: string | null;
  count: number;
}

/** + means the person owes you, − means you owe them. */
export function balanceOf(personId: string, txns: Txn[]): number {
  return txns.reduce((acc, t) => {
    if (t.personId !== personId) return acc;
    return acc + (t.direction === 'out' ? t.amount : -t.amount);
  }, 0);
}

export function personBalances(persons: Person[], txns: Txn[]): PersonBalance[] {
  const map = new Map<string, PersonBalance>();
  for (const p of persons) map.set(p.id, { person: p, balance: 0, lastDate: null, count: 0 });
  for (const t of txns) {
    const row = map.get(t.personId);
    if (!row) continue;
    row.balance += t.direction === 'out' ? t.amount : -t.amount;
    row.count += 1;
    if (!row.lastDate || +new Date(t.date) > +new Date(row.lastDate)) row.lastDate = t.date;
  }
  return [...map.values()];
}

export function totals(txns: Txn[]): { receive: number; pay: number; net: number; people: number } {
  let receive = 0;
  let pay = 0;
  const ids = new Set<string>();
  for (const t of txns) {
    ids.add(t.personId);
    if (t.direction === 'out') receive += t.amount;
    else pay += t.amount;
  }
  return { receive, pay, net: receive - pay, people: ids.size };
}

export function monthTotals(txns: Txn[], date = new Date()): { given: number; taken: number } {
  let given = 0;
  let taken = 0;
  for (const t of txns) {
    const d = new Date(t.date);
    if (d.getMonth() !== date.getMonth() || d.getFullYear() !== date.getFullYear()) continue;
    if (t.direction === 'out') given += t.amount;
    else taken += t.amount;
  }
  return { given, taken };
}

export function groupByDay(txns: Txn[]): { key: string; date: string; items: Txn[] }[] {
  const map = new Map<string, Txn[]>();
  for (const t of [...txns].sort((a, b) => +new Date(b.date) - +new Date(a.date))) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const arr = map.get(key) || [];
    arr.push(t);
    map.set(key, arr);
  }
  return [...map.entries()].map(([key, items]) => ({
    key,
    date: items[0].date,
    items,
  }));
}

export function personTxns(personId: string, txns: Txn[]): Txn[] {
  return txns
    .filter((t) => t.personId === personId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function lastActivityLabel(date: string | null): string {
  if (!date) return 'Abhi koi hisaab nahi';
  const days = Math.floor((Date.now() - +new Date(date)) / 86400000);
  if (days <= 0) return 'Aaj ka hisaab';
  if (days === 1) return 'Kal ka hisaab';
  if (days < 30) return `${days} din pehle`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
