// Service worker NEXO: funciona sin internet y guarda CADA app en su propia caché.
// v3 (27 nov 2026): RED PRIMERO. Con internet siempre carga lo más nuevo (revalida con el servidor);
// sin internet (o si la red tarda más de 3 s) usa la copia guardada. Así una actualización llega sola
// al abrir la app, sin depender del botón ⟳ (que sigue sirviendo para forzar la descarga).
const SW_VERSION = '3.0.0';
const CORE = 'nexo-core';
const scopeURL = new URL(self.registration.scope);

function cacheFor(url) {
  const rel = url.pathname.slice(scopeURL.pathname.length);
  const m = rel.match(/^apps\/([^/]+)\//);
  return m ? 'nexo-app-' + m[1] : CORE;
}

self.addEventListener('install', () => self.skipWaiting());
// Al estrenar esta versión se borran TODAS las copias viejas (núcleo y apps): nada viejo puede quedarse pegado.
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const done = await caches.match('/__nexo_sw_version__');
  if (!done || (await done.text()) !== SW_VERSION) {
    for (const k of await caches.keys()) await caches.delete(k);
    const c = await caches.open('nexo-meta'); await c.put('/__nexo_sw_version__', new Response(SW_VERSION));
  }
  await self.clients.claim();
})()));

self.addEventListener('message', (e) => {
  if (e.data?.type === 'purge') e.waitUntil(caches.delete(e.data.scope === 'core' ? CORE : 'nexo-app-' + e.data.scope));
});

const timeout = (ms) => new Promise((res) => setTimeout(() => res(null), ms));

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API de Claude y Supabase: siempre red
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('/sw.js')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }).catch(() => caches.match(e.request, { ignoreSearch: true })));
    return;
  }
  const name = cacheFor(url);
  e.respondWith((async () => {
    const c = await caches.open(name);
    // 'no-cache' = pregunta al servidor si cambió (si no cambió, responde rápido sin bajar todo)
    const net = fetch(e.request, { cache: 'no-cache' }).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => null);
    const first = await Promise.race([net, timeout(3000)]);
    if (first) return first;
    const hit = await c.match(e.request, { ignoreSearch: true });
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  })());
});
