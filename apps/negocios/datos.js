// NEXO Negocios v3 · cálculos compartidos (plata del mes, saldos, historia y urgencia de cada cliente)
import { store, fmt } from '../../core/shell.js';
import { estado, plan as plan10m, metaAl } from '../../core/plan10m.js';
import { saldoTrabajo, colorDia } from '../../core/misiones.js';
export { saldoTrabajo };

export const money = (n) => fmt.money(n);
export const cfgNeg = () => ({ pagoCompletoPct: 5, repitePct: 5, validez: 3, minimoHora: Number(store.get('config', 'plan10m')?.minimoHora) || 35000, ...(store.get('config', 'negocios') || {}) });
export const minHora = () => Number(cfgNeg().minimoHora) || 35000;
export const cobro = () => store.get('config', 'cobro') || {};
export const daysAgo = (iso) => { if (!iso) return 999; return Math.round((new Date(fmt.today() + 'T12:00') - new Date(iso.slice(0, 10) + 'T12:00')) / 864e5); };
export const cuando = (iso) => { const d = daysAgo(iso); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d < 7 ? `hace ${d} d` : fmt.date(iso.slice(0, 10)); };
export const iniciales = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const srcOf = (id) => store.get('sources', id) || null;
export const colorOf = (id) => srcOf(id)?.color || '#FF8A1F';
const month = () => fmt.today().slice(0, 7);

