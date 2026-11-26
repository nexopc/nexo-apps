// Service worker NEXO: funciona sin internet y guarda CADA app en su propia caché.
// Así, actualizar una app (botón ⟳) borra solo su caché y no toca las demás ni a Harvey.
const CORE = 'nexo-core';
// v2: el núcleo se actualiza solo en segundo plano
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
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API de Claude y Supabase: siempre red
  // version.json y manifiestos: siempre buscar lo más nuevo en la red
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('.webmanifest')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request)));
    return;
  }
  const name = cacheFor(url);
  // Núcleo compartido (core/ y el Hub): responde con la caché y se actualiza solo en segundo plano,
  // así un arreglo del núcleo llega a todas las apps al volver a abrirlas.
  if (name === CORE) {
    e.respondWith(caches.open(CORE).then(async (c) => {
      const hit = await c.match(e.request, { ignoreSearch: true });
      const net = fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || Response.error();
    }));
    return;
  }
  // Cada app: primero su caché (rápido y sin internet); se renueva con su botón ⟳.
  e.respondWith(caches.open(name).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) return hit;
    const res = await fetch(e.request);
    if (res.ok) c.put(e.request, res.clone());
    return res;
  }));
});
