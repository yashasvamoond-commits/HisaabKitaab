import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, Person, Profile, Txn } from './types';
import { emptyState, loadState, newId, sampleState, saveState } from './storage';
import { matchPerson } from './parse';

interface NewPersonInput {
  name: string;
  upi?: string;
  phone?: string;
  aliases?: string[];
}

interface AppContextValue {
  state: AppState;
  persons: Person[];
  txns: Txn[];
  addPerson: (input: NewPersonInput) => Person;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  addTxn: (input: Omit<Txn, 'id' | 'createdAt'> & { personName?: string }) => Txn;
  updateTxn: (id: string, patch: Partial<Txn>) => void;
  deleteTxn: (id: string) => void;
  settleUp: (personId: string) => Txn | null;
  setProfile: (patch: Partial<Profile>) => void;
  finishOnboarding: (name: string) => void;
  resetAll: () => void;
  loadSample: () => void;
  importState: (state: AppState) => void;
  toast: (message: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    saveState(state);
  }, [state]);

  const toast = useCallback((message: string) => {
    const id = newId('toast_');
    setToasts((t) => [...t.slice(-2), { id, message }]);
    timers.current[id] = window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
      delete timers.current[id];
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const addPerson = useCallback((input: NewPersonInput): Person => {
    const person: Person = {
      id: newId('p_'),
      name: input.name.trim() || 'New person',
      aliases: input.aliases || [],
      upi: input.upi?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      color: 'clay',
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, persons: [...s.persons, person] }));
    return person;
  }, []);

  const updatePerson = useCallback((id: string, patch: Partial<Person>) => {
    setState((s) => ({
      ...s,
      persons: s.persons.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const deletePerson = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      persons: s.persons.filter((p) => p.id !== id),
      txns: s.txns.filter((t) => t.personId !== id),
    }));
  }, []);

  const addTxn = useCallback(
    (input: Omit<Txn, 'id' | 'createdAt'> & { personName?: string }): Txn => {
      let person = state.persons.find((p) => p.id === input.personId) || null;
      if (!person && input.personName) {
        const found = matchPerson({ name: input.personName }, state.persons);
        if (found && found.score >= 0.82) person = found.person;
      }
      const created: Person | null = person
        ? null
        : {
            id: newId('p_'),
            name: (input.personName || 'New person').trim(),
            aliases: [],
            color: 'clay',
            createdAt: new Date().toISOString(),
          };
      const finalPerson = person ?? (created as Person);

      const txn: Txn = {
        id: newId('t_'),
        personId: finalPerson.id,
        direction: input.direction,
        amount: Math.round(input.amount * 100) / 100,
        note: input.note,
        category: input.category,
        date: input.date,
        source: input.source,
        rawText: input.rawText,
        confidence: input.confidence,
        settlement: input.settlement,
        createdAt: new Date().toISOString(),
      };

      setState((s) => ({
        ...s,
        persons: created ? [...s.persons, created] : s.persons,
        txns: [txn, ...s.txns],
      }));
      return txn;
    },
    [state.persons],
  );

  const updateTxn = useCallback((id: string, patch: Partial<Txn>) => {
    setState((s) => ({
      ...s,
      txns: s.txns.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTxn = useCallback((id: string) => {
    setState((s) => ({ ...s, txns: s.txns.filter((t) => t.id !== id) }));
  }, []);

  const settleUp = useCallback(
    (personId: string): Txn | null => {
      const balance = state.txns
        .filter((t) => t.personId === personId)
        .reduce((acc, t) => acc + (t.direction === 'out' ? t.amount : -t.amount), 0);
      if (Math.abs(balance) < 0.01) return null;
      const txn: Txn = {
        id: newId('t_'),
        personId,
        direction: balance > 0 ? 'in' : 'out',
        amount: Math.abs(balance),
        note: 'Settled up',
        category: 'other',
        date: new Date().toISOString(),
        source: 'manual',
        settlement: true,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, txns: [txn, ...s.txns] }));
      return txn;
    },
    [state.txns],
  );

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
  }, []);

  const finishOnboarding = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      profile: { ...s.profile, name: name.trim() || 'You' },
      settings: { ...s.settings, onboarded: true },
    }));
  }, []);

  const resetAll = useCallback(() => {
    setState(() => emptyState());
  }, []);

  const loadSample = useCallback(() => {
    setState((s) => sampleState(s.profile.name));
  }, []);

  const importState = useCallback((next: AppState) => {
    const safe: AppState = {
      version: 1,
      profile: next.profile && typeof next.profile.name === 'string' ? next.profile : { name: 'You', createdAt: new Date().toISOString() },
      persons: Array.isArray(next.persons) ? next.persons : [],
      txns: Array.isArray(next.txns) ? next.txns : [],
      settings: {
        onboarded: next.settings?.onboarded !== false,
        sound: next.settings?.sound !== false,
      },
    };
    setState(safe);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      persons: state.persons,
      txns: state.txns,
      addPerson,
      updatePerson,
      deletePerson,
      addTxn,
      updateTxn,
      deleteTxn,
      settleUp,
      setProfile,
      finishOnboarding,
      resetAll,
      loadSample,
      importState,
      toast,
    }),
    [state, addPerson, updatePerson, deletePerson, addTxn, updateTxn, deleteTxn, settleUp, setProfile, finishOnboarding, resetAll, loadSample, importState, toast],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.message}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
