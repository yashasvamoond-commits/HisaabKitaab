import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let cachedPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    cachedPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((l) => l(true));
  });
  window.addEventListener('appinstalled', () => {
    cachedPrompt = null;
    listeners.forEach((l) => l(false));
  });
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function useInstall() {
  const [canInstall, setCanInstall] = useState(!!cachedPrompt);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const listener = (available: boolean) => {
      setCanInstall(available);
      setInstalled(isStandalone());
    };
    listeners.add(listener);
    const media = window.matchMedia?.('(display-mode: standalone)');
    const onChange = () => setInstalled(isStandalone());
    media?.addEventListener?.('change', onChange);
    return () => {
      listeners.delete(listener);
      media?.removeEventListener?.('change', onChange);
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!cachedPrompt) return 'unavailable';
    await cachedPrompt.prompt();
    const choice = await cachedPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      cachedPrompt = null;
      setCanInstall(false);
      setInstalled(true);
    }
    return choice.outcome;
  };

  return { canInstall, installed, install, ios: isIOS() };
}
