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
store.subscribe('*', (col) => { if (['invoices', 'exams', 'shoots'].includes(col)) { clearTimeout(t); t = setTimeout(run, 150); } });
setTimeout(run, 300);
