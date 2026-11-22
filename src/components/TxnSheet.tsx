import { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { balanceOf } from '../lib/calc';
import { dateKey, formatAmountInput, rupees } from '../lib/format';
import { parseAmountInput } from '../lib/parse';
import { CATEGORIES, type Category, type Direction, type Person, type Txn } from '../lib/types';
import { ArrowDownLeftIcon, ArrowUpRightIcon, CategoryIcon, TrashIcon } from './Icons';
import { Avatar, Segmented, Sheet } from './ui';
import { PersonSelect, type PersonValue } from './PersonSelect';

function balanceSentence(name: string, balance: number): string {
  if (Math.abs(balance) < 0.009) return `${name} is settled up`;
  return balance > 0
    ? `${name} owes you ${rupees(balance)}`
    : `You owe ${name} ${rupees(Math.abs(balance))}`;
}

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
      toast('Enter an amount');
      return;
    }
    if (!personValue.personId && !personValue.name?.trim()) {
      toast('Select a person');
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
      toast('Expense updated');
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
      toast('Expense added');
      onSaved?.(created.id, created.personId);
    }
    onClose();
  };

  const who = displayName || 'they';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="tall"
      title={txn ? 'Edit expense' : 'Add expense'}
      subtitle={person && !txn ? `With ${person.name}` : 'Who paid, and who was it for?'}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={save}>
          {txn ? 'Save changes' : 'Save expense'}
        </button>
      }
    >
      <div className="sheet-form">
        <div className="field-block">
          <span className="field-label">Amount</span>
          <div className="amount-field">
            <span className="amount-currency">₹</span>
            <input
              className="amount-input"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))}
              aria-label="Amount"
              placeholder="0"
              autoFocus={!txn && !!person}
            />
          </div>
        </div>

        <div className="field-block">
          <span className="field-label">Who paid?</span>
          <Segmented
            value={direction}
            onChange={setDirection}
            options={[
              { value: 'out', label: 'You paid', icon: <ArrowUpRightIcon size={16} /> },
              { value: 'in', label: 'They paid', icon: <ArrowDownLeftIcon size={16} /> },
            ]}
          />
          {amount > 0 && (
            <p className="hint-line">
              {direction === 'out' ? (
                <>
                  {displayName ? `${who} owes you` : "You'll be owed"} <strong>{rupees(amount)}</strong>
                  {displayName ? ' for this entry' : ''}
                </>
              ) : (
                <>
                  {displayName ? `You owe ${who}` : "You'll owe"} <strong>{rupees(amount)}</strong>
                  {displayName ? ' for this entry' : ''}
                </>
              )}
            </p>
          )}
        </div>

        <div className="field-block">
          <span className="field-label">Person</span>
          {person && !txn ? (
            <div className="fixed-person">
              <Avatar name={person.name} size={36} />
              <div className="fixed-person-main">
                <span className="fixed-person-name">{person.name}</span>
                <span className="fixed-person-bal">{balanceSentence(person.name, balanceOf(person.id, txns))}</span>
              </div>
            </div>
          ) : (
            <>
              <PersonSelect value={personValue} onChange={setPersonValue} autoOpen={!person && !txn && open} />
              {!personValue.personId && displayName && (
                <p className="new-person-hint">A new person will be created.</p>
              )}
              {resolvedPerson && (
                <p className="record-note">
                  Current balance: {balanceSentence(resolvedPerson.name, balanceOf(resolvedPerson.id, txns))}
                </p>
              )}
            </>
          )}
        </div>

        <div className="field-block">
          <span className="field-label">Note</span>
          <input
            className="field field-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dinner, cab, rent…"
            maxLength={60}
          />
        </div>

        <div className="field-block">
          <span className="field-label">Category</span>
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
          <span className="field-label">Date</span>
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
                <TrashIcon size={16} /> Delete expense
              </button>
            ) : (
              <div className="danger-strip">
                <span>Delete this expense?</span>
                <div className="row gap-8">
                  <button type="button" className="btn btn-mini btn-ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-mini btn-danger"
                    onClick={() => {
                      deleteTxn(txn.id);
                      toast('Expense deleted');
                      onClose();
                    }}
                  >
                    Delete
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
