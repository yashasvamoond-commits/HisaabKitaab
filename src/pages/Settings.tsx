import { useRef, useState } from 'react';
import { useApp } from '../lib/store';
import { downloadJson, readJsonFile } from '../lib/share';
import { isIOS, useInstall } from '../lib/install';
import { assetUrl } from '../lib/assets';
import { Avatar, ConfirmSheet } from '../components/ui';
import {
  CheckIcon,
  DownloadIcon,
  InfoIcon,
  PhoneIcon,
  RefreshIcon,
  ShieldIcon,
  SparkleIcon,
  UploadIcon,
} from '../components/Icons';

export function SettingsPage() {
  const { state, persons, txns, setProfile, loadSample, resetAll, importState, toast } = useApp();
  const { canInstall, installed, install } = useInstall();
  const [name, setName] = useState(state.profile.name);
  const [justSaved, setJustSaved] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ios = isIOS();

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast('Name cannot be empty');
      return;
    }
    setProfile({ name: trimmed });
    setJustSaved(true);
    toast('Name saved');
  };

  const onImport = async (file: File) => {
    try {
      const parsed = await readJsonFile(file);
      if (!Array.isArray(parsed.persons) || !Array.isArray(parsed.txns)) throw new Error('bad file');
      importState(parsed);
      toast('Backup restored');
    } catch {
      toast('That backup file could not be read');
    }
  };

  return (
    <div className="page page--settings">
      <header className="page-head">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Profile, data and app</p>
        </div>
      </header>

      <section className="card settings-card">
        <div className="settings-head">
          <h2>Profile</h2>
        </div>
        <div className="profile-row">
          <Avatar name={state.profile.name || 'You'} size={52} />
          <div className="profile-main">
            <label className="field-label" htmlFor="profile-name">
              Your name
            </label>
            <input
              id="profile-name"
              className="field field-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setJustSaved(false);
              }}
              placeholder="Your name"
              maxLength={40}
              autoComplete="name"
            />
          </div>
        </div>
        <p className="settings-hint">
          Payments made to this name are understood as money received.
        </p>
        {name.trim() !== state.profile.name ? (
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={saveName}
            disabled={!name.trim()}
          >
            <CheckIcon size={17} /> Save name
          </button>
        ) : justSaved ? (
          <p className="settings-saved">
            <CheckIcon size={14} /> Saved
          </p>
        ) : null}
      </section>

      <section className="card settings-card">
        <div className="settings-head">
          <h2>Install app</h2>
        </div>
        <div className="settings-row">
          <span className="settings-icon is-teal">
            <PhoneIcon size={19} />
          </span>
          <div className="settings-copy">
            <strong>{installed ? 'Installed' : 'Add to your home screen'}</strong>
            <span>
              {installed
                ? 'Open HisaabKitaab with one tap. It also works offline.'
                : 'No app store. Works on Android and iPhone.'}
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
                <>In Safari, tap the <strong>Share</strong> button</>
              ) : (
                <>Open this page in Chrome or Safari on your phone</>
              )}
            </li>
            <li>
              <span className="step-num">2</span>
              {ios ? (
                <>Choose <strong>Add to Home Screen</strong></>
              ) : (
                <>Tap the menu, then <strong>Install app</strong></>
              )}
            </li>
            <li>
              <span className="step-num">3</span>
              HisaabKitaab appears on your home screen
            </li>
          </ol>
        )}
      </section>

      <section className="card settings-card">
        <div className="settings-head">
          <h2>Data</h2>
          <span>
            {persons.length} {persons.length === 1 ? 'person' : 'people'} · {txns.length}{' '}
            {txns.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <button type="button" className="settings-action" onClick={() => downloadJson(state)}>
          <span className="settings-icon is-teal">
            <DownloadIcon size={18} />
          </span>
          <span className="settings-action-text">
            <strong>Back up data</strong>
            <em>Download a backup file</em>
          </span>
        </button>
        <button type="button" className="settings-action" onClick={() => fileRef.current?.click()}>
          <span className="settings-icon is-blue">
            <UploadIcon size={18} />
          </span>
          <span className="settings-action-text">
            <strong>Restore backup</strong>
            <em>Choose a backup file</em>
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
          <span className="settings-icon is-amber">
            <SparkleIcon size={18} />
          </span>
          <span className="settings-action-text">
            <strong>Load sample data</strong>
            <em>Try the app with example people</em>
          </span>
        </button>
        <button type="button" className="settings-action" onClick={() => setResetOpen(true)}>
          <span className="settings-icon is-red">
            <RefreshIcon size={18} />
          </span>
          <span className="settings-action-text">
            <strong>Reset everything</strong>
            <em>Delete all people and expenses</em>
          </span>
        </button>
      </section>

      <section className="card settings-card">
        <div className="settings-head">
          <h2>About</h2>
        </div>
        <div className="about-row">
          <img src={assetUrl('icons/icon-192.png')} alt="" width={44} height={44} className="about-icon" />
          <div>
            <strong>HisaabKitaab</strong>
            <p>Version 1.0 · Shared expenses, made simple.</p>
          </div>
        </div>
        <div className="assurance">
          <ShieldIcon size={18} />
          <p>Data stays on this device. Screenshots are read on your phone. No account, no server.</p>
        </div>
      </section>

      <p className="settings-foot">
        <InfoIcon size={13} /> Made for everyday shared expenses
      </p>

      <ConfirmSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset everything?"
        body={<p>All people and expenses will be deleted permanently. Back up first if you want to keep them.</p>}
        confirmLabel="Delete everything"
        danger
        onConfirm={() => {
          resetAll();
          toast('All data deleted');
        }}
      />

      <ConfirmSheet
        open={sampleOpen}
        onClose={() => setSampleOpen(false)}
        title="Load sample data?"
        body={<p>This replaces your current data with example people and expenses.</p>}
        confirmLabel="Load sample"
        onConfirm={() => {
          loadSample();
          toast('Sample data loaded');
        }}
      />
    </div>
  );
}
