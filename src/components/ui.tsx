import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { avatarColor, initials } from '../lib/format';
import { CloseIcon } from './Icons';

export function Avatar({
  name,
  size = 46,
  radius,
  className = '',
}: {
  name: string;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const color = avatarColor(name);
  return (
    <span
      className={`avatar ${className}`}
      style={{
        width: size,
        height: size,
        background: color.bg,
        color: color.fg,
        fontSize: Math.max(11, size * 0.34),
        borderRadius: radius ?? Math.round(size * 0.36),
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  ariaLabel?: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`segmented-item ${value === o.value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'normal',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'normal' | 'tall';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className={`sheet sheet--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'HisaabKitaab'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" />
        {(title || subtitle) && (
          <div className="sheet-head">
            <div>
              {title && <h2 className="sheet-title">{title}</h2>}
              {subtitle && <p className="sheet-sub">{subtitle}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Band karo">
              <CloseIcon size={20} />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmSheet({
  open,
  title,
  body,
  confirmLabel = 'Haan, kar do',
  cancelLabel = 'Nahi, rehne do',
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="row gap-10">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      {body && <div className="confirm-body">{body}</div>}
    </Sheet>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'red' | 'saffron' | 'ink';
  className?: string;
}) {
  return <span className={`pill pill--${tone} ${className}`}>{children}</span>;
}
