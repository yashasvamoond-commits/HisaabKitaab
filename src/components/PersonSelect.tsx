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
  placeholder = 'Select a person',
  onOpenChange,
}: {
  value: PersonValue;
  onChange: (v: PersonValue) => void;
  suggestions?: { personId?: string; name: string; score?: number }[];
  autoOpen?: boolean;
  placeholder?: string;
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
    const list = persons.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.aliases.some((a) => a.toLowerCase().includes(q)),
    );
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

  const balanceText = (id: string) => {
    const bal = balanceOf(id, txns);
    if (Math.abs(bal) < 0.009) return { text: 'Settled up', tone: 'clear' };
    return bal > 0
      ? { text: `Owes you ${rupees(bal)}`, tone: 'pos' }
      : { text: `You owe ${rupees(Math.abs(bal))}`, tone: 'neg' };
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
        aria-label="Person"
      >
        {displayName ? (
          <Avatar name={displayName} size={32} />
        ) : (
          <span className="person-field-icon">
            <SearchIcon size={17} />
          </span>
        )}
        <span className={`person-field-name ${!displayName ? 'is-empty' : ''}`}>
          {displayName || placeholder}
        </span>
        {isNew && <span className="tag">New</span>}
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
              placeholder="Search or add a person"
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
                Clear
              </button>
            )}
          </div>

          {!query && suggestionPeople.length > 0 && (
            <div className="panel-label">
              <SparkleIcon size={13} /> Suggested
            </div>
          )}

          {!query &&
            suggestionPeople.map((p) => {
              const bal = balanceText(p.id);
              return (
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
                  <span className={`person-option-bal is-${bal.tone}`}>{bal.text}</span>
                </button>
              );
            })}

          {filtered.length > 0 && (
            <div className="panel-label">{query ? 'Matches' : 'Your people'}</div>
          )}
          {filtered.map((p) => {
            const bal = balanceText(p.id);
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
                <span className={`person-option-bal is-${bal.tone}`}>{bal.text}</span>
              </button>
            );
          })}

          {!filtered.length && query && (
            <p className="panel-empty">No one matches “{query.trim()}”.</p>
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
                Create new person
                <em>{query.trim()}</em>
              </span>
            </button>
          )}

          {!query && !persons.length && (
            <p className="panel-empty">No people yet. Type a name to start.</p>
          )}
        </div>
      )}
    </div>
  );
}
