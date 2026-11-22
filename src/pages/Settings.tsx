import { useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { downloadJson, readJsonFile } from '../lib/share';
import { isIOS, useInstall } from '../lib/install';
import { assetUrl } from '../lib/assets';
import { Avatar, ConfirmSheet, Segmented } from '../components/ui';
import {
  BookIcon,
  CameraIcon,
  CheckIcon,
  DownloadIcon,
  InfoIcon,
  PhoneIcon,
  RefreshIcon,
  RupeeIcon,
  ShieldIcon,
  SparkleIcon,
  UploadIcon,
  UserIcon,
  WhatsAppIcon,
} from '../components/Icons';

export function SettingsPage() {
  const { state, persons, txns, setProfile, loadSample, resetAll, importState, toast } = useApp();
  const { canInstall, installed, install } = useInstall();
  const [name, setName] = useState(state.profile.name);
  const [resetOpen, setResetOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'data' | 'how'>('data');
  const fileRef = useRef<HTMLInputElement>(null);
  const ios = isIOS();

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast('Naam khaali nahi ho sakta');
      return;
    }
    setProfile({ name: trimmed });
    toast('Naam save ho gaya');
  };

  const onImport = async (file: File) => {
    try {
      const parsed = await readJsonFile(file);
      if (!Array.isArray(parsed.persons) || !Array.isArray(parsed.txns)) throw new Error('bad file');
      importState(parsed);
      toast('Backup wapas aa gaya');
    } catch {
      toast('Yeh backup file theek nahi lag rahi');
    }
  };

  return (
    <div className="page page--settings">
      <header className="topbar">
        <div>
          <h1 className="page-title">Aap</h1>
          <p className="page-sub">Profile, backup aur app</p>
        </div>
      </header>

      <section className="profile-card">
        <Avatar name={state.profile.name || 'Aap'} size={58} />
        <div className="profile-main">
          <span className="profile-label">Aapka naam</span>
          <input
            className="profile-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Apna naam likho"
            maxLength={40}
            aria-label="Aapka naam"
          />
          <span className="profile-hint">Reminders mein yahi naam use hota hai</span>
        </div>
        <button type="button" className="btn btn-mini btn-primary" onClick={saveName} disabled={name.trim() === state.profile.name}>
          <CheckIcon size={16} /> Save
        </button>
      </section>

      <section className="settings-card install-card">
        <div className="settings-row">
          <span className="settings-icon settings-icon--saffron">
            <PhoneIcon size={20} />
          </span>
          <div className="settings-copy">
            <strong>{installed ? 'App install hai' : 'Phone mein app ki tarah rakho'}</strong>
            <span>
              {installed
                ? 'Home screen se seedha khul jaata hai, offline bhi chalta hai.'
                : 'Home screen par install karo — na Play Store, na App Store.'}
            </span>
          </div>
          {!installed && canInstall && (
            <button type="button" className="btn btn-mini btn-primary" onClick={() => install()}>
              Install
            </button>
          )}
        </div>
        {!installed && !canInstall && (
          <ol className="install-steps">
            <li>
              <span className="step-num">1</span>
              {ios ? (
                <>Safari mein neeche <strong>Share</strong> button dabao (upar teer wala)</>
              ) : (
                <>Chrome mein upar right ke <strong>⋮</strong> menu mein jao</>
              )}
            </li>
            <li>
              <span className="step-num">2</span>
              {ios ? (
                <><strong>Add to Home Screen</strong> chuno</>
              ) : (
                <><strong>Install app</strong> ya <strong>Add to Home screen</strong> chuno</>
              )}
            </li>
            <li>
              <span className="step-num">3</span>
              Bas — icon home screen par aa jaayega
            </li>
          </ol>
        )}
        <p className="settings-note">
          <SparkleIcon size={14} /> PWA hai — iOS aur Android dono par ek hi link se chalta hai.
        </p>
      </section>

      <Segmented
        value={activeSection}
        onChange={setActiveSection}
        options={[
          { value: 'data', label: 'Data & backup' },
          { value: 'how', label: 'Kaise chalta hai' },
        ]}
      />

      {activeSection === 'data' ? (
        <>
          <section className="settings-card">
            <div className="settings-head">
              <h2>Data</h2>
              <span>{persons.length} log · {txns.length} hisaab</span>
            </div>
            <button type="button" className="settings-action" onClick={() => downloadJson(state)}>
              <span className="settings-icon settings-icon--green">
                <DownloadIcon size={19} />
              </span>
              <span className="settings-action-text">
                <strong>Backup banao</strong>
                <em>JSON file download hogi</em>
              </span>
            </button>
            <button type="button" className="settings-action" onClick={() => fileRef.current?.click()}>
              <span className="settings-icon settings-icon--ink">
                <UploadIcon size={19} />
              </span>
              <span className="settings-action-text">
                <strong>Backup wapas lao</strong>
                <em>Purani JSON file chuno</em>
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = '';
              }}
            />
            <button type="button" className="settings-action" onClick={() => setSampleOpen(true)}>
              <span className="settings-icon settings-icon--rose">
                <SparkleIcon size={19} />
              </span>
              <span className="settings-action-text">
                <strong>Sample hisaab dekho</strong>
                <em>Nakli data se app try karo</em>
              </span>
            </button>
            <button type="button" className="settings-action" onClick={() => setResetOpen(true)}>
              <span className="settings-icon settings-icon--red">
                <RefreshIcon size={19} />
              </span>
              <span className="settings-action-text">
                <strong>Sab kuch reset karo</strong>
                <em>Saara hisaab mit jaayega</em>
              </span>
            </button>
          </section>

          <section className="settings-card">
            <div className="settings-head">
              <h2>Aapki app</h2>
              <span>v1.0</span>
            </div>
            <div className="about-row">
              <img src={assetUrl('icons/icon-192.png')} alt="" width={44} height={44} className="about-icon" />
              <div>
                <strong>HisaabKitaab</strong>
                <p>Apna hisaab, apni zubaani. Banaya gaya India mein.</p>
              </div>
            </div>
            <p className="settings-note settings-note--block">
              Saara data sirf aapke phone mein rehta hai. Koi login nahi, koi server nahi. Backup file se hi data
              doosre phone par ja sakta hai.
            </p>
          </section>
        </>
      ) : (
        <>
          <section className="settings-card">
            <div className="settings-head">
              <h2>Screenshot se hisaab</h2>
            </div>
            <ol className="how-steps">
              <li>
                <span className="how-icon"><CameraIcon size={19} /></span>
                <div>
                  <strong>Screenshot ya chat daalo</strong>
                  <p>GPay, PhonePe, Paytm, bank SMS ya WhatsApp — sab padh leta hai.</p>
                </div>
              </li>
              <li>
                <span className="how-icon"><SparkleIcon size={19} /></span>
                <div>
                  <strong>Naam, amount aur kisne diya — khud samajhta hai</strong>
                  <p>Jo samajh aaya woh dikha deta hai, taaki aap check kar sako.</p>
                </div>
              </li>
              <li>
                <span className="how-icon"><UserIcon size={19} /></span>
                <div>
                  <strong>Purana khata milta hai, naya khud banta hai</strong>
                  <p>Rahul ka hisaab pehle se hai toh usi mein add, nahi toh naya khata.</p>
                </div>
              </li>
              <li>
                <span className="how-icon"><RupeeIcon size={19} /></span>
                <div>
                  <strong>Milna ya dena — seedha saaf</strong>
                  <p>Har banda ka balance, poora kitaab, aur polite WhatsApp reminder.</p>
                </div>
              </li>
            </ol>
          </section>

          <section className="settings-card">
            <div className="settings-head">
              <h2>Bharosa</h2>
            </div>
            <div className="assurance">
              <ShieldIcon size={20} />
              <div>
                <strong>Aapka data aapke paas</strong>
                <p>Screenshot OCR bhi phone par hi hota hai — internet par kuch nahi jaata.</p>
              </div>
            </div>
            <div className="assurance">
              <WhatsAppIcon size={20} />
              <div>
                <strong>Koi awkward reminder nahi</strong>
                <p>Polite Hinglish message khud ban jaata hai, aap bhejne se pehle padh sakte ho.</p>
              </div>
            </div>
            <div className="assurance">
              <BookIcon size={20} />
              <div>
                <strong>Offline chalta hai</strong>
                <p>Ek baar khulne ke baad internet ke bina bhi hisaab likh sakte ho.</p>
              </div>
            </div>
          </section>
        </>
      )}

      <p className="settings-foot">
        <InfoIcon size={14} /> HisaabKitaab · v1.0 · made for real Indian hisaab
      </p>

      <ConfirmSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Sab kuch mita dein?"
        body={<p>Saare log aur hisaab hamesha ke liye delete ho jaayenge. Pehle backup bana lo toh behtar hai.</p>}
        confirmLabel="Haan, sab mitao"
        danger
        onConfirm={() => {
          resetAll();
          toast('Sab clear. Naya hisaab shuru karo.');
        }}
      />

      <ConfirmSheet
        open={sampleOpen}
        onClose={() => setSampleOpen(false)}
        title="Sample hisaab load karein?"
        body={<p>Yeh aapka abhi ka data replace kar dega (dost sample ke liye). Pehle backup bana sakte ho.</p>}
        confirmLabel="Haan, sample dikhao"
        onConfirm={() => {
          loadSample();
          toast('Sample hisaab load ho gaya');
        }}
      />
    </div>
  );
}
