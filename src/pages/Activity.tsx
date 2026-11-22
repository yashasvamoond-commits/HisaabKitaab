import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { groupByDay, monthTotals } from '../lib/calc';
import { MONTHS_FULL, dayLabel, rupees } from '../lib/format';
import { navigate } from '../lib/router';
import { TxnRow } from '../components/TxnRow';
import { EmptyState, Segmented } from '../components/ui';
import { BookIcon } from '../components/Icons';

type Filter = 'all' | 'out' | 'in';

export function ActivityPage() {
  const { txns, persons } = useApp();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return txns;
    return txns.filter((t) => t.direction === filter && !t.settlement);
  }, [txns, filter]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const month = monthTotals(txns);
  const now = new Date();
  const personName = (id: string) => persons.find((p) => p.id === id)?.name || 'Puraana banda';

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1 className="page-title">Kitaab</h1>
          <p className="page-sub">Poora hisaab, ek jagah</p>
        </div>
      </header>

      <section className="month-card">
        <div className="month-head">
          <span>
            {MONTHS_FULL[now.getMonth()]} {now.getFullYear()}
          </span>
          <span className="month-count">{txns.length} {txns.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        <div className="month-grid">
          <div>
            <span className="month-label">Diye</span>
            <strong className="is-out">{rupees(month.given)}</strong>
          </div>
          <div>
            <span className="month-label">Liye</span>
            <strong className="is-in">{rupees(month.taken)}</strong>
          </div>
          <div>
            <span className="month-label">Net</span>
            <strong className={month.given - month.taken >= 0 ? 'is-out' : 'is-in'}>
              {month.given === month.taken
                ? '₹0'
                : `${month.given > month.taken ? '+' : '−'}${rupees(Math.abs(month.given - month.taken))}`}
            </strong>
          </div>
        </div>
      </section>

      <Segmented
        value={filter}
        onChange={setFilter}
        ariaLabel="Hisaab filter"
        options={[
          { value: 'all', label: 'Sab' },
          { value: 'out', label: 'Maine diye' },
          { value: 'in', label: 'Unhone diye' },
        ]}
      />

      {groups.length ? (
        <div className="timeline">
          {groups.map((g) => (
            <section key={g.key} className="timeline-group">
              <div className="timeline-head">
                <h3>{dayLabel(g.date)}</h3>
                <span className="timeline-net">
                  {(() => {
                    const net = g.items.reduce((a, t) => a + (t.direction === 'out' ? t.amount : -t.amount), 0);
                    if (!net) return 'barabar';
                    return `${net > 0 ? '+' : '−'}${rupees(Math.abs(net))}`;
                  })()}
                </span>
              </div>
              <div className="list-card">
                {g.items.map((t) => (
                  <TxnRow
                    key={t.id}
                    txn={t}
                    personName={personName(t.personId)}
                    showPerson
                    onClick={() => navigate(`person/${t.personId}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookIcon size={26} />}
          title={filter === 'all' ? 'Kitaab khaali hai' : 'Is filter mein kuch nahi'}
          body="Screenshot, chat ya manual entry se pehla hisaab daalo — yahan sab ek saath dikhega."
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate('scan?mode=image')}>
              Pehla hisaab daalo
            </button>
          }
        />
      )}
    </div>
  );
}
