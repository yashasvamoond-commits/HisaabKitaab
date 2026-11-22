export type Direction = 'out' | 'in';

/**
 * out = maine paise diye (banda mujhe dega)  → balance +
 * in  = unhone paise diye (main unhe dunga)  → balance -
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

export const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'food', label: 'Khana-peena', emoji: '🍛' },
  { id: 'travel', label: 'Safar', emoji: '🛺' },
  { id: 'bills', label: 'Bills', emoji: '💡' },
  { id: 'rent', label: 'Kiraya', emoji: '🏠' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'fun', label: 'Masti', emoji: '🎬' },
  { id: 'health', label: 'Sehat', emoji: '💊' },
  { id: 'other', label: 'Baaki', emoji: '📌' },
];

export const SOURCE_LABEL: Record<Source, string> = {
  manual: 'Manual',
  screenshot: 'Screenshot',
  chat: 'Chat',
  sms: 'SMS',
  shared: 'Shared',
};
