import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { personBalances } from '../lib/calc';
import { rupees } from '../lib/format';
import { navigate, type Route } from '../lib/router';
import { PersonRow } from '../components/PersonRow';
import { PersonFormSheet } from '../components/PersonFormSheet';
import { EmptyState } from '../components/ui';
import { PlusIcon, SearchIcon, SparkleIcon, UsersIcon } from '../components/Icons';

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
      .filter((r) => !q || r.person.name.toLowerCase().includes(q) || r.person.aliases.some((a) => a.toLowerCase().includes(q)))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.person.name.localeCompare(b.person.name));
  }, [persons, txns, search]);

  const allRows = personBalances(persons, txns);
  const receive = allRows.filter((r) => r.balance > 0).reduce((a, r) => a + r.balance, 0);
  const pay = allRows.filter((r) => r.balance < 0).reduce((a, r) => a + Math.abs(r.balance), 0);

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1 className="page-title">Aapke log</h1>
          <p className="page-sub">{persons.length} log · {txns.length} hisaab</p>
        </div>
        <button type="button" className="btn btn-mini btn-primary" onClick={() => setAddOpen(true)}>
          <PlusIcon size={16} /> Naya
        </button>
      </header>

      {persons.length > 0 && (
        <>
          <div className="search-field search-field--page">
            <SearchIcon size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Naam dhoondo…"
              aria-label="Banda dhoondo"
            />
            {search && (
              <button type="button" className="text-btn" onClick={() => setSearch('')}>
                saaf
              </button>
            )}
          </div>

          <div className="summary-strip">
            <div>
              <span className="dot dot--green" />
              <span>Milna</span>
              <strong>{rupees(receive)}</strong>
            </div>
            <div>
              <span className="dot dot--red" />
              <span>Dena</span>
              <strong>{rupees(pay)}</strong>
            </div>
          </div>
        </>
      )}

      {rows.length > 0 ? (
        <div className="list-card list-card--flush">
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
          icon={<SearchIcon size={26} />}
          title="Koi nahi mila"
          body={`“${search}” naam se koi banda nahi hai. Naya khata bana do?`}
          action={
            <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <PlusIcon size={17} /> Naya banda
            </button>
          }
        />
      ) : (
        <EmptyState
          icon={<UsersIcon size={28} />}
          title="Abhi koi banda nahi"
          body="Jab pehli baar kisi ka screenshot ya chat daaloge, uska khata apne aap yahan ban jaayega. Ya khud naam add karo."
          action={
            <div className="column gap-10">
              <button type="button" className="btn btn-primary" onClick={() => navigate('scan?mode=image')}>
                Screenshot se shuru karo
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setAddOpen(true)}>
                <PlusIcon size={17} /> Khud naam add karo
              </button>
            </div>
          }
        />
      )}

      {persons.length > 0 && (
        <>
          <div className="people-tip">
            <span className="people-tip-icon">
              <SparkleIcon size={16} />
            </span>
            <p>
              <strong>Tip:</strong> kisi ka bhi payment screenshot bhejo — banda khud pehchana jaayega. Naya naam ho toh
              naya khata khud ban jaayega.
            </p>
          </div>
          <p className="people-foot">Sab ka hisaab ek jagah. Tap karke poora khata dekho.</p>
        </>
      )}

      <PersonFormSheet open={addOpen} onClose={() => setAddOpen(false)} onCreated={(id) => navigate(`person/${id}`)} />
    </div>
  );
}
