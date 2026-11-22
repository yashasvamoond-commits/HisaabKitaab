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
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
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
          <button type="button" className="icon-btn" onClick={() => navigate('people')} aria-label="Wapas">
            <ChevronLeftIcon size={22} />
          </button>
          <h1 className="page-title">Banda nahi mila</h1>
        </header>
        <EmptyState
          icon={<ShieldIcon size={26} />}
          title="Yeh khata ab nahi hai"
          body="Shayad ise delete kar diya gaya hai. Aapke baaki log safe hain."
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate('people')}>
              Sab log dekho
            </button>
          }
        />
      </div>
    );
  }

  const balance = balanceOf(person.id, txns);
  const firstName = person.name.split(' ')[0];
  const settle = () => {
    const txn = settleUp(person.id);
    if (txn) toast(`Hisaab clear — ${rupees(txn.amount)} ki entry ban gayi`);
    else toast('Hisaab pehle se clear hai');
  };

  const remind = async () => {
    if (!balance) {
      toast('Hisaab clear hai, reminder ki zaroorat nahi');
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
        toast('Message copy ho gaya — WhatsApp mein paste kar do');
      } catch {
        toast('WhatsApp nahi khul paya. Phone mein number add karo.');
      }
    }
  };

  return (
    <div className="page page--person">
      <header className="topbar topbar--compact">
        <button type="button" className="icon-btn" onClick={() => navigate('people')} aria-label="Sab log">
          <ChevronLeftIcon size={22} />
        </button>
        <span className="topbar-center">Khata</span>
        <button type="button" className="icon-btn" onClick={() => setEditOpen(true)} aria-label="Banda edit karo">
          <EditIcon size={20} />
        </button>
      </header>

      <section className={`person-hero ${balance > 0 ? 'is-out' : balance < 0 ? 'is-in' : 'is-clear'}`}>
        <Avatar name={person.name} size={68} />
        <h1 className="person-name">{person.name}</h1>
        {person.upi ? <p className="person-upi">{person.upi}</p> : <p className="person-upi muted">UPI add karo taaki pehchaan aasaan ho</p>}

        <div className="person-balance">
          <span className="person-balance-label">
            {balance > 0 ? 'Aapko milenge' : balance < 0 ? 'Aapko dene hain' : 'Hisaab clear'}
          </span>
          <strong className="person-balance-value">{rupees(Math.abs(balance))}</strong>
        </div>
        <p className="person-balance-hint">
          {balance > 0
            ? `${firstName} aapko ${rupees(balance)} dega`
            : balance < 0
              ? `Aap ${firstName} ko ${rupees(Math.abs(balance))} denge`
              : 'Sab barabar — koi hisaab baaki nahi'}
        </p>
      </section>

      <div className="person-actions">
        <button type="button" className="action-tile" onClick={() => setAddOpen(true)}>
          <span className="action-icon action-icon--saffron">
            <PlusIcon size={20} />
          </span>
          <span>Naya</span>
        </button>
        <button type="button" className="action-tile" onClick={() => setSettleOpen(true)} disabled={!balance}>
          <span className="action-icon action-icon--green">
            <ArrowDownLeftIcon size={20} />
          </span>
          <span>Settle</span>
        </button>
        <button type="button" className="action-tile" onClick={remind}>
          <span className="action-icon action-icon--whatsapp">
            <WhatsAppIcon size={20} />
          </span>
          <span>Reminder</span>
        </button>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Hisaab ki kitaab</h2>
          <span className="section-meta">{list.length} {list.length === 1 ? 'entry' : 'entries'}</span>
        </div>

        {groups.length ? (
          <div className="timeline timeline--tight">
            {groups.map((g) => {
              const net = g.items.reduce((a, t) => a + (t.direction === 'out' ? t.amount : -t.amount), 0);
              return (
                <div key={g.key} className="timeline-group">
                  <div className="timeline-head">
                    <h3>{dayLabel(g.date)}</h3>
                    <span className="timeline-net">
                      {net === 0 ? 'barabar' : `${net > 0 ? '+' : '−'}${rupees(Math.abs(net))}`}
                    </span>
                  </div>
                  <div className="list-card">
                    {g.items.map((t) => (
                      <TxnRow key={t.id} txn={t} onClick={() => setActiveTxn(t)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<ArrowUpRightIcon size={26} />}
            title="Khaata khaali hai"
            body={`${firstName} ke saath pehla hisaab daalo — chai ho ya kiraya, sab chalta hai.`}
            action={
              <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
                Pehla hisaab daalo
              </button>
            }
          />
        )}
      </section>

      <button type="button" className="whatsapp-wide" onClick={remind}>
        <WhatsAppIcon size={20} />
        {balance > 0 ? `${firstName} ko polite reminder bhejo` : balance < 0 ? 'Apna hisaab clear karne ka message' : 'Hisaab clear hai'}
      </button>

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
        title="Poora hisaab clear karein?"
        body={
          <p>
            <strong>{rupees(Math.abs(balance))}</strong> ka settlement entry ban jaayega aur khata zero ho jaayega.
            {balance > 0 ? ' Matlab unhone aapko paise de diye.' : ' Matlab aapne unhe paise de diye.'}
          </p>
        }
        confirmLabel="Haan, clear karo"
        onConfirm={settle}
      />
    </div>
  );
}
