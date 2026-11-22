import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../lib/store';
import { balanceOf } from '../lib/calc';
import { dateKey, formatAmountInput, rupees, signedRupees } from '../lib/format';
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
  CheckIcon,
  ChevronLeftIcon,
  ClipboardIcon,
  CloseIcon,
  ImageIcon,
  PlusIcon,
  SparkleIcon,
  UploadIcon,
  CategoryIcon,
  UserIcon,
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
    label: 'GPay screenshot',
    text: 'You paid\n₹250\nTo Rahul Sharma\nrahul.sharma@okaxis\nTransaction successful\nToday, 4:32 PM\nUPI Ref: 123456789012',
  },
  {
    label: 'Bank SMS',
    text: 'Rs.1200.00 debited from A/c XX1234 on 22-11-26 to VPA rahul@okaxis (RAHUL SHARMA). UPI Ref 456789123456. Avl Bal Rs.8,420.35',
  },
  {
    label: 'PhonePe received',
    text: 'Paytm\nMoney received!\n₹1,500\nPriya Verma paid you ₹1,500\nTransaction ID 4567890123',
  },
  {
    label: 'WhatsApp chat',
    text: 'Rahul: bhai kal ke chai ke 120 rupaye diye the, 80 baaki hai',
  },
  {
    label: 'Hinglish',
    text: 'Maine Rahul ko auto ke liye 90 rupaye diye',
  },
];

function confidenceLabel(value: number): { text: string; tone: string } {
  if (value >= 0.8) return { text: 'Pakka lag raha hai', tone: 'green' };
  if (value >= 0.55) return { text: 'Thoda check kar lo', tone: 'saffron' };
  return { text: 'Andaaza hai — check karo', tone: 'red' };
}

function progressLabel(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('loading tesseract core')) return 'Engine load ho raha hai';
  if (s.includes('loading language') || s.includes('traineddata')) return 'English samajh rahe hain';
  if (s.includes('initializing')) return 'Taiyaar ho raha hai';
  if (s.includes('recognizing')) return 'Screenshot padh rahe hain';
  return 'Kaam chal raha hai';
}

