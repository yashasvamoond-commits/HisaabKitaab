import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../lib/store';
import { balanceOf } from '../lib/calc';
import { dateKey, formatAmountInput, rupees } from '../lib/format';
import { parseAmountInput, parseTransaction, type ParsedDraft } from '../lib/parse';
import { takePendingShare } from '../lib/share';
import { ocrImage } from '../lib/ocr';
import { navigate, type Route } from '../lib/router';
import { CATEGORIES, type Category, type Direction, type Txn } from '../lib/types';
import { PersonSelect, type PersonValue } from '../components/PersonSelect';
import { Avatar, Segmented } from '../components/ui';
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CameraIcon,
  CategoryIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClipboardIcon,
  CloseIcon,
  ImageIcon,
  InfoIcon,
  PlusIcon,
  SparkleIcon,
  UploadIcon,
} from '../components/Icons';

type Mode = 'image' | 'text' | 'manual';
type Stage = 'input' | 'reading' | 'review' | 'saved';

interface SavedResult {
  txn: Txn;
  personName: string;
  balance: number;
  previousBalance: number | null;
  isNewPerson: boolean;
  direction: Direction;
}

const SAMPLES: { label: string; text: string }[] = [
  {
    label: 'UPI payment',
    text: 'You paid ₹250 to Rahul Sharma\nrahul.sharma@okaxis\nTransaction successful\nToday, 4:32 PM\nUPI Ref: 123456789012',
  },
  {
    label: 'Bank SMS',
    text: 'Rs.1,200.00 debited from A/c XX1234 on 22-11-26 to VPA rahul@okaxis (RAHUL SHARMA). UPI Ref 456789123456. Avl Bal Rs.8,420.35',
  },
  {
    label: 'Payment received',
    text: 'Money received!\n₹1,500\nPriya Verma paid you ₹1,500\nTransaction ID 4567890123',
  },
  {
    label: 'Chat message',
    text: 'Maine Rahul ko auto ke liye 90 rupaye diye',
  },
];

function confidenceLabel(value: number): { text: string; tone: string } {
  if (value >= 0.8) return { text: 'Looks good', tone: 'pos' };
  if (value >= 0.55) return { text: 'Please check', tone: 'warn' };
  return { text: 'Check the details', tone: 'neg' };
}

function progressLabel(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('loading tesseract core')) return 'Loading the reader';
  if (s.includes('loading language') || s.includes('traineddata')) return 'Loading English';
  if (s.includes('initializing')) return 'Getting ready';
  if (s.includes('recognizing')) return 'Reading the screenshot';
  return 'Reading the screenshot';
}

function sourceName(source: Txn['source']): string {
  if (source === 'screenshot') return 'Screenshot';
  if (source === 'sms') return 'Bank SMS';
  if (source === 'chat') return 'Message';
  if (source === 'shared') return 'Shared';
  return 'Manual';
}

function balanceText(name: string, balance: number): string {
  if (Math.abs(balance) < 0.009) return 'Settled up';
  return balance > 0
    ? `${name} owes you ${rupees(balance)}`
    : `You owe ${name} ${rupees(Math.abs(balance))}`;
}

