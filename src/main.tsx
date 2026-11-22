import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/baloo-2';
import '@fontsource-variable/inter';
import './styles.css';
import App from './App';

// Free deed.page hosting shows a small badge in the bottom-right corner.
// Mark the host so the tab bar can sit above it instead of underneath.
if (window.location.hostname.endsWith('.deed.page')) {
  document.documentElement.dataset.host = 'deed';
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', document.baseURI).href;
    navigator.serviceWorker
      .register(swUrl, { scope: new URL('./', document.baseURI).pathname })
      .catch((err) => console.warn('Service worker register failed', err));
  });
}
