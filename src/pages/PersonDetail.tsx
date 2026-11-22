import { useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { balanceOf, groupByDay, personTxns } from '../lib/calc';
import { dayLabel, rupees } from '../lib/format';
import { reminderText } from '../lib/share';
import { navigate, type Route } from '../lib/router';
import type { Txn } from '../lib/types';
import { TxnRow } from '../components/TxnRow';
import { TxnSheet } from '../components/TxnSheet';
import { PersonFormSheet } from '../components/PersonFormSheet';
import { Avatar, ConfirmSheet, EmptyState } from '../components/ui';
import {
  CheckIcon,
  ChevronLeftIcon,
  EditIcon,
  PlusIcon,
  ShieldIcon,
  WhatsAppIcon,
} from '../components/Icons';

export function PersonDetailPage({ route }: { route: Route }) {
  const { persons, txns, settleUp, toast, state } = useApp();
  const person = persons.find((p) => p.id === route.id);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [activeTxn, setActiveTxn] = useState<Txn | null>(null);

  const list = useMemo(() => (person ? personTxns(person.id, txns) : []), [person, txns]);
  const groups = useMemo(() => groupByDay(list), [list]);

  if (!person) {
    return (
      <div className="page">
        <header className="topbar">
          <button type="button" className="icon-btn" onClick={() => navigate('people')} aria-label="Back">
            <ChevronLeftIcon size={22} />
          </button>
          <span className="topbar-title">Person</span>
          <span className="topbar-spacer" />
        </header>
        <EmptyState
          icon={<ShieldIcon size={24} />}
          title="Person not found"
          body="This person may have been deleted."
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate('people')}>
              Back to people
            </button>
          }
        />
      </div>
    );
  }

  const balance = balanceOf(person.id, txns);
  const firstName = person.name.split(' ')[0];
  const isClear = Math.abs(balance) < 0.009;

  const settle = () => {
    const txn = settleUp(person.id);
    if (txn) toast(`Settled up · ${rupees(txn.amount)} recorded`);
    else toast('Already settled up');
  };

  const remind = async () => {
    if (isClear) {
      toast('Nothing to settle');
      return;
    }
    const text = reminderText({
      selfName: state.profile.name,
      personName: person.name,
      amount: Math.abs(balance),
      direction: balance > 0 ? 'out' : 'in',
    });
    const digits = (person.phone || '').replace(/\D/g, '');
    const phone = digits.length === 10 ? `91${digits}` : digits;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      try {
        await navigator.clipboard.writeText(text);
        toast('Message copied. Paste it in WhatsApp.');
      } catch {
        toast('Could not open WhatsApp. Add their phone number first.');
      }
    }
  };

  return (
    <div className="page page--person">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => navigate('people')} aria-label="Back">
          <ChevronLeftIcon size={22} />
        </button>
        <span className="topbar-spacer" />
        <button type="button" className="icon-btn" onClick={() => setEditOpen(true)} aria-label="Edit person">
          <EditIcon size={20} />
        </button>
      </header>

      <section className={`person-hero ${balance > 0.009 ? 'is-pos' : balance < -0.009 ? 'is-neg' : 'is-clear'}`}>
        <Avatar name={person.name} size={72} />
        <h1 className="person-name">{person.name}</h1>
        {person.upi && <p className="person-upi">{person.upi}</p>}
        <div className="person-balance">
          <span className="person-balance-label">
            {balance > 0.009 ? 'You are owed' : balance < -0.009 ? 'You owe' : 'Settled up'}
          </span>
          {!isClear && <strong className="person-balance-value">{rupees(Math.abs(balance))}</strong>}
        </div>
      </section>

      <div className="person-actions">
        <button type="button" className="btn btn-primary grow" onClick={() => setAddOpen(true)}>
          <PlusIcon size={18} /> Add expense
        </button>
        <button type="button" className="btn btn-outline grow" onClick={() => setSettleOpen(true)} disabled={isClear}>
          <CheckIcon size={18} /> Settle up
        </button>
      </div>
      {!isClear && (
        <button type="button" className="remind-link" onClick={remind}>
          <WhatsAppIcon size={16} /> Send a reminder
        </button>
      )}

      <section className="section">
        <div className="section-head">
          <h2>History</h2>
          <span className="section-meta">
            {list.length} {list.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {groups.length ? (
          <div className="timeline timeline--tight">
            {groups.map((g) => (
              <div key={g.key} className="timeline-group">
                <div className="timeline-head">
                  <h3>{dayLabel(g.date)}</h3>
                </div>
                <div className="card list-card">
                  {g.items.map((t) => (
                    <TxnRow key={t.id} txn={t} showDate={false} onClick={() => setActiveTxn(t)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PlusIcon size={24} />}
            title="No expenses yet"
            body={`Add the first expense with ${firstName}.`}
            action={
              <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
                Add expense
              </button>
            }
          />
        )}
      </section>

      <TxnSheet open={addOpen} onClose={() => setAddOpen(false)} person={person} />
      <TxnSheet open={!!activeTxn} onClose={() => setActiveTxn(null)} txn={activeTxn} person={person} />
      <PersonFormSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        person={person}
        onCreated={() => navigate('people')}
        onDeleted={() => navigate('people')}
      />
      <ConfirmSheet
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        title="Settle up?"
        body={
          <p>
            Record a payment of <strong>{rupees(Math.abs(balance))}</strong> and bring this balance to zero.
            {balance > 0 ? ' This means they paid you.' : ' This means you paid them.'}
          </p>
        }
        confirmLabel="Settle up"
        onConfirm={settle}
      />
    </div>
  );
}
