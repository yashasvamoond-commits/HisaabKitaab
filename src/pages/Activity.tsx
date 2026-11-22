import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { groupByDay, monthTotals } from '../lib/calc';
import { MONTHS_FULL, dayLabel, rupees } from '../lib/format';
import { navigate } from '../lib/router';
import type { Txn } from '../lib/types';
import { TxnRow } from '../components/TxnRow';
import { TxnSheet } from '../components/TxnSheet';
import { EmptyState, Segmented } from '../components/ui';
import { BookIcon } from '../components/Icons';

type Filter = 'all' | 'out' | 'in';

export function ActivityPage() {
  const { txns, persons } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [activeTxn, setActiveTxn] = useState<Txn | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return txns;
    return txns.filter((t) => t.direction === filter);
  }, [txns, filter]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const month = monthTotals(txns);
  const net = month.given - month.taken;
  const now = new Date();
  const personName = (id: string) => persons.find((p) => p.id === id)?.name || 'Unknown';

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-sub">Every expense and payment</p>
        </div>
      </header>

      <section className="month-card">
        <div className="month-head">
          <span>
            {MONTHS_FULL[now.getMonth()]} {now.getFullYear()}
          </span>
          <span className="month-count">
            {txns.length} {txns.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <div className="month-grid">
          <div>
            <span className="month-label">You paid</span>
            <strong>{rupees(month.given)}</strong>
          </div>
          <div>
            <span className="month-label">They paid</span>
            <strong>{rupees(month.taken)}</strong>
          </div>
          <div>
            <span className="month-label">Net</span>
            <strong className={net > 0.009 ? 'is-pos' : net < -0.009 ? 'is-neg' : ''}>
              {Math.abs(net) < 0.009
                ? '₹0'
                : `${net > 0 ? '+' : '−'}${rupees(Math.abs(net))}`}
            </strong>
          </div>
        </div>
      </section>

      <Segmented
        value={filter}
        onChange={setFilter}
        ariaLabel="Filter activity"
        options={[
          { value: 'all', label: 'All' },
          { value: 'out', label: 'You paid' },
          { value: 'in', label: 'They paid' },
        ]}
      />

      {groups.length ? (
        <div className="timeline">
          {groups.map((g) => (
            <section key={g.key} className="timeline-group">
              <div className="timeline-head">
                <h3>{dayLabel(g.date)}</h3>
              </div>
              <div className="card list-card">
                {g.items.map((t) => (
                  <TxnRow
                    key={t.id}
                    txn={t}
                    personName={personName(t.personId)}
                    showPerson
                    showDate={false}
                    onClick={() => setActiveTxn(t)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookIcon size={24} />}
          title={filter === 'all' ? 'No activity yet' : 'Nothing here'}
          body={
            filter === 'all'
              ? 'Add your first expense from a screenshot, a message, or by typing it in.'
              : 'No entries match this filter.'
          }
          action={
            filter === 'all' ? (
              <button type="button" className="btn btn-primary" onClick={() => navigate('scan?mode=image')}>
                Add expense
              </button>
            ) : undefined
          }
        />
      )}

      <TxnSheet open={!!activeTxn} onClose={() => setActiveTxn(null)} txn={activeTxn} />
    </div>
  );
}
