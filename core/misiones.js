// 🎯 Misiones secundarias: pasos concretos para cumplir la meta del día. 100 % automáticas.
// - Cada día (también días futuros, cuando NEXO PLAN organiza la semana) se arman de tus datos:
//   cobrar saldos, seguir cotizaciones sin respuesta, prospectos con paso para ese día, entregas cercanas,
//   contactos que faltan para la meta y cotizar a prospectos calientes.
// - Cuántas: según el semáforo de la meta ($10M): rojo 5 · amarillo 4 · verde 3.
// - Se marcan solas cuando haces la acción en la app (abono, cotización enviada, seguimiento, contactos del día).
// - Ids fijos por día y motivo → no se duplican aunque abras la app en 3 dispositivos.
import { store, fmt } from './store.js';
import { estado } from './plan10m.js';

const addDays = (s, n) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);
const nameOf = (col, id) => store.get(col, id)?.name || '';
const money = (n) => fmt.money(n);

// Saldo pendiente de un trabajo (precio − abonos)
export function saldoTrabajo(job) {
  const pag = store.list('abonos').filter((a) => a.job === job.id).reduce((s, a) => s + (Number(a.amount) || 0), 0)
    + store.list('invoices').filter((i) => i.job === job.id && i.paid).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  return Math.max(0, (Number(job.price) || 0) - pag);
}
// Color del día: el del Plan $10M; si no hay plan, cobrado del mes vs la meta de tus empresas
export function colorDia(date = fmt.today()) {
  const e = estado(date); if (e) return e.color;
  const meta = store.list('sources').filter((x) => (x.estado || 'activa') === 'activa').reduce((a, x) => a + (Number(x.metaMes) || 0), 0);
  if (!meta) return '';
  const m = date.slice(0, 7); const d = new Date(date + 'T12:00');
  const cob = store.list('transactions').filter((t) => t.type === 'ingreso' && (t.date || '').startsWith(m) && (/^(abo|inv|reg)-/.test(t.id) || ['Cliente', 'Anticipo'].includes(t.category))).reduce((a, t) => a + (Number(t.amount) || 0), 0);
  const r = cob / (meta * (d.getDate() / new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()) || 1);
  return r >= 1 ? 'verde' : r >= 0.5 ? 'amarillo' : 'rojo';
}
export function cuantas(date = fmt.today()) {
  const c = colorDia(date);
  return c === 'rojo' ? 5 : c === 'amarillo' ? 4 : 3;
}
export function contactosMeta() { return Number((store.get('config', 'plan10m') || {}).numeros?.contactos) || 3; }
const regDe = (date) => store.list('registroDiario').find((r) => r.date === date) || {};

// Candidatas de un día, de la más importante a la menos
export function candidatas(date = fmt.today()) {
  const out = [];
  const add = (key, o) => out.push({ id: 'auto-' + date + '-' + key, date, auto: true, ...o });
  const hoy = fmt.today();
  // 1) Cobrar: trabajos aprobados sin anticipo, entregados con saldo, abonos vencidos
  for (const j of store.list('jobs')) {
    if (j.status === 'pagado' || j.status === 'cotizado') continue;
    const saldo = saldoTrabajo(j); if (saldo <= 0) continue;
    const pagado = (Number(j.price) || 0) - saldo;
    const ant = Math.round((Number(j.price) || 0) * ((Number(j.anticipo ?? 50) || 0) / 100));
    if (j.status === 'entregado') add('cobrar-' + j.id, { type: 'cobrar', title: `💵 Cobra ${money(saldo)} a ${nameOf('clients', j.client) || j.title}`, ref: { col: 'jobs', id: j.id }, client: j.client, minutes: 15, prio: 100, value: saldo });
    else if (pagado < ant) add('anticipo-' + j.id, { type: 'cobrar', title: `💵 Pide el anticipo de ${money(ant - pagado)} a ${nameOf('clients', j.client) || j.title}`, ref: { col: 'jobs', id: j.id }, client: j.client, minutes: 15, prio: 95, value: ant - pagado });
  }
  // 2) Seguimiento de cotizaciones enviadas sin respuesta (2+ días el día de la misión)
  for (const q of store.list('cotizaciones')) {
    if (q.status !== 'enviada' || !q.sentAt) continue;
    const d = daysBetween(q.sentAt.slice(0, 10), date);
    if (d < 2) continue;
    const who = nameOf('clients', q.client) || nameOf('prospects', q.prospect) || 'el cliente';
    add('seguir-' + q.id, { type: 'seguimiento', title: `🔁 Haz seguimiento a ${who} (${q.title || 'cotización'})`, ref: { col: 'cotizaciones', id: q.id }, client: q.client, prospect: q.prospect, minutes: 15, prio: 88 + Math.min(d, 10), value: Number(q.total) || 0 });
  }
  // 3) Prospectos con paso para ese día (o atrasado si es hoy)
  for (const p of store.list('prospects')) {
    if (['ganado', 'perdido'].includes(p.stage) || !p.nextDate) continue;
    if (p.nextDate === date || (date === hoy && p.nextDate < hoy)) {
      const t = { caliente: 20, tibio: 10, frio: 0 }[p.temp || 'tibio'] || 0;
      add('prospecto-' + p.id, { type: 'prospecto', title: `🎯 ${p.next || 'Contacta'}: ${p.name}`, ref: { col: 'prospects', id: p.id }, prospect: p.id, minutes: 20, prio: 70 + t, value: Number(p.potential) || 0 });
    }
  }
  // 4) Entregas para ese día o el siguiente
  for (const j of store.list('jobs')) {
    if (!j.due || ['entregado', 'pagado', 'cotizado'].includes(j.status)) continue;
    const d = daysBetween(date, j.due);
    if (d === 0 || d === 1) add('entrega-' + j.id, { type: 'entrega', title: `🛠 Termina y entrega: ${j.title}${d === 1 ? ' (es mañana)' : ''}`, ref: { col: 'jobs', id: j.id }, client: j.client, minutes: 60, prio: 85 });
  }
  // 5) Contactos nuevos que faltan para la meta del día
  const meta = contactosMeta(); const llevo = Number(regDe(date).contactos) || 0;
  if (llevo < meta) add('contactos', { type: 'contactos', title: `📞 Consigue ${meta - llevo} contacto(s) nuevo(s) hoy`, minutes: 45, prio: 60, goal: meta });
  // 6) Cotizar a un prospecto caliente sin cotización
  const cal = store.list('prospects').filter((p) => p.temp === 'caliente' && !['ganado', 'perdido'].includes(p.stage) && !store.list('cotizaciones').some((q) => q.prospect === p.id)).sort((a, b) => (Number(b.potential) || 0) - (Number(a.potential) || 0))[0];
  if (cal) add('cotizar-' + cal.id, { type: 'cotizar', title: `🧮 Envíale una cotización a ${cal.name}`, ref: { col: 'prospects', id: cal.id }, prospect: cal.id, minutes: 20, prio: 65, value: Number(cal.potential) || 0 });
  return out.sort((a, b) => b.prio - a.prio);
}