// Plata del mes: ingresos de clientes (abonos, cobros, registro) en Finanzas
export function cobradoMes(m = month()) {
  return store.list('transactions').filter((t) => t.type === 'ingreso' && (t.date || '').startsWith(m) && (/^(abo|inv|reg)-/.test(t.id) || ['Cliente', 'Anticipo'].includes(t.category)))
    .reduce((a, t) => a + (Number(t.amount) || 0), 0);
}
export function metaMes(m = month()) {
  const s = store.list('sources').filter((x) => (x.estado || 'activa') === 'activa').reduce((a, x) => a + (Number(x.metaMes) || 0), 0);
  if (s) return s;
  const p = plan10m(); if (!p) return 0;
  const [y, mo] = m.split('-').map(Number);
  const last = new Date(y, mo, 0).getDate(); const fin = `${m}-${String(last).padStart(2, '0')}`; const prev = new Date(y, mo - 1, 0); const ini = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
  return Math.max(0, metaAl(p, fin) - metaAl(p, ini));
}
export function semaforo() {
  const e = estado();
  if (e) return { color: e.color, txt: e.color === 'verde' ? 'Verde' : e.color === 'amarillo' ? 'Amarillo' : 'Rojo', dia: e.metaDia, msg: e.msg };
  const color = colorDia(); if (!color) return null;
  return { color, txt: { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo' }[color], dia: 0 };
}
export const trabajosActivos = () => store.list('jobs').filter((j) => ['aprobado', 'en curso', 'entregado'].includes(j.status));
export const porCobrar = () => trabajosActivos().reduce((a, j) => a + saldoTrabajo(j), 0)
  + store.list('invoices').filter((i) => !i.paid && !store.get('jobs', i.job)).reduce((a, i) => a + (Number(i.amount) || 0), 0);

// Historia de un cliente (lo más viejo primero, como un chat)
export function historia(cid) {
  const ev = [];
  const c = store.get('clients', cid);
  if (c?.fromProspect) ev.push({ at: c.createdAt, ic: '🎯', t: 'Era prospecto: ganado ✅', s: '' });
  for (const q of store.list('cotizaciones').filter((x) => x.client === cid)) {
    ev.push({ at: q.sentAt || q.createdAt, ic: '🧮', t: `Cotización ${q.number || ''} · ${q.title || ''} · ${money(q.total)}`, s: { borrador: 'borrador', enviada: 'enviada', aprobada: '✅ aprobada', vencida: '⌛ vencida', rechazada: '✕ no aceptó' }[q.status] || '', q });
  }
  for (const j of store.list('jobs').filter((x) => x.client === cid)) {
    ev.push({ at: j.createdAt, ic: '🛠', t: `Trabajo: ${j.title} · ${money(j.price)}`, s: j.status, job: j });
    if (j.deliveredAt) ev.push({ at: j.deliveredAt + 'T18:00', ic: '📦', t: `Entregado: ${j.title}`, s: '' });
  }
  for (const a of store.list('abonos').filter((x) => store.get('jobs', x.job)?.client === cid)) ev.push({ at: (a.date || '') + 'T12:00', ic: '💵', t: `${a.kind === 'anticipo' ? 'Anticipo' : a.kind === 'saldo' ? 'Saldo' : 'Abono'} recibido · ${money(a.amount)}`, s: store.get('jobs', a.job)?.title || '' });
  for (const i of store.list('invoices').filter((x) => x.client === cid)) ev.push({ at: i.date + 'T12:00', ic: '🧾', t: `Cobro ${i.number || ''} · ${money(i.amount)}`, s: i.paid ? 'pagado' : 'pendiente' });
  for (const l of store.list('clientLog').filter((x) => x.client === cid)) ev.push({ at: l.createdAt, ic: l.kind === 'whatsapp' ? '💬' : '📝', t: l.text, s: l.kind === 'whatsapp' ? 'WhatsApp' : 'nota' });
  return ev.filter((e) => e.at).sort((a, b) => String(a.at).localeCompare(String(b.at)));
}
// Resumen de la fila de un cliente: último movimiento, deuda, urgencia
export function resumen(c) {
  const h = historia(c.id); const last = h[h.length - 1];
  const jobs = store.list('jobs').filter((j) => j.client === c.id);
  const debe = jobs.filter((j) => ['aprobado', 'en curso', 'entregado'].includes(j.status)).reduce((a, j) => a + saldoTrabajo(j), 0);
  const entregadoDebe = jobs.some((j) => j.status === 'entregado' && saldoTrabajo(j) > 0);
  const anticipoPend = jobs.some((j) => ['aprobado', 'en curso'].includes(j.status) && (Number(j.price) || 0) - saldoTrabajo(j) < Math.round((Number(j.price) || 0) * (Number(j.anticipo ?? 50) / 100)));
  const qEnv = store.list('cotizaciones').filter((q) => q.client === c.id && q.status === 'enviada');
  const sinResp = qEnv.find((q) => daysAgo(q.followAt || q.sentAt) >= 2);
  const mision = store.list('misiones').some((m) => m.date === fmt.today() && !m.done && m.client === c.id);
  const urg = entregadoDebe ? 100 : anticipoPend ? 90 : sinResp ? 80 : mision ? 70 : 0;
  return { last, debe, sinResp, urg, at: last?.at || c.updatedAt || c.createdAt, source: c.source || jobs[0]?.source || '' };
}
export function bumpReg(k, n = 1, date = fmt.today()) {
  const r = store.list('registroDiario').find((x) => x.date === date);
  if (r) store.update('registroDiario', r.id, { [k]: Math.max(0, (Number(r[k]) || 0) + n) });
  else store.add('registroDiario', { date, [k]: Math.max(0, n) });
}
export const regHoy = () => store.list('registroDiario').find((x) => x.date === fmt.today()) || {};
// Número de WhatsApp de Colombia → enlace
export function waLink(phone, text) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('3')) d = '57' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
export function nextNumber(prefix = 'COT') {
  const n = store.list('cotizaciones').reduce((a, q) => Math.max(a, Number(String(q.number || '').replace(/\D/g, '')) || 0), 0) + 1;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}
// Ganancia real por hora de un plan (horas medidas con el cronómetro si existen)
export function derivado(svc) {
  const jobs = store.list('jobs').filter((j) => j.service === svc.id);
  const mins = jobs.map((j) => store.list('timeLogs').filter((t) => t.job === j.id).reduce((a, t) => a + (Number(t.minutes) || 0), 0)).filter((m) => m > 0);
  const real = mins.length ? mins.reduce((a, m) => a + m, 0) / mins.length / 60 : 0;
  const hours = real || Number(svc.hours) || 0; const costos = Number(svc.costos) || 0; const precio = Number(svc.price) || 0;
  return { real: Math.round(real * 10) / 10, hours, costos, porHora: hours ? Math.round((precio - costos) / hours) : 0, minimo: Math.round(hours * minHora() + costos) };
}
