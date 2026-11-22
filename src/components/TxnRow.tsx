import { CATEGORIES, type Txn } from '../lib/types';
import { dayLabel, rupees } from '../lib/format';
import { CategoryIcon, CheckIcon } from './Icons';
import { Avatar } from './ui';

export function TxnRow({
  txn,
  personName,
  showPerson = false,
  showDate = true,
  onClick,
}: {
  txn: Txn;
  personName?: string;
  showPerson?: boolean;
  showDate?: boolean;
  onClick?: () => void;
}) {
  const isOut = txn.direction === 'out';
  const cat = CATEGORIES.find((c) => c.id === txn.category);
  const isSettlement = !!txn.settlement;
  const title = isSettlement ? (isOut ? 'Payment sent' : 'Payment received') : txn.note || cat?.label || 'Expense';
  const action = isSettlement ? 'Settlement' : isOut ? 'You lent' : 'You borrowed';
  // On the home screen the date is more useful than the lent/borrowed label;
  // inside the grouped history the label is the useful part.
  const sub =
    showPerson && showDate
      ? [personName, dayLabel(txn.date)].filter(Boolean).join(' · ')
      : [showPerson ? personName : null, action, showDate ? dayLabel(txn.date) : null]
          .filter(Boolean)
          .join(' · ');

  const content = (
    <>
      {showPerson && personName ? (
        <Avatar name={personName} size={40} />
      ) : (
        <span className={`txn-cat ${isSettlement ? 'is-settle' : ''}`}>
          {isSettlement ? <CheckIcon size={18} /> : <CategoryIcon id={txn.category} size={18} />}
        </span>
      )}
      <span className="txn-main">
        <span className="txn-title">{title}</span>
        <span className="txn-sub">{sub}</span>
      </span>
      <span className={`txn-amount ${isSettlement ? 'is-settle' : isOut ? 'is-pos' : 'is-neg'}`}>
        {isSettlement ? (
          <>
            {rupees(txn.amount)}
            <span className="txn-amount-note">settled</span>
          </>
        ) : (
          <>
            {isOut ? '+' : '−'}
            {rupees(txn.amount)}
            <span className="txn-amount-note">{isOut ? 'owes you' : 'you owe'}</span>
          </>
        )}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="txn-row is-tappable" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="txn-row">{content}</div>;
}
