import { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './lib/store';
import { navigate, useRoute } from './lib/router';
import { consumeShare, setPendingShare } from './lib/share';
import { HomePage } from './pages/Home';
import { PeoplePage } from './pages/People';
import { ActivityPage } from './pages/Activity';
import { PersonDetailPage } from './pages/PersonDetail';
import { SettingsPage } from './pages/Settings';
import { ScanPage } from './pages/Scan';
import { OnboardingPage } from './pages/Onboarding';
import { BookIcon, HomeIcon, ScanIcon, SettingsIcon, UsersIcon } from './components/Icons';

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button type="button" className={`tab ${active ? 'is-active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TabBar({ active }: { active: string }) {
  return (
    <nav className="tabbar" aria-label="Main navigation">
      <TabButton active={active === 'home'} onClick={() => navigate('home')} icon={<HomeIcon size={22} />} label="Hisaab" />
      <TabButton active={active === 'activity'} onClick={() => navigate('activity')} icon={<BookIcon size={22} />} label="Kitaab" />
      <button
        type="button"
        className={`tab-scan ${active === 'scan' ? 'is-active' : ''}`}
        onClick={() => navigate('scan')}
        aria-label="Naya hisaab daalo"
      >
        <span className="tab-scan-circle">
          <ScanIcon size={25} />
        </span>
        <span>Naya</span>
      </button>
      <TabButton active={active === 'people'} onClick={() => navigate('people')} icon={<UsersIcon size={22} />} label="Log" />
      <TabButton active={active === 'settings'} onClick={() => navigate('settings')} icon={<SettingsIcon size={22} />} label="Aap" />
    </nav>
  );
}

function Shell() {
  const { state, toast } = useApp();
  const route = useRoute();
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get('share') === 'error') toast('Share kiya hua content padh nahi paaye');

    void (async () => {
      const payload = await consumeShare();
      if (!payload) return;
      setPendingShare(payload);
      const onScan = window.location.hash.includes('/scan');
      if (!onScan) {
        navigate(payload.file ? 'scan?mode=image' : 'scan?mode=text', true);
      } else {
        // Already on scan: force a re-mount so the payload is picked up.
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    })();
  }, [toast]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route.name, route.id]);

  if (!state.settings.onboarded) {
    return (
      <div className="app app--onboarding">
        <OnboardingPage />
      </div>
    );
  }

  const page = (() => {
    switch (route.name) {
      case 'people':
        return <PeoplePage route={route} />;
      case 'activity':
        return <ActivityPage />;
      case 'person':
        return <PersonDetailPage route={route} />;
      case 'settings':
        return <SettingsPage />;
      case 'scan':
        return <ScanPage key={route.query.get('mode') || 'image'} route={route} />;
      default:
        return <HomePage />;
    }
  })();

  const showTab = ['home', 'activity', 'people', 'settings', 'scan'].includes(route.name) && !(route.name === 'person');

  return (
    <div className="app">
      <main className={`app-main ${showTab ? 'has-tabbar' : ''}`} key={`${route.name}-${route.id || ''}`}>
        {page}
      </main>
      {showTab && <TabBar active={route.name} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
