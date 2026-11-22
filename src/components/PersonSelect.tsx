import { useMemo, useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { balanceOf } from '../lib/calc';
import { rupees } from '../lib/format';
import { ChevronRightIcon, PlusIcon, SearchIcon, SparkleIcon } from './Icons';
import { Avatar } from './ui';

export interface PersonValue {
  personId?: string;
  name?: string;
}

export function PersonSelect({
  value,
  onChange,
  suggestions = [],
  autoOpen = false,
  onOpenChange,
}: {
  value: PersonValue;
  onChange: (v: PersonValue) => void;
  suggestions?: { personId?: string; name: string; score?: number }[];
  autoOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { persons, txns } = useApp();
  const [open, setOpen] = useState(autoOpen);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value.personId ? persons.find((p) => p.id === value.personId) : null;
  const displayName = selected?.name || value.name || '';
  const isNew = !selected && !!value.name;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = persons.filter((p) => !q || p.name.toLowerCase().includes(q) || p.aliases.some((a) => a.toLowerCase().includes(q)));
    return list.slice(0, 8);
  }, [persons, query]);

  const suggestionPeople = useMemo(() => {
    const seen = new Set<string>();
    return suggestions
      .map((s) => (s.personId ? persons.find((p) => p.id === s.personId) : undefined))
      .filter((p): p is NonNullable<typeof p> => !!p && !seen.has(p.id) && (seen.add(p.id), true))
      .slice(0, 3);
  }, [suggestions, persons]);

  const exact = persons.find((p) => p.name.toLowerCase() === query.trim().toLowerCase());

  const setPanel = (next: boolean | ((prev: boolean) => boolean)) => {
    setOpen((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      onOpenChange?.(value);
      return value;
    });
  };

  return (
    <div className="person-select">
      <button
        type="button"
        className={`field person-field ${open ? 'is-open' : ''}`}
        onClick={() => {
          setPanel((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 60);
        }}
        aria-expanded={open}
      >
        {displayName ? (
          <Avatar name={displayName} size={34} />
        ) : (
          <span className="person-field-empty">
            <SearchIcon size={17} />
          </span>
        )}
        <span className="person-field-text">
          <span className="person-field-label">Kiska hisaab?</span>
          <span className={`person-field-name ${!displayName ? 'is-empty' : ''}`}>
            {displayName || 'Naam se dhoondo ya naya banao'}
          </span>
        </span>
        {isNew && <span className="tag tag--saffron">naya</span>}
        <ChevronRightIcon size={18} className={`chev ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className="person-panel">
          <div className="search-field">
            <SearchIcon size={18} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Naam likho…"
              autoComplete="off"
              enterKeyHint="done"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const name = query.trim();
                  if (name) {
                    const hit = persons.find((p) => p.name.toLowerCase() === name.toLowerCase());
                    onChange(hit ? { personId: hit.id } : { name });
                    setQuery('');
                    setPanel(false);
                  }
                }
              }}
            />
            {query && (
              <button type="button" className="text-btn" onClick={() => setQuery('')}>
                saaf
              </button>
            )}
          </div>

          {!query && suggestionPeople.length > 0 && (
            <div className="panel-label">
              <SparkleIcon size={14} /> Screenshot se mila
            </div>
          )}

          {!query &&
            suggestionPeople.map((p) => (
              <button
                key={p.id}
                type="button"
                className="person-option is-suggested"
                onClick={() => {
                  onChange({ personId: p.id });
                  setPanel(false);
                }}
              >
                <Avatar name={p.name} size={34} />
                <span className="person-option-name">{p.name}</span>
                <span className="person-option-bal">{rupees(balanceOf(p.id, txns))}</span>
              </button>
            ))}

          {filtered.length > 0 && (
            <div className="panel-label">{query ? 'Milte-julte log' : 'Aapke log'}</div>
          )}
          {filtered.map((p) => {
            const bal = balanceOf(p.id, txns);
            return (
              <button
                key={p.id}
                type="button"
                className={`person-option ${value.personId === p.id ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange({ personId: p.id });
                  setPanel(false);
                  setQuery('');
                }}
              >
                <Avatar name={p.name} size={34} />
                <span className="person-option-name">
                  {p.name}
                  {p.upi && <em>{p.upi}</em>}
                </span>
                <span className={`person-option-bal ${bal > 0 ? 'is-out' : bal < 0 ? 'is-in' : ''}`}>
                  {bal === 0 ? 'clear' : rupees(bal)}
                </span>
              </button>
            );
          })}

          {!filtered.length && query && (
            <p className="panel-empty">“{query.trim()}” naam se koi nahi mila.</p>
          )}

          {query.trim() && !exact && (
            <button
              type="button"
              className="person-option person-option--create"
              onClick={() => {
                onChange({ name: query.trim() });
                setPanel(false);
                setQuery('');
              }}
            >
              <span className="create-avatar">
                <PlusIcon size={18} />
              </span>
              <span className="person-option-name">
                Naya banda banao
                <em>{query.trim()}</em>
              </span>
            </button>
          )}

          {!query && !persons.length && (
            <p className="panel-empty">Abhi koi banda nahi. Naam likh ke shuru karo.</p>
          )}
        </div>
      )}
    </div>
  );
}
