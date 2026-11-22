import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { balanceOf } from '../lib/calc';
import { dateKey, formatAmountInput, rupees, signedRupees } from '../lib/format';
import { parseAmountInput } from '../lib/parse';
import { CATEGORIES, type Category, type Direction, type Person, type Txn } from '../lib/types';
import { ArrowDownLeftIcon, ArrowUpRightIcon, CategoryIcon, TrashIcon } from './Icons';
import { Avatar, Segmented, Sheet } from './ui';
import { PersonSelect, type PersonValue } from './PersonSelect';

export function TxnSheet({
  open,
  onClose,
  person,
  txn,
  onSaved,
  defaultDirection = 'out',
}: {
  open: boolean;
  onClose: () => void;
  person?: Person | null;
  txn?: Txn | null;
  onSaved?: (txnId: string, personId: string) => void;
  defaultDirection?: Direction;
}) {
  const { persons, txns, addTxn, updateTxn, deleteTxn, toast } = useApp();
  const [personValue, setPersonValue] = useState<PersonValue>({});
  const [amountText, setAmountText] = useState('');
  const [direction, setDirection] = useState<Direction>(defaultDirection);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [dateText, setDateText] = useState(dateKey(new Date()));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    const editing = txn || null;
    if (editing) {
      setPersonValue({ personId: editing.personId });
      setAmountText(formatAmountInput(String(editing.amount)));
      setDirection(editing.direction);
      setNote(editing.note || '');
      setCategory(editing.category);
      setDateText(dateKey(editing.date));
    } else {
      setPersonValue(person ? { personId: person.id } : {});
      setAmountText('');
      setDirection(defaultDirection);
      setNote('');
      setCategory('other');
      setDateText(dateKey(new Date()));
    }
    setConfirmDelete(false);
  }, [open, txn, person, defaultDirection]);

  const resolvedPerson = personValue.personId
    ? persons.find((p) => p.id === personValue.personId)
    : undefined;
  const displayName = resolvedPerson?.name || personValue.name || '';
  const amount = parseAmountInput(amountText) || 0;

  const save = () => {
    if (!amount) {
      toast('Pehle amount daalo');
      return;
    }
    if (!personValue.personId && !personValue.name?.trim()) {
      toast('Kiska hisaab hai? Naam chuno ya naya banao');
      return;
    }
    const when = dateText ? new Date(`${dateText}T12:00:00`) : new Date();
    if (txn) {
      const nextPersonId = personValue.personId || txn.personId;
      updateTxn(txn.id, {
        personId: nextPersonId,
        amount,
        direction,
        note,
        category,
        date: when.toISOString(),
      });
      toast('Hisaab badal diya');
      onSaved?.(txn.id, nextPersonId);
    } else {
      const created = addTxn({
        personId: personValue.personId || '',
        personName: personValue.personId ? undefined : personValue.name?.trim(),
        direction,
        amount,
        note,
        category,
        date: when.toISOString(),
        source: 'manual',
      });
      toast('Hisaab mein daal diya');
      onSaved?.(created.id, created.personId);
    }
    onClose();
  };

  const who = displayName || 'Yeh banda';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="tall"
      title={txn ? 'Hisaab badlo' : 'Naya hisaab'}
      subtitle={person && !txn ? `${person.name} ke saath` : 'Screenshot, chat ya khud likh ke — sab chalta hai'}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={save}>
          {txn ? 'Badlav save karo' : 'Hisaab mein daalo'}
        </button>
      }
    >
      <div className="sheet-form">
        {!person && (
          <PersonSelect value={personValue} onChange={setPersonValue} autoOpen={!personValue.personId && !personValue.name && open && !txn} />
        )}

        {person && (
          <div className="fixed-person">
            <Avatar name={person.name} size={38} />
            <div>
              <span className="fixed-person-name">{person.name}</span>
              <span className="fixed-person-bal">
                Abhi: {signedRupees(balanceOf(person.id, txns))}
              </span>
            </div>
          </div>
        )}

        <div className="field-block">
          <span className="field-label">Kisne paise diye?</span>
          <Segmented
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'out', label: 'Maine diye', icon: <ArrowUpRightIcon size={16} /> },
              { value: 'in', label: 'Unhone diye', icon: <ArrowDownLeftIcon size={16} /> },
            ]}
          />
          {amount > 0 && (
            <p className="hint-line">
              {direction === 'out' ? `${who} aapko` : `Aap ${who} ko`}{' '}
              <strong>{rupees(amount)}</strong> {direction === 'out' ? 'dega' : 'denge'}
            </p>
          )}
        </div>

        <div className="field-block">
          <span className="field-label">Kitne paise?</span>
          <div className="amount-field">
            <span className="amount-currency">₹</span>
            <input
              className="amount-input"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))}
              aria-label="Amount"
            />
          </div>
        </div>

        <div className="field-block">
          <span className="field-label">Kis baare mein?</span>
          <input
            className="field field-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Chai, auto, kiraya…"
            maxLength={60}
          />
        </div>

        <div className="field-block">
          <span className="field-label">Kya tha?</span>
          <div className="chip-scroll chip-scroll--wrap">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`chip ${category === c.id ? 'is-active' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                <CategoryIcon id={c.id} size={15} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field-block">
          <span className="field-label">Kab?</span>
          <input
            type="date"
            className="field field-input"
            value={dateText}
            max={dateKey(new Date())}
            onChange={(e) => setDateText(e.target.value)}
          />
        </div>

        {txn && (
          <div className="danger-zone">
            {!confirmDelete ? (
              <button type="button" className="link-danger" onClick={() => setConfirmDelete(true)}>
                <TrashIcon size={16} /> Yeh hisaab hatao
              </button>
            ) : (
              <div className="danger-strip">
                <span>Pakka hata dein?</span>
                <div className="row gap-8">
                  <button type="button" className="btn btn-mini btn-ghost" onClick={() => setConfirmDelete(false)}>
                    Nahi
                  </button>
                  <button
                    type="button"
                    className="btn btn-mini btn-danger"
                    onClick={() => {
                      deleteTxn(txn.id);
                      toast('Hisaab hata diya');
                      onClose();
                    }}
                  >
                    Haan, hatao
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
