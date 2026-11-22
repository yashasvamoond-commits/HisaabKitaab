import { CATEGORIES, SOURCE_LABEL, type Txn } from '../lib/types';
import { dayLabel, rupees, timeLabel } from '../lib/format';
import { ArrowDownLeftIcon, ArrowUpRightIcon, CheckIcon } from './Icons';
import { Avatar } from './ui';

export function TxnRow({
  txn,
  personName,
  showPerson = false,
  onClick,
}: {
  txn: Txn;
  personName?: string;
  showPerson?: boolean;
  onClick?: () => void;
}) {
  const isOut = txn.direction === 'out';
  const cat = CATEGORIES.find((c) => c.id === txn.category);
  const title = txn.note || (txn.settlement ? 'Hisaab clear' : cat?.label || 'Hisaab');
  const sub = [
    showPerson ? personName : null,
    dayLabel(txn.date),
    timeLabel(txn.date),
    txn.source !== 'manual' ? SOURCE_LABEL[txn.source] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button type="button" className={`txn-row ${onClick ? 'is-tappable' : ''}`} onClick={onClick} disabled={!onClick}>
      {showPerson && personName ? (
        <Avatar name={personName} size={40} />
      ) : (
        <span className={`txn-dir ${txn.settlement ? 'is-settle' : isOut ? 'is-out' : 'is-in'}`}>
          {txn.settlement ? <CheckIcon size={18} /> : isOut ? <ArrowUpRightIcon size={18} /> : <ArrowDownLeftIcon size={18} />}
        </span>
      )}
      <span className="txn-main">
        <span className="txn-title">
          {title}
          {txn.settlement && <span className="tiny-tag">settle</span>}
        </span>
        <span className="txn-sub">{sub}</span>
      </span>
      <span className={`txn-amount ${txn.settlement ? 'is-settle' : isOut ? 'is-out' : 'is-in'}`}>
        {txn.settlement ? rupees(txn.amount) : `${isOut ? '+' : '−'}${rupees(txn.amount)}`}
        <span className="txn-amount-note">{txn.settlement ? 'clear' : isOut ? 'milega' : 'dena hai'}</span>
      </span>
    </button>
  );
}
