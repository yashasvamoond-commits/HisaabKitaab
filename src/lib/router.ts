import { useEffect, useState } from 'react';

export type RouteName = 'home' | 'activity' | 'people' | 'person' | 'settings' | 'scan';

export interface Route {
  name: RouteName;
  id?: string;
  query: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, qs] = raw.split('?');
  const query = new URLSearchParams(qs || '');
  const [name, id] = path.split('/').filter(Boolean);
  const known: RouteName[] = ['home', 'activity', 'people', 'person', 'settings', 'scan'];
  const safe = (known.includes(name as RouteName) ? name : 'home') as RouteName;
  return { name: safe, id, query };
}

export function navigate(to: string, replace = false) {
  const target = to.startsWith('#') ? to : `#/${to.replace(/^\/+/, '')}`;
  if (replace) {
    const url = `${location.pathname}${location.search}${target}`;
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else if (location.hash !== target) {
    location.hash = target;
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash());
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