export function ScanPage({ route }: { route: Route }) {
  const { state, persons, txns, addTxn, toast } = useApp();
  const initialMode = (route.query.get('mode') as Mode) || 'image';
  const [mode, setMode] = useState<Mode>(['image', 'text', 'manual'].includes(initialMode) ? initialMode : 'image');
  const [stage, setStage] = useState<Stage>('input');
  const [file, setFile] = useState<File | null>(null);
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
    setFile(null);
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
        toast('Photo ya screenshot chuno');
        return;
      }
      setError('');
      setFile(selected);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      const url = URL.createObjectURL(selected);
      previewRef.current = url;
      setPreview(url);
      setSource('screenshot');
      setStage('reading');
      setProgress(0);
      setProgressText('Screenshot taiyaar kar rahe hain');
      try {
        const text = await ocrImage(selected, (p, status) => {
          setProgress(p);
          setProgressText(progressLabel(status));
        });
        setRawText(text);
        if (!text.trim()) {
          setError('Screenshot mein text nahi mila. Neeche message likh do, ya doosra screenshot try karo.');
          setStage('input');
          setMode('text');
          return;
        }
        const parsed = parseTransaction(text, { persons, selfName, source: 'screenshot' });
        applyDraft(parsed, text);
      } catch (err) {
        console.error(err);
        setError('Screenshot padhne mein dikkat aayi. Aap text paste kar do — hisaab phir bhi ban jaayega.');
        setStage('input');
        setMode('text');
      }
    },
    [applyDraft, persons, selfName, toast],
  );

  const runTextParse = useCallback(
    (textOverride?: string) => {
      const text = (textOverride ?? rawText).trim();
      if (!text) {
        toast('Pehle message ya screenshot ka text daalo');
        textAreaRef.current?.focus();
        return;
      }
      const bankLike = /(a\/c|acct|account|debited|credited|avl\s*bal|upi\s*ref|utr|rrn)/i.test(text);
      const src: Txn['source'] = bankLike ? 'sms' : 'chat';
      setSource(src);
      const parsed = parseTransaction(text, { persons, selfName, source: src });
      applyDraft(parsed, text);
      if (parsed.confidence < 0.4) toast('Text se zyada kuch samajh nahi aaya — fields khud bhar lo');
    },
    [applyDraft, persons, rawText, selfName, toast],
  );

  // Deep link (#/scan?mode=manual) opens the form straight away.
  useEffect(() => {
    if (mode === 'manual' && !draft && stage === 'input') startManual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Share sheet / clipboard handoff
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

  // Paste a screenshot or a message anywhere on this screen
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
  const nextBalance =
    previousBalance == null ? null : previousBalance + (direction === 'out' ? amount : -amount);
  const confidence = draft ? confidenceLabel(draft.confidence) : null;

  const suggestions = useMemo(() => (draft?.candidates || []).slice(0, 3), [draft]);

  const save = () => {
    if (!amount) {
      toast('Amount toh daalo');
      return;
    }
    if (!personValue.personId && !displayName) {
      toast('Banda chuno ya naya naam likho');
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

  const startManual = () => {
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
  };

  const switchMode = (next: Mode) => {
    if (next === 'manual') {
      startManual();
      return;
    }
    setMode(next);
    if (stage !== 'input') {
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
            <CheckIcon size={34} />
          </div>
          <h1 className="saved-title">Hisaab mein daal diya</h1>
          <p className="saved-sub">
            {result.isNewPerson ? `Naya khata ban gaya — ${result.personName}` : `${result.personName} ke khate mein add ho gaya`}
          </p>

          <div className="saved-card">
            <Avatar name={result.personName} size={44} />
            <div className="saved-main">
              <span className="saved-name">{result.personName}</span>
              <span className="saved-note">
                {result.direction === 'out' ? 'Aapne diye' : 'Unhone diye'} · {rupees(result.txn.amount)}
                {result.txn.note ? ` · ${result.txn.note}` : ''}
              </span>
            </div>
            <span className={`saved-amount ${result.direction === 'out' ? 'is-out' : 'is-in'}`}>
              {result.direction === 'out' ? '+' : '−'}
              {rupees(result.txn.amount)}
            </span>
          </div>

          <div className={`saved-balance ${result.balance > 0 ? 'is-out' : result.balance < 0 ? 'is-in' : 'is-clear'}`}>
            {result.balance > 0
              ? `${firstName} aapko ${rupees(result.balance)} dega`
              : result.balance < 0
                ? `Ab aapko ${firstName} ko ${rupees(Math.abs(result.balance))} dene hain`
                : 'Hisaab barabar ho gaya'}
          </div>
          {!result.isNewPerson && result.previousBalance != null && (
            <p className="saved-delta">
              Pehle {signedRupees(result.previousBalance)} tha → ab {signedRupees(result.balance)}
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
              <PlusIcon size={18} /> Aur ek hisaab daalo
            </button>
            <button type="button" className="btn btn-outline btn-block" onClick={() => navigate(`person/${result.txn.personId}`)}>
              <UserIcon size={18} /> {firstName} ka khata dekho
            </button>
            <button type="button" className="link-quiet" onClick={() => navigate('home')}>
              Ghar chalo
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
        <header className="topbar topbar--compact">
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setStage('input');
              setDraft(null);
              setError('');
            }}
            aria-label="Wapas"
          >
            <ChevronLeftIcon size={22} />
          </button>
          <span className="topbar-center">Yeh samajh aaya</span>
          <span className="topbar-spacer" />
        </header>

        <div className="review-top">
          <div>
            <span className="review-eyebrow">
              {source === 'screenshot' ? 'Screenshot se' : source === 'sms' ? 'SMS se' : source === 'chat' ? 'Chat se' : 'Aapne likha'}
            </span>
            {confidence && source !== 'manual' && (
              <span className={`confidence is-${confidence.tone}`}>{confidence.text}</span>
            )}
          </div>
          {draft.app && <span className="app-badge">{draft.app}</span>}
        </div>

        {draft.signals.length > 0 && (
          <div className="signals" aria-label="Kya samajh aaya">
            {draft.signals.slice(0, 4).map((s) => (
              <span key={s} className="signal">
                <CheckIcon size={13} /> {s}
              </span>
            ))}
          </div>
        )}

        <section className="review-card">
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
                {direction === 'out' ? `${displayName || 'Yeh banda'} aapko` : `Aap ${displayName || 'unhe'} ko`}{' '}
                <strong>{rupees(amount)}</strong> {direction === 'out' ? 'dega' : 'denge'}
              </p>
            )}
          </div>

          <div className="field-block">
            <span className="field-label">Kitne paise?</span>
            <div className="amount-field amount-field--review">
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
            <PersonSelect value={personValue} onChange={setPersonValue} suggestions={suggestions} onOpenChange={setPickerOpen} />
            {!personValue.personId && displayName && (
              <p className="new-person-hint">
                <SparkleIcon size={14} /> “{displayName}” ka naya khata ban jaayega
              </p>
            )}
            {selectedPerson && previousBalance != null && nextBalance != null && (
              <p className="record-note">
                <CheckIcon size={14} />
                <span>
                  Purana khata mila: <strong>{signedRupees(previousBalance)}</strong>
                  {previousBalance === 0 ? ' (clear)' : ''} → ab <strong>{signedRupees(nextBalance)}</strong>
                </span>
              </p>
            )}
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

          <div className="field-row">
            <div className="field-block grow">
              <span className="field-label">Kab?</span>
              <input
                type="date"
                className="field field-input"
                value={dateText}
                max={dateKey(new Date())}
                onChange={(e) => setDateText(e.target.value)}
              />
            </div>
            {preview && (
              <button type="button" className="thumb-button" onClick={() => setShowPreview(true)} aria-label="Screenshot dekho">
                <img src={preview} alt="Screenshot" />
              </button>
            )}
          </div>
        </section>

        {rawText && (
          <details className="raw-details">
            <summary>Screen par kya likha tha</summary>
            <pre>{rawText}</pre>
          </details>
        )}

        {!pickerOpen && (
          <div className="review-cta">
            <button type="button" className="btn btn-primary btn-block btn-save" onClick={save}>
              <CheckIcon size={19} /> Hisaab mein daalo
            </button>
          </div>
        )}

        {showPreview &&
          preview &&
          createPortal(
            <div className="lightbox" role="dialog" aria-modal="true" aria-label="Screenshot" onClick={() => setShowPreview(false)}>
              <img src={preview} alt="Screenshot" />
              <button type="button" className="lightbox-close" aria-label="Band karo">
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
        <div>
          <h1 className="page-title">Naya hisaab</h1>
          <p className="page-sub">Screenshot, chat ya khud likho</p>
        </div>
        <span className="smart-badge">
          <SparkleIcon size={14} /> Smart
        </span>
      </header>

      <Segmented
        value={mode}
        onChange={switchMode}
        ariaLabel="Hisaab kaise daalein"
        options={[
          { value: 'image', label: 'Screenshot', icon: <ImageIcon size={16} /> },
          { value: 'text', label: 'Chat / SMS', icon: <ClipboardIcon size={16} /> },
          { value: 'manual', label: 'Khud', icon: <PlusIcon size={16} /> },
        ]}
      />

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Band karo">
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {mode === 'image' && (
        <>
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
                {preview ? <img className="reading-thumb" src={preview} alt="Screenshot" /> : <div className="reading-thumb reading-thumb--empty" />}
                <div className="reading-body">
                  <span className="reading-title">
                    {progressText || 'Padh rahe hain…'}
                    {progress > 0.02 && progress < 1 ? ` · ${Math.round(progress * 100)}%` : ''}
                  </span>
                  <div className="progress" aria-hidden="true">
                    <span style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }} />
                  </div>
                  <span className="reading-sub">Sab kuch aapke phone mein hi hota hai · pehli baar engine load hota hai</span>
                </div>
              </div>
            ) : (
              <>
                <div className="dropzone-art">
                  <span className="dropzone-phone">
                    <span className="dropzone-line" />
                    <span className="dropzone-line short" />
                    <span className="dropzone-amount" />
                    <span className="dropzone-check">
                      <CheckIcon size={15} />
                    </span>
                  </span>
                  <span className="dropzone-spark">
                    <SparkleIcon size={20} />
                  </span>
                </div>
                <h2 className="dropzone-title">Payment ka screenshot bhejo</h2>
                <p className="dropzone-sub">
                  GPay, PhonePe, Paytm, BHIM, bank SMS — naam aur amount khud nikal lega.
                </p>
                <div className="dropzone-actions">
                  <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon size={18} /> Gallery se chuno
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => cameraInputRef.current?.click()}>
                    <CameraIcon size={18} /> Camera
                  </button>
                </div>
                <p className="dropzone-hint">
                  Ya screenshot clipboard se paste karo (Ctrl / ⌘ + V) · drag-drop bhi chalta hai
                </p>
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

          <div className="capability-card">
            <div className="capability-head">
              <SparkleIcon size={16} /> Yeh apps padh sakta hoon
            </div>
            <div className="app-logos">
              {['GPay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay', 'Bank SMS', 'WhatsApp'].map((a) => (
                <span key={a} className="app-logo">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {mode === 'text' && (
        <>
          <div className="text-card">
            <label className="field-label" htmlFor="chat-input">
              Message ya SMS paste karo
            </label>
            <textarea
              id="chat-input"
              ref={textAreaRef}
              className="text-area"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'Jaise:\nRahul: bhai 500 rupaye bhej de\n\nYa bank SMS:\nRs.500 debited from A/c XX1234 to VPA rahul@okaxis'}
              rows={7}
            />
            <div className="text-actions">
              <button type="button" className="btn btn-primary grow" onClick={() => runTextParse()}>
                <SparkleIcon size={18} /> Samjho
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (!text.trim()) {
                      toast('Clipboard khaali hai');
                      return;
                    }
                    setRawText(text);
                    runTextParse(text);
                  } catch {
                    toast('Clipboard padhne ki permission nahi mili — paste kar do');
                  }
                }}
              >
                <ClipboardIcon size={18} /> Paste
              </button>
            </div>
          </div>

          <div className="samples">
            <span className="samples-label">Try karne ke liye:</span>
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
        </>
      )}

      {mode === 'manual' && (
        <div className="manual-card">
          <div className="manual-art">
            <PlusIcon size={26} />
          </div>
          <h2>Khud hisaab likho</h2>
          <p>Amount, banda aur kisne diye — bas teen cheezein. Baaki optional.</p>
          <button type="button" className="btn btn-primary btn-block" onClick={startManual}>
            Form kholo
          </button>
        </div>
      )}

      <div className="scan-help">
        <div className="scan-help-item">
          <span>
            <SparkleIcon size={16} />
          </span>
          <p>
            <strong>Kya kaam karta hai:</strong> paisa kisne diya, kitna, kis bande ka, kis date ka — sab khud
            pehchanta hai. Purane khate mein add karta hai, naya banda ho toh naya khata banata hai.
          </p>
        </div>
      </div>
    </div>
  );
}
