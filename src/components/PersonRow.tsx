import { balanceOf, lastActivityLabel } from '../lib/calc';
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
  const tone = balance > 0.009 ? 'is-pos' : balance < -0.009 ? 'is-neg' : 'is-clear';

  return (
    <button type="button" className="person-row" onClick={onClick}>
      <Avatar name={person.name} size={44} />
      <span className="person-row-main">
        <span className="person-row-name">{person.name}</span>
        <span className="person-row-sub">{lastActivityLabel(lastDate ?? null)}</span>
      </span>
      <span className={`person-row-bal ${tone}`}>
        {Math.abs(balance) < 0.009 ? (
          <span className="person-row-clear">Settled up</span>
        ) : (
          <>
            <span className="person-row-amount">{rupees(Math.abs(balance))}</span>
            <span className="person-row-hint">{balance > 0 ? 'owes you' : 'you owe'}</span>
          </>
        )}
      </span>
      <ChevronRightIcon size={17} className="person-row-chev" />
    </button>
  );
}
