import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { personBalances } from '../lib/calc';
import { rupees } from '../lib/format';
import { navigate } from '../lib/router';
import { useInstall } from '../lib/install';
import { assetUrl } from '../lib/assets';
import { PersonRow } from '../components/PersonRow';
import { TxnRow } from '../components/TxnRow';
import { Avatar } from '../components/ui';
import {
  CameraIcon,
  ChevronRightIcon,
  ClipboardIcon,
  CloseIcon,
  DownloadIcon,
  ImageIcon,
  PlusIcon,
  ShieldIcon,
} from '../components/Icons';

export function HomePage() {
  const { state, persons, txns, loadSample, toast } = useApp();
  const { canInstall, installed, install, ios } = useInstall();
  const [showInstall, setShowInstall] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('hk_install_dismissed') === '1') setShowInstall(false);
  }, []);

  const rows = useMemo(() => {
    const list = personBalances(persons, txns);
    return list.sort(
      (a, b) =>
        Math.abs(b.balance) - Math.abs(a.balance) ||
        +(new Date(b.lastDate || 0)) - +(new Date(a.lastDate || 0)) ||
        a.person.name.localeCompare(b.person.name),
    );
  }, [persons, txns]);

  const receive = rows.filter((r) => r.balance > 0).reduce((a, r) => a + r.balance, 0);
  const pay = rows.filter((r) => r.balance < 0).reduce((a, r) => a + Math.abs(r.balance), 0);
  const net = receive - pay;
  const openCount = rows.filter((r) => Math.abs(r.balance) > 0.009).length;
  const recent = [...txns].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 4);
  const hasData = txns.length > 0;
  const firstName = (state.profile.name || 'You').split(' ')[0];

  const dismissInstall = () => {
    localStorage.setItem('hk_install_dismissed', '1');
    setShowInstall(false);
  };

  return (
    <div className="page page--home">
      <header className="app-header">
        <div className="brand">
          <img className="brand-mark" src={assetUrl('icons/icon-192.png')} alt="" width={36} height={36} />
          <div className="brand-text">
            <span className="brand-name">HisaabKitaab</span>
            <span className="brand-tag">Shared expenses</span>
          </div>
        </div>
        <button type="button" className="avatar-btn" aria-label="Settings" onClick={() => navigate('settings')}>
          <Avatar name={state.profile.name || 'You'} size={34} />
        </button>
      </header>

      <section className="balance-card">
        <div className="balance-head">
          <span className="balance-label">Total balance</span>
          <span className="balance-date">
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <h2 className={`balance-title ${!hasData ? 'is-muted' : net > 0.009 ? 'is-pos' : net < -0.009 ? 'is-neg' : 'is-clear'}`}>
          {!hasData ? (
            'No expenses yet'
          ) : net > 0.009 ? (
            <>
              You are owed <strong>{rupees(net)}</strong>
            </>
          ) : net < -0.009 ? (
            <>
              You owe <strong>{rupees(Math.abs(net))}</strong>
            </>
          ) : (
            'All settled up'
          )}
        </h2>
        <p className="balance-sub">
          {!hasData
            ? `Welcome, ${firstName}. Add your first expense below.`
            : openCount > 0
              ? `Across ${openCount} ${openCount === 1 ? 'person' : 'people'}`
              : 'Nothing left to settle'}
        </p>

        <div className="balance-cols">
          <div className="balance-col is-pos">
            <span className="balance-dot" />
            <div className="balance-col-text">
              <span>You are owed</span>
              <strong>{rupees(receive)}</strong>
            </div>
          </div>
          <div className="balance-col is-neg">
            <span className="balance-dot" />
            <div className="balance-col-text">
              <span>You owe</span>
              <strong>{rupees(pay)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="quick-row">
        <button type="button" className="quick-tile" onClick={() => navigate('scan?mode=image')}>
          <span className="quick-icon is-teal">
            <ImageIcon size={21} />
          </span>
          <span>Screenshot</span>
        </button>
        <button type="button" className="quick-tile" onClick={() => navigate('scan?mode=text')}>
          <span className="quick-icon is-blue">
            <ClipboardIcon size={21} />
          </span>
          <span>Message</span>
        </button>
        <button type="button" className="quick-tile" onClick={() => navigate('scan?mode=manual')}>
          <span className="quick-icon is-gray">
            <PlusIcon size={21} />
          </span>
          <span>Manual</span>
        </button>
      </div>

      {showInstall && !installed && (canInstall || ios) && (
        <div className="install-banner">
          <span className="install-icon">
            <DownloadIcon size={19} />
          </span>
          <div className="install-text">
            <strong>{ios ? 'Install on iPhone' : 'Install the app'}</strong>
            <span>
              {ios ? 'Tap Share, then “Add to Home Screen”.' : 'One tap from your home screen, works offline.'}
            </span>
          </div>
          {canInstall && (
            <button
              type="button"
              className="btn btn-mini btn-primary"
              onClick={async () => {
                const result = await install();
                if (result === 'dismissed') toast('You can install anytime from Settings');
              }}
            >
              Install
            </button>
          )}
          <button type="button" className="icon-btn icon-btn--tight" onClick={dismissInstall} aria-label="Dismiss">
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {persons.length === 0 && !hasData ? (
        <section className="onboard-card">
          <div className="onboard-icon">
            <CameraIcon size={24} />
          </div>
          <h2>Start with a screenshot</h2>
          <p>Upload a payment screenshot or paste a message. We fill in the amount, the person and who paid.</p>
          <div className="onboard-steps">
            <div className="onboard-step">
              <span>1</span>
              <p>Add a screenshot or message</p>
            </div>
            <div className="onboard-step">
              <span>2</span>
              <p>Check the details we found</p>
            </div>
            <div className="onboard-step">
              <span>3</span>
              <p>Save and keep the balance right</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={() => navigate('scan?mode=image')}>
            <CameraIcon size={18} /> Add from screenshot
          </button>
          <button
            type="button"
            className="link-quiet"
            onClick={() => {
              loadSample();
              toast('Sample data added');
            }}
          >
            Or explore with sample data
          </button>
        </section>
      ) : (
        <>
          {rows.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2>People</h2>
                <button type="button" className="link-btn" onClick={() => navigate('people')}>
                  View all <ChevronRightIcon size={14} />
                </button>
              </div>
              <div className="card list-card">
                {rows.slice(0, 5).map((r) => (
                  <PersonRow
                    key={r.person.id}
                    person={r.person}
                    txns={txns}
                    lastDate={r.lastDate}
                    onClick={() => navigate(`person/${r.person.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {recent.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2>Recent activity</h2>
                <button type="button" className="link-btn" onClick={() => navigate('activity')}>
                  View all <ChevronRightIcon size={14} />
                </button>
              </div>
              <div className="card list-card">
                {recent.map((t) => {
                  const person = persons.find((p) => p.id === t.personId);
                  return (
                    <TxnRow
                      key={t.id}
                      txn={t}
                      personName={person?.name}
                      showPerson
                      onClick={() => navigate(`person/${t.personId}`)}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <p className="home-foot">
        <ShieldIcon size={13} /> All data stays on this device
      </p>
    </div>
  );
}
