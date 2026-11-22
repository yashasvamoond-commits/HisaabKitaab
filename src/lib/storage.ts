import type { AppState, Person, Txn } from './types';

const KEY = 'hisaabkitaab.v1';

export function newId(prefix = ''): string {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return prefix + raw;
}

export function emptyState(): AppState {
  return {
    version: 1,
    profile: { name: '', createdAt: new Date().toISOString() },
    persons: [],
    txns: [],
    settings: { onboarded: false, sound: true },
  };
}

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return emptyState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || typeof parsed !== 'object') return emptyState();
    return {
      version: 1,
      profile: parsed.profile || { name: '', createdAt: new Date().toISOString() },
      persons: Array.isArray(parsed.persons) ? parsed.persons.filter(Boolean) : [],
      txns: Array.isArray(parsed.txns) ? parsed.txns.filter(Boolean) : [],
      settings: {
        onboarded: parsed.settings?.onboarded === true,
        sound: parsed.settings?.sound !== false,
      },
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // Storage full / private mode — keep running in memory.
    console.warn('HisaabKitaab: could not save', err);
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* sample data                                                         */
/* ------------------------------------------------------------------ */

function daysAgo(n: number, h = 19, m = 30): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export function sampleState(profileName: string): AppState {
  const mk = (name: string, color: string, aliases: string[], upi?: string): Person => ({
    id: newId('p_'),
    name,
    aliases,
    color,
    upi,
    createdAt: new Date().toISOString(),
  });

  const rahul = mk('Rahul Sharma', 'clay', ['Rahul'], 'rahul.sharma@okaxis');
  const priya = mk('Priya Verma', 'leaf', ['Priya'], 'priya.verma@ybl');
  const amit = mk('Amit Kumar', 'ink', ['Amit']);
  const maa = mk('Mummy', 'rose', ['Maa', 'Mom']);

  const t = (
    person: Person,
    direction: 'out' | 'in',
    amount: number,
    note: string,
    category: Txn['category'],
    date: string,
    source: Txn['source'] = 'manual',
    settlement = false,
  ): Txn => ({
    id: newId('t_'),
    personId: person.id,
    direction,
    amount,
    note,
    category,
    date,
    source,
    settlement,
    createdAt: date,
  });

  const txns: Txn[] = [
    t(rahul, 'out', 250, 'Chai aur samosa', 'food', daysAgo(1, 17, 10), 'screenshot'),
    t(rahul, 'out', 480, 'Auto se office', 'travel', daysAgo(4, 9, 20)),
    t(rahul, 'in', 300, 'Uber ka hissa', 'travel', daysAgo(7, 21, 5), 'chat', true),
    t(priya, 'out', 1200, 'Dinner at Social', 'food', daysAgo(2, 21, 45), 'manual'),
    t(priya, 'in', 600, 'Movie tickets', 'fun', daysAgo(9, 18, 15)),
    t(amit, 'out', 1500, 'Kiraya ka hissa', 'rent', daysAgo(12, 11, 0)),
    t(maa, 'in', 5000, 'Ghar ke liye', 'other', daysAgo(20, 12, 30)),
    t(rahul, 'out', 180, 'Swiggy lunch', 'food', daysAgo(0, 13, 40), 'chat'),
    t(priya, 'out', 340, 'Metro recharge', 'travel', daysAgo(15, 8, 50)),
  ];

  return {
    version: 1,
    profile: { name: profileName || 'Aap', createdAt: new Date().toISOString() },
    persons: [rahul, priya, amit, maa],
    txns: txns.sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    settings: { onboarded: true, sound: true },
  };
}