// Crea las misiones automáticas del día (una sola vez por día; las tuyas no cuentan en el límite)
export function generar(date = fmt.today()) {
  const ya = store.list('misiones').filter((m) => m.date === date && m.auto);
  const n = cuantas(date);
  if (ya.length >= n) return ya;
  const nuevas = candidatas(date).filter((c) => !store.raw('misiones').some((m) => m.id === c.id)).slice(0, n - ya.length);
  for (const c of nuevas) store.add('misiones', { ...c, done: false });
  return store.list('misiones').filter((m) => m.date === date && m.auto);
}
export function delDia(date = fmt.today()) {
  return store.list('misiones').filter((m) => m.date === date).sort((a, b) => (a.done - b.done) || (b.prio || 0) - (a.prio || 0));
}
export function crearPropia(title, date = fmt.today(), minutes = 30) {
  return store.add('misiones', { date, title: '⭐ ' + title, type: 'propia', auto: false, done: false, minutes, prio: 80 });
}
export function marcar(id, done = true) { store.update('misiones', id, { done, doneAt: done ? new Date().toISOString() : null }); }

// ¿Ya se cumplió? (se revisa sola cuando cambian tus datos)
function cumplida(m) {
  const r = m.ref || {};
  if (m.type === 'cobrar') { const j = store.get('jobs', r.id); if (!j) return false; return store.list('abonos').some((a) => a.job === j.id && (a.date || '') >= m.date) || saldoTrabajo(j) === 0; }
  if (m.type === 'seguimiento') { const q = store.get('cotizaciones', r.id); return !!q && (q.status !== 'enviada' || (q.followAt || '') >= m.date); }
  if (m.type === 'prospecto') { const p = store.get('prospects', r.id); return !!p && (['ganado', 'perdido'].includes(p.stage) || (p.lastAt || '') >= m.date || (p.nextDate || '') > m.date); }
  if (m.type === 'entrega') { const j = store.get('jobs', r.id); return !!j && ['entregado', 'pagado'].includes(j.status); }
  if (m.type === 'contactos') return (Number(regDe(m.date).contactos) || 0) >= (m.goal || contactosMeta());
  if (m.type === 'cotizar') return store.list('cotizaciones').some((q) => q.prospect === r.id && ['enviada', 'aprobada'].includes(q.status));
  return false;
}
export function revisar() {
  for (const m of store.list('misiones')) if (!m.done && m.auto && cumplida(m)) store.update('misiones', m.id, { done: true, doneAt: new Date().toISOString(), sola: true });
}
let t = 0;
store.subscribe('*', (col) => { if (['abonos', 'cotizaciones', 'prospects', 'jobs', 'registroDiario', 'invoices'].includes(col)) { clearTimeout(t); t = setTimeout(revisar, 200); } });
