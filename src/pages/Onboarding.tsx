import { useState } from 'react';
import { useApp } from '../lib/store';
import { assetUrl } from '../lib/assets';
import { CheckIcon, ImageIcon, ShieldIcon, UsersIcon } from '../components/Icons';

export function OnboardingPage() {
  const { finishOnboarding, loadSample, toast } = useApp();
  const [name, setName] = useState('');
  const valid = name.trim().length >= 2;

  return (
    <div className="onboarding">
      <header className="onboarding-brand">
        <img src={assetUrl('icons/icon-192.png')} alt="" width={40} height={40} />
        <span>HisaabKitaab</span>
      </header>

      <div className="onboarding-hero">
        <h1>
          Shared expenses,
          <br />
          settled simply.
        </h1>
        <p>Track who paid, who owes, and settle up — without the awkward math.</p>
      </div>

      <div className="onboarding-art" aria-hidden="true">
        <span className="art-phone">
          <span className="art-top">
            <span className="art-dot" /> PhonePe
          </span>
          <span className="art-amount">₹250</span>
          <span className="art-to">Paid to Rahul Sharma</span>
          <span className="art-row">
            <CheckIcon size={13} /> Payment successful
          </span>
        </span>
        <span className="art-chip art-chip--top">Rahul owes you ₹250</span>
        <span className="art-chip art-chip--bottom">
          <span className="art-tick">
            <CheckIcon size={12} />
          </span>
          Added to history
        </span>
      </div>

      <div className="onboarding-features">
        <div>
          <span className="feature-icon">
            <ImageIcon size={17} />
          </span>
          <p>Reads UPI screenshots and bank messages</p>
        </div>
        <div>
          <span className="feature-icon">
            <UsersIcon size={17} />
          </span>
          <p>Keeps every balance up to date</p>
        </div>
        <div>
          <span className="feature-icon">
            <ShieldIcon size={17} />
          </span>
          <p>Works offline. Your data stays on your phone.</p>
        </div>
      </div>

      <div className="onboarding-form">
        <label htmlFor="onboarding-name">What should we call you?</label>
        <input
          id="onboarding-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          autoComplete="given-name"
          enterKeyHint="done"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) finishOnboarding(name);
          }}
        />
        <p className="onboarding-note">Used to recognise payments made to you. You can change it later.</p>
        <button
          type="button"
          className="btn btn-primary btn-block btn-lg"
          onClick={() => finishOnboarding(name)}
          disabled={!valid}
        >
          Get started
        </button>
        <button
          type="button"
          className="link-quiet"
          onClick={() => {
            finishOnboarding(name || 'You');
            loadSample();
            toast('Sample data loaded');
          }}
        >
          Explore with sample data
        </button>
      </div>

      <footer className="onboarding-foot">No login · Free · Works offline</footer>
    </div>
  );
}
