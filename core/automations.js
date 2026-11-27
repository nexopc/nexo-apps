// Automatizaciones entre apps (corren en cualquier app abierta; son idempotentes).
import { store, fmt } from './store.js';
import { sendOnce } from './planlink.js';

function run() {
  // Negocios → Finanzas: un cobro marcado como pagado crea el ingreso.
  const tx = new Set(store.raw('transactions').map((t) => t.id));
  for (const inv of store.list('invoices')) {
    const id = 'inv-' + inv.id;
    if (inv.paid && !tx.has(id)) {
      const client = store.get('clients', inv.client);
      store.add('transactions', { id, type: 'ingreso', amount: inv.amount, title: `Cobro ${inv.number || ''} ${client?.name || ''}`.trim(), category: 'Cliente', account: inv.account || '', date: fmt.today(), job: inv.job || '' });
      if (inv.job) store.update('jobs', inv.job, { status: 'pagado' });
    }
    if (!inv.paid && tx.has(id) && !store.get('transactions', id)?._deleted) store.remove('transactions', id);
  }
  // Registro diario → Finanzas: la plata cobrada del día entra como ingreso.
  for (const r of store.list('registroDiario')) {
    const id = 'reg-' + r.id;
    const v = Number(r.cobrado) || 0;
    const cur = store.get('transactions', id);
    if (v > 0 && (!cur || Number(cur.amount) !== v || cur.date !== r.date)) store.add('transactions', { id, type: 'ingreso', amount: v, title: 'Cobrado (registro del ' + (r.date || '') + ')', category: 'Cliente', account: store.list('accounts').find((a) => a.kind === 'Negocio')?.id || '', date: r.date || fmt.today() });
    if (!v && cur) store.remove('transactions', id);
  }
  // Negocios v3 → Finanzas: cada abono (anticipo, abono o saldo) entra como ingreso; con saldo 0 el trabajo queda pagado.
  for (const ab of store.list('abonos')) {
    const id = 'abo-' + ab.id;
    const cur = store.get('transactions', id);
    const job = store.get('jobs', ab.job); const client = store.get('clients', job?.client);
    const acc = ab.account || store.get('sources', job?.source)?.account || store.list('accounts').find((a) => a.kind === 'Negocio')?.id || '';
    if (!cur || Number(cur.amount) !== Number(ab.amount) || cur.date !== ab.date) store.add('transactions', { id, type: 'ingreso', amount: Number(ab.amount) || 0, title: `${ab.kind === 'anticipo' ? 'Anticipo' : ab.kind === 'saldo' ? 'Saldo' : 'Abono'} · ${client?.name || job?.title || ''}`.trim(), category: ab.kind === 'anticipo' ? 'Anticipo' : 'Cliente', account: acc, date: ab.date || fmt.today(), job: ab.job || '' });
  }
  for (const t0 of store.list('transactions')) if (t0.id.startsWith('abo-') && !store.get('abonos', t0.id.slice(4))) store.remove('transactions', t0.id);
  for (const j of store.list('jobs')) {
    if (j.status === 'pagado' || !(Number(j.price) > 0)) continue;
    const pag = store.list('abonos').filter((a) => a.job === j.id).reduce((s0, a) => s0 + (Number(a.amount) || 0), 0);
    if (pag > 0 && pag >= Number(j.price)) store.update('jobs', j.id, { status: 'pagado', paidAt: fmt.today() });
  }
  // Cotizaciones: a los 3 días sin respuesta quedan vencidas
  for (const q of store.list('cotizaciones')) if (q.status === 'enviada' && q.expiresAt && q.expiresAt < fmt.today()) store.update('cotizaciones', q.id, { status: 'vencida' });
  // Aprende → NEXO PLAN: cada evaluación llega como tarea tipo examen (con sus recordatorios).
  for (const ex of store.list('exams')) {
    if (!ex.date) continue;
    const subj = store.get('subjects', ex.subject);
    sendOnce('exam-' + ex.id + '-' + ex.date, { type: 'task', tipo: 'examen', title: ex.title + (subj ? ' · ' + subj.name : ''), due: ex.date + 'T07:00', subj: subj?.name || '', notes: ex.topics || '📝 Desde NEXO Aprende' });
  }
  // Studio → NEXO PLAN: cada grabación llega como tarea con fecha y hora.
  for (const sh of store.list('shoots')) {
    if (!sh.date) continue;
    sendOnce('shoot-' + sh.id + '-' + sh.date, { type: 'task', tipo: 'tarea', title: '🎥 Grabación: ' + sh.title, due: sh.date + 'T' + (sh.time || '15:00'), notes: sh.place ? '📍 ' + sh.place : '🎬 Desde NEXO Studio' });
  }
}
let t = 0;
store.subscribe('*', (col) => { if (['invoices', 'exams', 'shoots', 'registroDiario', 'abonos', 'cotizaciones'].includes(col)) { clearTimeout(t); t = setTimeout(run, 150); } });
setTimeout(run, 300);
