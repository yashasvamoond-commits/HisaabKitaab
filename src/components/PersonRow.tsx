import { balanceOf } from '../lib/calc';
import { lastActivityLabel } from '../lib/calc';
import { rupees } from '../lib/format';
import type { Person, Txn } from '../lib/types';
import { ChevronRightIcon } from './Icons';
import { Avatar } from './ui';

export function PersonRow({
  person,
  txns,
  lastDate,
  onClick,
}: {
  person: Person;
  txns: Txn[];
  lastDate?: string | null;
  onClick: () => void;
}) {
  const balance = balanceOf(person.id, txns);
  return (
    <button type="button" className="person-row" onClick={onClick}>
      <Avatar name={person.name} size={46} />
      <span className="person-row-main">
        <span className="person-row-name">{person.name}</span>
        <span className="person-row-sub">{lastActivityLabel(lastDate ?? null)}</span>
      </span>
      <span className={`person-row-bal ${balance > 0 ? 'is-out' : balance < 0 ? 'is-in' : 'is-clear'}`}>
        <span className="person-row-amount">{balance === 0 ? 'Hisaab clear' : rupees(balance)}</span>
        <span className="person-row-hint">
          {balance > 0 ? 'milega' : balance < 0 ? 'dena hai' : 'barabar'}
        </span>
      </span>
      <ChevronRightIcon size={17} className="person-row-chev" />
    </button>
  );
}
