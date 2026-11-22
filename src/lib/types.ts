export type Direction = 'out' | 'in';

/**
 * out = you paid (they owe you)  -> balance +
 * in  = they paid (you owe them) -> balance -
 */
export type Source = 'manual' | 'screenshot' | 'chat' | 'sms' | 'shared';

export type Category =
  | 'food'
  | 'travel'
  | 'bills'
  | 'rent'
  | 'shopping'
  | 'fun'
  | 'health'
  | 'other';

export interface Person {
  id: string;
  name: string;
  aliases: string[];
  upi?: string;
  phone?: string;
  color: string;
  createdAt: string;
}

export interface Txn {
  id: string;
  personId: string;
  direction: Direction;
  amount: number;
  note: string;
  category: Category;
  /** ISO string */
  date: string;
  source: Source;
  rawText?: string;
  confidence?: number;
  settlement?: boolean;
  createdAt: string;
}

export interface Profile {
  name: string;
  upi?: string;
  createdAt: string;
}

export interface Settings {
  onboarded: boolean;
  sound?: boolean;
}

export interface AppState {
  version: 1;
  profile: Profile;
  persons: Person[];
  txns: Txn[];
  settings: Settings;
}

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'food', label: 'Food & drinks' },
  { id: 'travel', label: 'Travel' },
  { id: 'bills', label: 'Bills' },
  { id: 'rent', label: 'Rent' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'fun', label: 'Entertainment' },
  { id: 'health', label: 'Health' },
  { id: 'other', label: 'Other' },
];

export const SOURCE_LABEL: Record<Source, string> = {
  manual: 'Manual',
  screenshot: 'Screenshot',
  chat: 'Message',
  sms: 'SMS',
  shared: 'Shared',
};
