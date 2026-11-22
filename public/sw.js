/* HisaabKitaab service worker: offline app shell + Android share-target inbox. */
const VERSION = 'hk-v1';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const SHARE_CACHE = 'hk-share-inbox';

const scopeUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) =>
        cache.addAll([scopeUrl('./'), scopeUrl('index.html'), scopeUrl('manifest.json'), scopeUrl('icons/icon-192.png'), scopeUrl('icons/icon-512.png')]),
      )
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== SHELL && key !== RUNTIME && key !== SHARE_CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

async function handleShare(request) {
  try {
    const form = await request.formData();
    const text = [form.get('text'), form.get('title')].filter(Boolean).join('\n').trim();
    const url = form.get('url') || '';
    const cache = await caches.open(SHARE_CACHE);

    const files = [];
    for (const [, value] of form.entries()) {
      if (value && typeof value === 'object' && typeof value.size === 'number' && value.size > 0) {
        const index = files.length;
        await cache.put(
          scopeUrl(`__share-file-${index}`),
          new Response(value, {
            headers: {
              'Content-Type': value.type || 'application/octet-stream',
              'X-File-Name': encodeURIComponent(value.name || `share-${index}.png`),
            },
          }),
        );
        files.push({ name: value.name || `share-${index}.png`, type: value.type || 'image/*' });
        if (files.length >= 3) break;
      }
    }

    await cache.put(
      scopeUrl('__share-meta'),
      new Response(JSON.stringify({ text, url, files, at: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    return Response.redirect(scopeUrl('./?share=1'), 303);
  } catch (err) {
    return Response.redirect(scopeUrl('./?share=error'), 303);
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    event.respondWith(handleShare(request));
    return;
  }

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Navigations: network first, offline shell fallback (SPA hashes keep the same document).
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(SHELL);
          cache.put(scopeUrl('index.html'), response.clone()).catch(() => undefined);
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match(scopeUrl('index.html'));
          if (shell) return shell;
          return new Response('Offline. HisaabKitaab ko ek baar online khol lijiye.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })(),
    );
    return;
  }

  // OCR engine + models are big and immutable → cache first.
  if (url.pathname.includes('/ocr/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(RUNTIME);
          cache.put(request, response.clone()).catch(() => undefined);
        }
        return response;
      })(),
    );
    return;
  }

  // Everything else: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            caches
              .open(RUNTIME)
              .then((cache) => cache.put(request, response.clone()))
              .catch(() => undefined);
          }
          return response;
        })
        .catch(() => undefined);
      return cached || (await network) || new Response('Offline', { status: 503 });
    })(),
  );
});
