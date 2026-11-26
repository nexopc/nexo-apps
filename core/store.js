// NEXO Brain — el lugar ÚNICO donde todas las apps guardan tu información.
// Local primero (funciona sin internet) + sincronización con Firebase cuando hay cuenta de Google.
// Todas las apps leen y escriben aquí; Harvey también. Un cambio en una app aparece en vivo en las demás.

const PREFIX = 'nexo:data:';
const channel = 'BroadcastChannel' in self ? new BroadcastChannel('nexo-brain') : null;
const listeners = new Map(); // col -> Set(fn)
const cache = new Map();     // col -> array
let remote = null;           // adaptador de Firebase (core/sync.js)

const uid = () => (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/-/g, '').slice(0, 16);
const now = () => new Date().toISOString();

function read(col) {
  if (cache.has(col)) return cache.get(col);
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(PREFIX + col) || '[]'); } catch {}
  cache.set(col, arr);
  return arr;
}
function write(col, arr, { silent = false } = {}) {
  cache.set(col, arr);
  try { localStorage.setItem(PREFIX + col, JSON.stringify(arr)); }
  catch (e) { console.warn('Almacenamiento lleno', e); }
  emit(col);
  if (!silent) channel?.postMessage({ col });
}
function emit(col) {
  for (const fn of listeners.get(col) || []) try { fn(read(col)); } catch (e) { console.error(e); }
  for (const fn of listeners.get('*') || []) try { fn(col); } catch (e) { console.error(e); }
}
channel?.addEventListener('message', (e) => { cache.delete(e.data.col); emit(e.data.col); });
addEventListener('storage', (e) => {
  if (e.key?.startsWith(PREFIX)) { const c = e.key.slice(PREFIX.length); cache.delete(c); emit(c); }
});

export const store = {
  raw(col) { return read(col).slice(); },
  list(col) { return read(col).filter((r) => !r._deleted); },
  get(col, id) { return read(col).find((r) => r.id === id && !r._deleted) || null; },
  add(col, data) {
    if (data.id && read(col).some((r) => r.id === data.id)) return this.update(col, data.id, { ...data, _deleted: false });
    const rec = { ...data, id: data.id || uid(), createdAt: now(), updatedAt: now() };
    write(col, [...read(col), rec]);
    remote?.put(col, rec);
    return rec;
  },
  update(col, id, patch) {
    let out = null;
    const arr = read(col).map((r) => (r.id === id ? (out = { ...r, ...patch, id, updatedAt: now() }) : r));
    if (!out) return null;
    write(col, arr);
    remote?.put(col, out);
    return out;
  },
  remove(col, id) {
    // borrado suave para que la sincronización se entere en todos los dispositivos
    return this.update(col, id, { _deleted: true });
  },
  subscribe(col, fn) {
    if (!listeners.has(col)) listeners.set(col, new Set());
    listeners.get(col).add(fn);
    return () => listeners.get(col)?.delete(fn);
  },
  // Para la sincronización: mezcla un registro remoto si es más nuevo.
  mergeRemote(col, rec) {
    const arr = read(col);
    const i = arr.findIndex((r) => r.id === rec.id);
    if (i >= 0 && (arr[i].updatedAt || '') >= (rec.updatedAt || '')) return;
    const next = arr.slice();
    i >= 0 ? (next[i] = rec) : next.push(rec);
    write(col, next);
  },
  collections() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
    }
    return out.sort();
  },
  exportAll() {
    const o = {};
    for (const c of this.collections()) o[c] = read(c);
    return o;
  },
  importAll(obj) {
    for (const [c, arr] of Object.entries(obj || {})) if (Array.isArray(arr)) { write(c, arr); arr.forEach((r) => remote?.put(c, r)); }
  },
  setRemote(r) { remote = r; },
  uid,
};

// Ajustes del usuario (no se sincronizan los secretos)
export const prefs = {
  get(k, d = null) { try { const v = localStorage.getItem('nexo:pref:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('nexo:pref:' + k, JSON.stringify(v)); } catch {} },
};

// Utilidades de formato (Colombia)
export const fmt = {
  money: (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0),
  date: (d) => (d ? new Date(d + (String(d).length === 10 ? 'T12:00' : '')).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : ''),
  day: (d = new Date()) => d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
  today: () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); },
  hours: (m) => `${Math.floor(m / 60)}h ${String(Math.round(m % 60)).padStart(2, '0')}m`,
};

// Horario de una fecha: si existe un ajuste del día, manda; si no, el horario base de ese día de la semana.
export function blocksFor(date) {
  const plan = store.get('dayPlans', 'day-' + date);
  if (plan?.blocks?.length) return plan.blocks.map((b, i) => ({ ...b, id: plan.id + ':' + i, adjusted: true })).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const dow = String(new Date(date + 'T12:00').getDay());
  return store.list('blocks').filter((b) => b.day === dow).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
}
