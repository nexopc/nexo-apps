// Sincronización de NEXO Brain con Supabase.
// - Un solo inicio de sesión (Google) para todas las apps: la sesión se guarda en el navegador y la comparten.
// - Al entrar: sube lo que solo estaba en este dispositivo y baja lo que hay en la nube.
// - Tiempo real: un cambio en el celular llega al PC en segundos (y al revés).
// - Sin internet: los cambios esperan en una cola y se suben al volver la señal.
import { store } from './store.js';
import { SUPABASE_URL, SUPABASE_KEY, hasCloud } from './config.js';

const QKEY = 'nexo:sync:queue';
const LAST = 'nexo:sync:last';
let sb = null, user = null, channel = null, flushing = false, loading = null;
const authListeners = new Set();
const statusListeners = new Set();
let status = 'local'; // local | conectando | sincronizado | sin-internet | error

const setStatus = (s) => { status = s; statusListeners.forEach((f) => { try { f(s); } catch {} }); };
const readQ = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '{}'); } catch { return {}; } };
const writeQ = (q) => { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch {} };
const rowOf = (col, rec) => ({ coleccion: col, id: rec.id, data: rec, borrado: !!rec._deleted, updated_at: rec.updatedAt || new Date().toISOString() });

async function load() {
  if (sb || !hasCloud()) return sb;
  if (loading) return loading;
  loading = (async () => {
    const { createClient } = await import('./vendor/supabase.js');
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      const changed = (u?.id || null) !== (user?.id || null);
      user = u;
      if (changed) { u ? start() : stop(); authListeners.forEach((f) => { try { f(u); } catch {} }); }
    });
    const { data } = await sb.auth.getSession();
    if (data.session && !user) { user = data.session.user; start(); authListeners.forEach((f) => f(user)); }
    if (!user) setStatus('local');
    return sb;
  })();
  return loading;
}

// Cola de cambios: se guarda primero aquí y luego se sube (así nada se pierde sin internet).
function enqueue(col, rec) {
  const q = readQ(); q[col + '/' + rec.id] = rowOf(col, rec); writeQ(q);
  flush();
}
async function flush() {
  if (!sb || !user || flushing) return;
  const q = readQ(); const rows = Object.values(q); if (!rows.length) return;
  flushing = true;
  try {
    for (let i = 0; i < rows.length; i += 200) {
      const part = rows.slice(i, i + 200);
      const { error } = await sb.from('registros').upsert(part, { onConflict: 'user_id,coleccion,id' });
      if (error) throw error;
      const now = readQ(); part.forEach((r) => { const k = r.coleccion + '/' + r.id; if (now[k]?.updated_at === r.updated_at) delete now[k]; }); writeQ(now);
    }
    setStatus('sincronizado');
  } catch (e) { setStatus(navigator.onLine ? 'error' : 'sin-internet'); console.warn('sync', e); flushing = false; setTimeout(flush, 15000); return; }
  flushing = false;
  // Si mientras subíamos llegaron más cambios, subirlos también
  if (Object.keys(readQ()).length) setTimeout(flush, 300);
}

async function pull() {
  const since = localStorage.getItem(LAST + ':' + user.id) || '1970-01-01T00:00:00Z';
  let from = 0; let newest = since;
  for (;;) {
    const { data, error } = await sb.from('registros').select('coleccion,id,data,borrado,updated_at').gt('updated_at', since).order('updated_at').range(from, from + 999);
    if (error) throw error;
    for (const r of data) { store.mergeRemote(r.coleccion, { ...r.data, _deleted: r.borrado || r.data?._deleted || false }); if (r.updated_at > newest) newest = r.updated_at; }
    if (data.length < 1000) break; from += 1000;
  }
  localStorage.setItem(LAST + ':' + user.id, newest);
}

async function applyTemplates() {
  const { data, error } = await sb.from('plantillas').select('clave,registros');
  if (error) throw error;
  for (const t of data || []) {
    const flag = 'nexo:plantilla:' + t.clave + ':' + user.id;
    if (localStorage.getItem(flag)) continue;
    for (const r of t.registros || []) if (!store.raw(r.coleccion).some((x) => x.id === r.id)) store.add(r.coleccion, { ...r.data, id: r.id });
    localStorage.setItem(flag, '1');
  }
}

async function start() {
  stop();
  setStatus('conectando');
  try {
    // 1) Primera vez con esta cuenta en este dispositivo: subir todo lo local.
    const firstKey = 'nexo:sync:subido:' + user.id;
    if (!localStorage.getItem(firstKey)) {
      const q = readQ();
      for (const col of store.collections()) for (const rec of store.raw(col)) q[col + '/' + rec.id] = rowOf(col, rec);
      writeQ(q); localStorage.setItem(firstKey, '1');
    }
    await flush();
    // 2) Bajar lo de la nube
    await pull();
    // 2b) Plantillas (catálogo y Plan $10M): se copian una sola vez a tu cuenta
    await applyTemplates().catch((e) => console.warn('plantillas', e));
    setStatus('sincronizado');
    // 3) Escuchar cambios en vivo
    channel = sb.channel('nexo-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros', filter: 'user_id=eq.' + user.id }, (p) => {
        const r = p.new; if (!r || !r.coleccion) return;
        store.mergeRemote(r.coleccion, { ...r.data, _deleted: r.borrado || false });
        localStorage.setItem(LAST + ':' + user.id, r.updated_at);
      })
      .subscribe((s) => { if (s === 'SUBSCRIBED') setStatus('sincronizado'); });
  } catch (e) { console.warn('sync', e); setStatus(navigator.onLine ? 'error' : 'sin-internet'); }
}
function stop() { if (channel) { sb.removeChannel(channel); channel = null; } }
// Los cambios siempre entran a la cola, aunque no hayas entrado todavía: se suben cuando entres.
if (hasCloud()) store.setRemote({ put: (col, rec) => enqueue(col, rec) });

addEventListener('online', () => { if (user) { flush(); pull().catch(() => {}); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && user) { flush(); pull().catch(() => {}); } });

export const cloud = {
  available: hasCloud,
  async init() { await load(); },
  user: () => user,
  status: () => status,
  client: async () => { await load(); return sb; },
  async token() { await load(); const { data } = await sb.auth.getSession(); return data.session?.access_token || null; },
  onAuth(fn) { authListeners.add(fn); fn(user); return () => authListeners.delete(fn); },
  onStatus(fn) { statusListeners.add(fn); fn(status); return () => statusListeners.delete(fn); },
  async signIn() {
    await load();
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    if (error) throw error;
  },
  async signOut() { await load(); await sb.auth.signOut(); },
};
