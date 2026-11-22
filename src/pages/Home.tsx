import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { personBalances, totals } from '../lib/calc';
import { rupees, signedRupees } from '../lib/format';
import { navigate } from '../lib/router';
import { useInstall } from '../lib/install';
import { assetUrl } from '../lib/assets';
import { PersonRow } from '../components/PersonRow';
import { TxnRow } from '../components/TxnRow';
import {
  CameraIcon,
  ChevronRightIcon,
  CloseIcon,
  DotsIcon,
  DownloadIcon,
  ImageIcon,
  PlusIcon,
  SparkleIcon,
  UsersIcon,
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
    return list
      .filter((r) => r.count > 0)
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || +(new Date(b.lastDate || 0)) - +(new Date(a.lastDate || 0)));
  }, [persons, txns]);

  const receive = rows.filter((r) => r.balance > 0).reduce((a, r) => a + r.balance, 0);
  const pay = rows.filter((r) => r.balance < 0).reduce((a, r) => a + Math.abs(r.balance), 0);
  const net = receive - pay;
  const openCount = rows.filter((r) => Math.abs(r.balance) > 0.009).length;
  const flow = totals(txns);
  const recent = [...txns].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 4);
  const name = state.profile.name || 'Aap';

  const dismissInstall = () => {
    localStorage.setItem('hk_install_dismissed', '1');
    setShowInstall(false);
  };

  return (
    <div className="page page--home">
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src={assetUrl('icons/icon-192.png')} alt="" width={42} height={42} />
          <div className="brand-text">
            <h1>HisaabKitaab</h1>
            <p>Namaste, {name.split(' ')[0]}</p>
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="Settings" onClick={() => navigate('settings')}>
          <DotsIcon size={22} />
        </button>
      </header>

      <section className={`hero ${net === 0 ? 'is-clear' : net > 0 ? 'is-positive' : 'is-negative'}`}>
        <div className="hero-motif" aria-hidden="true" />
        <div className="hero-top">
          <span className="hero-label">Kul hisaab</span>
          <span className="hero-date">
            {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <h2 className="hero-net">
          {net === 0 ? (
            <>Hisaab barabar hai</>
          ) : (
            <>
              {net > 0 ? 'Log aapko' : 'Aapko'} <span className="hero-figure">{rupees(Math.abs(net))}</span>{' '}
              {net > 0 ? 'denge' : 'dena hai'}
            </>
          )}
        </h2>
        <p className="hero-sub">
          {openCount > 0 ? `${openCount} logon ke saath hisaab baaki` : 'Sab clear hai — mast!'}
          {flow.people > 0 ? ` · ${flow.people} log jude` : ''}
        </p>
        <div className="hero-split">
          <div className="hero-split-item">
            <span className="dot dot--green" />
            <div>
              <span className="hero-split-label">Milna hai</span>
              <strong>{rupees(receive)}</strong>
            </div>
          </div>
          <div className="hero-split-item">
            <span className="dot dot--red" />
            <div>
              <span className="hero-split-label">Dena hai</span>
              <strong>{rupees(pay)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="quick-actions">
        <button type="button" className="quick-action" onClick={() => navigate('scan?mode=image')}>
          <span className="quick-icon quick-icon--saffron">
            <ImageIcon size={21} />
          </span>
          <span>Screenshot</span>
        </button>
        <button type="button" className="quick-action" onClick={() => navigate('scan?mode=text')}>
          <span className="quick-icon quick-icon--green">
            <SparkleIcon size={21} />
          </span>
          <span>Chat / SMS</span>
        </button>
        <button type="button" className="quick-action" onClick={() => navigate('scan?mode=manual')}>
          <span className="quick-icon quick-icon--ink">
            <PlusIcon size={21} />
          </span>
          <span>Manually</span>
        </button>
      </div>

      {canInstall && !installed && showInstall && (
        <div className="install-banner">
          <div className="install-icon">
            <DownloadIcon size={20} />
          </div>
          <div className="install-text">
            <strong>App ki tarah install karo</strong>
            <span>Home screen par icon, ek tap mein hisaab.</span>
          </div>
          <button
            type="button"
            className="btn btn-mini btn-primary"
            onClick={async () => {
              const result = await install();
              if (result === 'dismissed') toast('Koi baat nahi, baad mein install kar lena');
            }}
          >
            Install
          </button>
          <button type="button" className="icon-btn icon-btn--tight" onClick={dismissInstall} aria-label="Band karo">
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {ios && !installed && showInstall && !canInstall && (
        <div className="install-banner">
          <div className="install-icon">
            <DownloadIcon size={20} />
          </div>
          <div className="install-text">
            <strong>iPhone par install karo</strong>
            <span>Safari mein Share → “Add to Home Screen”.</span>
          </div>
          <button type="button" className="icon-btn icon-btn--tight" onClick={dismissInstall} aria-label="Band karo">
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {rows.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <h2>Aapke log</h2>
            <button type="button" className="text-btn" onClick={() => navigate('people')}>
              Sab dekho <ChevronRightIcon size={14} />
            </button>
          </div>
          <div className="list-card">
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
      ) : (
        <section className="start-card">
          <div className="start-illustration" aria-hidden="true">
            <span className="start-page" />
            <span className="start-check">
              <CameraIcon size={20} />
            </span>
          </div>
          <h2>Pehla hisaab, bas ek screenshot door</h2>
          <p>
            Payment screenshot ya WhatsApp ka message bhejo. Naam, amount aur kisne diya — sab khud samajh lega.
          </p>
          <ol className="start-steps">
            <li>
              <span>1</span> Screenshot ya chat daalo
            </li>
            <li>
              <span>2</span> Hisaab check karke save karo
            </li>
            <li>
              <span>3</span> Har bande ka khata apne aap ban jaayega
            </li>
          </ol>
          <div className="row gap-10">
            <button type="button" className="btn btn-primary grow" onClick={() => navigate('scan?mode=image')}>
              <CameraIcon size={18} /> Screenshot bhejo
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('people')}>
              <UsersIcon size={18} /> Log
            </button>
          </div>
          <button
            type="button"
            className="link-quiet"
            onClick={() => {
              loadSample();
              toast('Sample hisaab load ho gaya — try karke dekho');
            }}
          >
            Ya sample hisaab dekh lo
          </button>
        </section>
      )}

      {recent.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Haal ka hisaab</h2>
            <button type="button" className="text-btn" onClick={() => navigate('activity')}>
              Kitaab <ChevronRightIcon size={14} />
            </button>
          </div>
          <div className="list-card">
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

      {rows.length > 0 && (
        <section className="section">
          <div className="insight-card">
            <div className="insight-head">
              <span className="insight-icon">
                <SparkleIcon size={17} />
              </span>
              <span>Smart hisaab</span>
            </div>
            <p>
              Screenshot bhejte hi banda pehchanta hai aur purane khate mein add kar deta hai. Naya naam ho toh naya
              khata khud ban jaata hai.
            </p>
            <button type="button" className="btn btn-soft btn-block" onClick={() => navigate('scan?mode=image')}>
              Ek screenshot se try karo
            </button>
          </div>
        </section>
      )}

      {net !== 0 && (
        <p className="home-foot">{signedRupees(net)} ka net hisaab · sab kuch aapke phone mein</p>
      )}
    </div>
  );
}
