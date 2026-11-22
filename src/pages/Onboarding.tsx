import { useState } from 'react';
import { useApp } from '../lib/store';
import { assetUrl } from '../lib/assets';
import { CheckIcon, ShieldIcon, SparkleIcon, WhatsAppIcon } from '../components/Icons';

export function OnboardingPage() {
  const { finishOnboarding, loadSample, toast } = useApp();
  const [name, setName] = useState('');

  return (
    <div className="onboarding">
      <div className="onboarding-glow" aria-hidden="true" />
      <header className="onboarding-brand">
        <img src={assetUrl('icons/icon-192.png')} alt="" width={44} height={44} />
        <span>HisaabKitaab</span>
      </header>

      <div className="onboarding-hero">
        <span className="onboarding-eyebrow">
          <SparkleIcon size={14} /> Screenshot se hisaab
        </span>
        <h1>
          Apna hisaab,
          <br />
          apni <span className="accent">zubaani</span>
        </h1>
        <p className="onboarding-hindi">अपना हिसाब, अपनी ज़ुबानी</p>
        <p className="onboarding-lede">
          Doston, family aur dukaandaar ke saath paise ka hisaab. Screenshot ya chat bhejo — naam, amount aur kisne
          diya, sab khud samajh jaata hai.
        </p>
      </div>

      <div className="onboarding-art" aria-hidden="true">
        <span className="art-phone">
          <span className="art-top">GPay</span>
          <span className="art-amount">₹250</span>
          <span className="art-to">To Rahul Sharma</span>
          <span className="art-row">
            <CheckIcon size={13} /> Payment successful
          </span>
        </span>
        <span className="art-chip art-chip--top">
          <span className="art-dot" /> Rahul ka khata
        </span>
        <span className="art-chip art-chip--bottom">
          <span className="art-tick">
            <CheckIcon size={12} />
          </span>
          Purane hisaab mein add
        </span>
      </div>

      <div className="onboarding-features">
        <div>
          <CheckIcon size={16} /> Screenshot, SMS aur WhatsApp — sab chalta hai
        </div>
        <div>
          <CheckIcon size={16} /> Naya banda? Khata khud ban jaata hai
        </div>
        <div>
          <CheckIcon size={16} /> Offline, bina login, data aapke phone mein
        </div>
      </div>

      <div className="onboarding-form">
        <label htmlFor="onboarding-name">Aapka naam?</label>
        <input
          id="onboarding-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jaise: Yashasva"
          maxLength={40}
          autoComplete="given-name"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === 'Enter') finishOnboarding(name);
          }}
        />
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => finishOnboarding(name)}>
          Shuru karo
        </button>
        <button
          type="button"
          className="link-quiet"
          onClick={() => {
            finishOnboarding(name || 'Aap');
            loadSample();
            toast('Sample hisaab load ho gaya — apna data baad mein daalna');
          }}
        >
          Pehle sample hisaab dekho
        </button>
      </div>

      <footer className="onboarding-foot">
        <span>
          <ShieldIcon size={14} /> Free · No login · Made in India
        </span>
        <span>
          <WhatsAppIcon size={13} /> Polite reminders
        </span>
      </footer>
    </div>
  );
}
