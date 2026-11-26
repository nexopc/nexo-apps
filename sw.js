// Service worker NEXO: funciona sin internet y guarda CADA app en su propia caché.
// Así, actualizar una app (botón ⟳) borra solo su caché y no toca las demás ni a Harvey.
const CORE = 'nexo-core';
const scopeURL = new URL(self.registration.scope);

function cacheFor(url) {
  const rel = url.pathname.slice(scopeURL.pathname.length);
  const m = rel.match(/^apps\/([^/]+)\//);
  return m ? 'nexo-app-' + m[1] : CORE;
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('message', (e) => {
  if (e.data?.type === 'purge') e.waitUntil(caches.delete(e.data.scope === 'core' ? CORE : 'nexo-app-' + e.data.scope));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API de Claude, Firebase: siempre red
  // version.json y manifiestos: siempre buscar lo más nuevo en la red
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('.webmanifest')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request)));
    return;
  }
  // Resto: primero la caché de esa app (rápido y sin internet), si no está, red y se guarda.
  const name = cacheFor(url);
  e.respondWith(caches.open(name).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(e.request);
    if (res.ok) c.put(e.request, res.clone());
    return res;
  }));
});
