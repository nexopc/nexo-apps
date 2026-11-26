// Automatizaciones entre apps (corren en cualquier app abierta; son idempotentes).
import { store, fmt } from './store.js';

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
  // Aprende → Plan: cada evaluación aparece en la agenda.
  const ev = new Set(store.raw('events').map((e) => e.id));
  for (const ex of store.list('exams')) {
    const id = 'exam-' + ex.id;
    const subj = store.get('subjects', ex.subject);
    const want = { title: `📝 ${ex.title}${subj ? ' · ' + subj.name : ''}`, date: ex.date };
    if (!ev.has(id)) store.add('events', { id, ...want });
    else { const e = store.get('events', id); if (e && (e.title !== want.title || e.date !== want.date)) store.update('events', id, want); }
  }
  // Studio → Plan: cada grabación aparece en la agenda.
  for (const sh of store.list('shoots')) {
    const id = 'shoot-' + sh.id;
    if (!ev.has(id) && sh.date) store.add('events', { id, title: `🎥 ${sh.title}`, date: sh.date, time: sh.time || '' });
  }
}
let t = 0;
store.subscribe('*', (col) => { if (['invoices', 'exams', 'shoots'].includes(col)) { clearTimeout(t); t = setTimeout(run, 150); } });
setTimeout(run, 300);