/** Prefer drafts with a real amount, a currency mark, a person and a direction. */
function draftScore(d: ParsedDraft, text: string): number {
  let score = 0;
  if (d.amount != null) score += 4;
  if (d.amount != null && d.amountMarker && /[₹€£¥¢]|\brs\.?|\binr/i.test(d.amountMarker)) score += 2;
  else if (d.amount != null && d.amountMarker && /[©®#]/.test(d.amountMarker)) score += 1;
  if (d.amount != null && d.amount < 10 && /\b\d{1,3}(?:,\d{3})+\b/.test(text)) score -= 3;
  if (d.person) score += 2.5;
  if (d.direction !== 'unknown') score += 1;
  if (d.selfPayment) score += 1.5;
  if (/\b(paid to|received from|debited from|credited to|banking name)\b/i.test(text)) score += 1;
  if (d.amount != null && d.amount > 100000 && !(d.amountMarker && /[₹€£¥¢]/.test(d.amountMarker))) score -= 2.5;
  score += d.confidence || 0;
  return score;
}

export function ScanPage({ route }: { route: Route }) {
  const { state, persons, txns, addTxn, toast } = useApp();
  const initialMode = (route.query.get('mode') as Mode) || 'image';
  const [mode, setMode] = useState<Mode>(['image', 'text', 'manual'].includes(initialMode) ? initialMode : 'image');
  const [stage, setStage] = useState<Stage>('input');
  const [preview, setPreview] = useState<string>('');
  const [rawText, setRawText] = useState('');
  const [draft, setDraft] = useState<ParsedDraft | null>(null);
  const [source, setSource] = useState<Txn['source']>('screenshot');
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [result, setResult] = useState<SavedResult | null>(null);

  const [amountText, setAmountText] = useState('');
  const [direction, setDirection] = useState<Direction>('out');
  const [personValue, setPersonValue] = useState<PersonValue>({});
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('other');
  const [dateText, setDateText] = useState(dateKey(new Date()));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<string>('');

  const selfName = state.profile.name;

  const resetAll = useCallback(() => {
    setStage('input');
    setPreview('');
    setDraft(null);
    setError('');
    setProgress(0);
    setRawText('');
    setAmountText('');
    setPersonValue({});
    setNote('');
    setCategory('other');
    setDirection('out');
    setDateText(dateKey(new Date()));
    setResult(null);
    setShowPreview(false);
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = '';
    }
  }, []);

  const applyDraft = useCallback((d: ParsedDraft, txt: string) => {
    setDraft(d);
    setRawText(txt);
    setAmountText(d.amount ? formatAmountInput(String(d.amount)) : '');
    setDirection(d.direction === 'unknown' ? 'out' : d.direction);
    setNote(d.note || '');
    setCategory(d.category);
    setDateText(dateKey(d.date));
    if (d.person?.personId) setPersonValue({ personId: d.person.personId });
    else if (d.person?.name) setPersonValue({ name: d.person.name });
    else setPersonValue({});
    setStage('review');
  }, []);

  const handleFile = useCallback(
    async (selected: File) => {
      if (!selected.type.startsWith('image/')) {
        toast('Choose an image file');
        return;
      }
      setError('');
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(selected);
      previewRef.current = url;
      setPreview(url);
      setSource('screenshot');
      setStage('reading');
      setProgress(0);
      setProgressText('Preparing the screenshot');
      try {
        const { text, variants } = await ocrImage(selected, (p, status) => {
          setProgress(p);
          setProgressText(progressLabel(status));
        });
        if (!text.trim()) {
          setError('No text found. Try a clearer screenshot, or enter it manually.');
          setStage('input');
          return;
        }

        const parsed = variants
          .map((variant) => ({ text: variant, draft: parseTransaction(variant, { persons, selfName, source: 'screenshot' }) }))
          .sort((a, b) => draftScore(b.draft, b.text) - draftScore(a.draft, a.text));
        const best = parsed[0];
        applyDraft(best.draft, best.text);
        if (best.draft.amount == null) toast('Could not find the amount — enter it below');
      } catch (err) {
        console.error(err);
        setError('Could not read this screenshot. Try again, or enter it manually.');
        setStage('input');
      }
    },
    [applyDraft, persons, selfName, toast],
  );

  const runTextParse = useCallback(
    (textOverride?: string) => {
      const text = (textOverride ?? rawText).trim();
      if (!text) {
        toast('Paste a message first');
        textAreaRef.current?.focus();
        return;
      }
      const bankLike = /(a\/c|acct|account|debited|credited|avl\s*bal|upi\s*ref|utr|rrn)/i.test(text);
      const src: Txn['source'] = bankLike ? 'sms' : 'chat';
      setSource(src);
      const parsed = parseTransaction(text, { persons, selfName, source: src });
      applyDraft(parsed, text);
      if (parsed.confidence < 0.4) toast('Some details need checking');
    },
    [applyDraft, persons, rawText, selfName, toast],
  );

  const startManual = useCallback(() => {
    setMode('manual');
    setSource('manual');
    const empty = parseTransaction('', { persons, selfName, source: 'manual' });
    setDraft(empty);
    setAmountText('');
    setDirection('out');
    setPersonValue({});
    setNote('');
    setCategory('other');
    setDateText(dateKey(new Date()));
    setStage('review');
  }, [persons, selfName]);

  // Deep link (#/scan?mode=manual) opens the form straight away.
  useEffect(() => {
    if (mode === 'manual' && !draft && stage === 'input') startManual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Share sheet handoff.
  useEffect(() => {
    const payload = takePendingShare();
    if (!payload) return;
    if (payload.file) {
      setMode('image');
      void handleFile(payload.file);
    } else if (payload.text) {
      setMode('text');
      setRawText(payload.text);
      runTextParse(payload.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paste an image or message anywhere on the add screen.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (stage === 'review' || stage === 'saved') return;
      const items = event.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const pasted = item.getAsFile();
            if (pasted) {
              event.preventDefault();
              void handleFile(pasted);
              return;
            }
          }
        }
      }
      const text = event.clipboardData?.getData('text');
      if (text && !rawText) {
        event.preventDefault();
        setMode('text');
        setRawText(text);
        runTextParse(text);
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleFile, rawText, runTextParse, stage]);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const amount = parseAmountInput(amountText) || 0;
  const selectedPerson = personValue.personId ? persons.find((p) => p.id === personValue.personId) : undefined;
  const displayName = selectedPerson?.name || personValue.name?.trim() || '';
  const previousBalance = selectedPerson ? balanceOf(selectedPerson.id, txns) : null;
  const nextBalance = previousBalance == null ? null : previousBalance + (direction === 'out' ? amount : -amount);
  const confidence = draft && source !== 'manual' ? confidenceLabel(draft.confidence) : null;
  const suggestions = useMemo(() => (draft?.candidates || []).slice(0, 3), [draft]);

  const save = () => {
    if (!amount) {
      toast('Enter an amount');
      return;
    }
    if (!personValue.personId && !displayName) {
      toast(draft?.selfPayment ? 'Choose who sent it' : 'Select a person');
      return;
    }
    const isNewPerson = !personValue.personId;
    const when = dateText ? new Date(`${dateText}T12:00:00`) : new Date();
    const created = addTxn({
      personId: personValue.personId || '',
      personName: isNewPerson ? displayName : undefined,
      direction,
      amount,
      note,
      category,
      date: when.toISOString(),
      source,
      rawText: draft?.rawText,
      confidence: draft?.confidence,
    });
    const previous = balanceOf(created.personId, txns);
    const newBalance = previous + (direction === 'out' ? amount : -amount);
    const personName = isNewPerson ? displayName : selectedPerson?.name || displayName;
    setResult({ txn: created, personName, balance: newBalance, previousBalance: previous, isNewPerson, direction });
    setStage('saved');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    if (next !== 'manual' && stage !== 'input') {
      setStage('input');
      setDraft(null);
    }
  };

  /* ------------------------------- saved ------------------------------ */
  if (stage === 'saved' && result) {
    const firstName = result.personName.split(' ')[0];
    return (
      <div className="page page--scan">
        <div className="saved-wrap">
          <div className="saved-badge">
            <CheckIcon size={32} />
          </div>
          <h1 className="saved-title">Entry added</h1>
          <p className="saved-sub">
            {result.isNewPerson ? `${result.personName} was added to People` : `Saved with ${result.personName}`}
          </p>

          <div className="card saved-card">
            <Avatar name={result.personName} size={44} />
            <div className="saved-main">
              <span className="saved-name">{result.personName}</span>
              <span className="saved-note">
                {result.direction === 'out' ? 'You lent' : 'They paid you'} {rupees(result.txn.amount)}
                {result.txn.note ? ` · ${result.txn.note}` : ''}
              </span>
            </div>
            <span className={`saved-amount ${result.direction === 'out' ? 'is-pos' : 'is-neg'}`}>
              {result.direction === 'out' ? '+' : '−'}
              {rupees(result.txn.amount)}
            </span>
          </div>

          <div className={`saved-balance ${result.balance > 0.009 ? 'is-pos' : result.balance < -0.009 ? 'is-neg' : 'is-clear'}`}>
            {balanceText(result.personName, result.balance)}
          </div>
          {result.previousBalance != null && Math.abs(result.previousBalance) > 0.009 && (
            <p className="saved-delta">
              Balance went from {balanceText(result.personName, result.previousBalance)} to{' '}
              {balanceText(result.personName, result.balance)}.
            </p>
          )}

          <div className="saved-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                resetAll();
                setMode('image');
              }}
            >
              <PlusIcon size={18} /> Add another
            </button>
            <button
              type="button"
              className="btn btn-outline btn-block"
              onClick={() => navigate(`person/${result.txn.personId}`)}
            >
              View {firstName}
            </button>
            <button type="button" className="link-quiet" onClick={() => navigate('home')}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------- review ----------------------------- */
  if (stage === 'review' && draft) {
    return (
      <div className="page page--scan page--review">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setStage('input');
              setDraft(null);
              setError('');
            }}
            aria-label="Back"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <span className="topbar-title">Review expense</span>
          <span className="topbar-spacer" />
        </header>

        <div className="review-source">
          <span className="source-chip">{sourceName(source)}</span>
          {draft.app && draft.app !== sourceName(source) && <span className="source-app">{draft.app}</span>}
          {confidence && <span className={`confidence is-${confidence.tone}`}>{confidence.text}</span>}
          {preview && (
            <button type="button" className="review-thumb" onClick={() => setShowPreview(true)} aria-label="View screenshot">
              <img src={preview} alt="Screenshot" />
            </button>
          )}
        </div>

        {draft.selfPayment && !personValue.personId && !displayName && (
          <div className="notice is-info">
            <span className="notice-icon">
              <InfoIcon size={18} />
            </span>
            <div className="notice-text">
              <strong>This payment was made to you.</strong>
              <span>Choose who sent it so the balance goes to the right person.</span>
            </div>
          </div>
        )}

        {source !== 'manual' && draft.amount == null && (
          <div className="notice is-warning">
            <span className="notice-icon">
              <InfoIcon size={18} />
            </span>
            <div className="notice-text">
              <strong>Could not find the amount.</strong>
              <span>Enter it below.</span>
            </div>
          </div>
        )}

        <section className="review-card">
          <div className="field-block">
            <span className="field-label">Amount</span>
            <div className="amount-field amount-field--review">
              <span className="amount-currency">₹</span>
              <input
                className="amount-input"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/[^\d.,]/g, ''))}
                aria-label="Amount"
                placeholder="0"
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
                  <>{displayName ? `${displayName} owes you` : "You'll be owed"} <strong>{rupees(amount)}</strong></>
                ) : (
                  <>{displayName ? `You owe ${displayName}` : "You'll owe"} <strong>{rupees(amount)}</strong></>
                )}
              </p>
            )}
          </div>

          <div className="field-block">
            <span className="field-label">Person</span>
            <PersonSelect
              value={personValue}
              onChange={setPersonValue}
              suggestions={suggestions}
              placeholder={draft.selfPayment ? 'Select who sent it' : 'Select a person'}
              onOpenChange={setPickerOpen}
            />
            {!personValue.personId && displayName && (
              <p className="new-person-hint">A new person will be created.</p>
            )}
            {selectedPerson && previousBalance != null && nextBalance != null && (
              <div className="balance-preview">
                <span>Balance with {selectedPerson.name.split(' ')[0]}</span>
                <strong className={nextBalance > 0.009 ? 'is-pos' : nextBalance < -0.009 ? 'is-neg' : 'is-clear'}>
                  {balanceText(selectedPerson.name, nextBalance)}
                </strong>
              </div>
            )}
          </div>

          <details className="more-details">
            <summary>Add note, category or date</summary>
            <div className="more-body">
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
            </div>
          </details>
        </section>

        {rawText && (
          <details className="raw-details">
            <summary>View extracted text</summary>
            <pre>{rawText}</pre>
          </details>
        )}

        {!pickerOpen && (
          <div className="review-cta">
            <button type="button" className="btn btn-primary btn-block" onClick={save}>
              <CheckIcon size={18} /> Save expense
            </button>
          </div>
        )}

        {showPreview &&
          preview &&
          createPortal(
            <div className="lightbox" role="dialog" aria-modal="true" aria-label="Screenshot" onClick={() => setShowPreview(false)}>
              <img src={preview} alt="Screenshot" />
              <button type="button" className="lightbox-close" aria-label="Close">
                <CloseIcon size={22} />
              </button>
            </div>,
            document.body,
          )}
      </div>
    );
  }

  /* ------------------------------- input ------------------------------ */
  return (
    <div className="page page--scan">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={() => navigate('home')} aria-label="Back">
          <ChevronLeftIcon size={22} />
        </button>
        <span className="topbar-title">Add expense</span>
        <span className="topbar-spacer" />
      </header>

      <div className="mode-tabs">
        <button type="button" className={`mode-tab ${mode === 'image' ? 'is-active' : ''}`} aria-pressed={mode === 'image'} onClick={() => switchMode('image')}>
          <ImageIcon size={18} /> Screenshot
        </button>
        <button type="button" className={`mode-tab ${mode === 'text' ? 'is-active' : ''}`} aria-pressed={mode === 'text'} onClick={() => switchMode('text')}>
          <ClipboardIcon size={18} /> Message
        </button>
        <button type="button" className={`mode-tab ${mode === 'manual' ? 'is-active' : ''}`} aria-pressed={mode === 'manual'} onClick={() => switchMode('manual')}>
          <PlusIcon size={18} /> Manual
        </button>
      </div>

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss">
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {mode === 'image' && (
        <>
          <div className="scan-intro">
            <h1>Upload a screenshot</h1>
            <p>A payment receipt, UPI app or bank alert.</p>
          </div>

          <div
            className={`dropzone ${dragging ? 'is-dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) void handleFile(dropped);
            }}
          >
            {stage === 'reading' ? (
              <div className="reading">
                <div className="reading-image">
                  {preview ? <img className="reading-thumb" src={preview} alt="Screenshot" /> : <div className="reading-thumb reading-thumb--empty" />}
                  <span className="scan-line" />
                </div>
                <div className="reading-body">
                  <span className="reading-title">{progressText || 'Reading the screenshot'}</span>
                  <div className="progress" aria-hidden="true">
                    <span style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }} />
                  </div>
                  <span className="reading-sub">
                    {progress > 0.02 && progress < 0.97 ? `${Math.round(progress * 100)}% · ` : ''}
                    Photos can take a few seconds. Nothing leaves your phone.
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="dropzone-icon">
                  <ImageIcon size={28} />
                </div>
                <h2 className="dropzone-title">Choose a payment screenshot</h2>
                <p className="dropzone-sub">GPay, PhonePe, Paytm, BHIM or a bank message.</p>
                <div className="dropzone-actions">
                  <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon size={18} /> Choose image
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => cameraInputRef.current?.click()}>
                    <CameraIcon size={18} /> Camera
                  </button>
                </div>
                <p className="dropzone-hint">You can also drag, drop or paste (Ctrl/Cmd + V)</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />

          <div className="app-chips" aria-label="Supported apps">
            {['GPay', 'PhonePe', 'Paytm', 'BHIM', 'Bank SMS'].map((a) => (
              <span key={a} className="app-chip">
                {a}
              </span>
            ))}
          </div>

          <p className="scan-privacy">Screenshots are read on this device only.</p>
        </>
      )}

      {mode === 'text' && (
        <>
          <div className="scan-intro">
            <h1>Paste a message</h1>
            <p>A UPI SMS, bank alert or chat message.</p>
          </div>

          <div className="card text-card">
            <textarea
              ref={textAreaRef}
              className="text-area"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'e.g. Rs.500 debited to Rahul Sharma\nor: Paid ₹250 to Priya Verma'}
              rows={7}
              aria-label="Message text"
            />
            <div className="text-actions">
              <button type="button" className="btn btn-primary grow" onClick={() => runTextParse()}>
                <SparkleIcon size={18} /> Read message
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (!text.trim()) {
                      toast('Clipboard is empty');
                      return;
                    }
                    setRawText(text);
                    runTextParse(text);
                  } catch {
                    toast('Clipboard access was blocked — paste it instead');
                  }
                }}
              >
                <ClipboardIcon size={18} /> Paste
              </button>
            </div>
          </div>

          <div className="samples">
            <span className="samples-label">Try an example</span>
            <div className="chip-scroll">
              {SAMPLES.map((s) => (
                <button
                  type="button"
                  key={s.label}
                  className="chip chip--sample"
                  onClick={() => {
                    setRawText(s.text);
                    runTextParse(s.text);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <p className="scan-privacy">Works with English and Hinglish messages.</p>
        </>
      )}

      {mode === 'manual' && (
        <div className="card manual-card">
          <div className="manual-icon">
            <PlusIcon size={26} />
          </div>
          <h2>Enter it manually</h2>
          <p>Type the amount, choose a person, and save.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={startManual}>
            Open form
          </button>
        </div>
      )}
    </div>
  );
}
