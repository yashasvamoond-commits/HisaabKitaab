import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { personBalances } from '../lib/calc';
import { navigate, type Route } from '../lib/router';
import { PersonRow } from '../components/PersonRow';
import { PersonFormSheet } from '../components/PersonFormSheet';
import { EmptyState } from '../components/ui';
import { PlusIcon, SearchIcon, UsersIcon } from '../components/Icons';

export function PeoplePage({ route }: { route: Route }) {
  const { persons, txns } = useApp();
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (route.query.get('add') === '1') setAddOpen(true);
  }, [route.query]);

  const rows = useMemo(() => {
    const list = personBalances(persons, txns);
    const q = search.trim().toLowerCase();
    return list
      .filter(
        (r) =>
          !q ||
          r.person.name.toLowerCase().includes(q) ||
          r.person.aliases.some((a) => a.toLowerCase().includes(q)),
      )
      .sort(
        (a, b) =>
          Math.abs(b.balance) - Math.abs(a.balance) ||
          a.person.name.localeCompare(b.person.name),
      );
  }, [persons, txns, search]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">People</h1>
          <p className="page-sub">
            {persons.length} {persons.length === 1 ? 'person' : 'people'} · {txns.length}{' '}
            {txns.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <button type="button" className="btn btn-mini btn-primary" onClick={() => setAddOpen(true)}>
          <PlusIcon size={16} /> Add
        </button>
      </header>

      {persons.length > 0 && (
        <div className="search-field search-field--page">
          <SearchIcon size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
          />
          {search && (
            <button type="button" className="text-btn" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="card list-card">
          {rows.map((r) => (
            <PersonRow
              key={r.person.id}
              person={r.person}
              txns={txns}
              lastDate={r.lastDate}
              onClick={() => navigate(`person/${r.person.id}`)}
            />
          ))}
        </div>
      ) : persons.length > 0 ? (
        <EmptyState
          icon={<SearchIcon size={24} />}
          title="No matches"
          body={`No one named “${search}”.`}
          action={
            <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <PlusIcon size={17} /> Add a person
            </button>
          }
        />
      ) : (
        <EmptyState
          icon={<UsersIcon size={26} />}
          title="No people yet"
          body="People are added automatically when you save an expense, or you can add one now."
          action={
            <div className="column gap-10">
              <button type="button" className="btn btn-primary" onClick={() => navigate('scan?mode=image')}>
                Add from screenshot
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setAddOpen(true)}>
                <PlusIcon size={17} /> Add a person
              </button>
            </div>
          }
        />
      )}

      {persons.length > 0 && <p className="page-foot">Tap a person to see their full history.</p>}

      <PersonFormSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(id) => navigate(`person/${id}`)}
      />
    </div>
  );
}
