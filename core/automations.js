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
  // Negocios → Studio: un trabajo aprobado con un plan que incluye videos (ej. 8 reels) crea sus videos (una sola vez).
  for (const j of store.list('jobs')) {
    if (!['aprobado', 'en curso'].includes(j.status) || !j.service) continue;
    const svc = store.get('services', j.service); const n = Math.min(60, Number(svc?.videos) || 0); if (!n) continue;
    for (let i = 1; i <= n; i++) {
      const id = `job-${j.id}-${i}`;
      if (store.raw('videos').some((v) => v.id === id)) continue; // ya existe (o lo borraste): no se vuelve a crear
      store.add('videos', { id, title: `${svc.name}${svc.plan ? ' ' + svc.plan : ''} · ${i}/${n}`, client: j.client || '', source: j.source || '', job: j.id, status: 'idea', due: j.due || '', escenas: [] });
    }
  }
  // Studio 3 → NEXO PLAN: cada escena con fecha y hora llega como cita 🔒 fija (con lugar y sus planos). Si cambias fecha/hora/lugar, se actualiza.
  for (const v of store.list('videos')) {
    (v.escenas || []).forEach((e, i) => {
      if (!e.fecha || !e.hora) return;
      const lugar = store.get('lugares', e.lugar)?.name || e.lugarTxt || '';
      const start = new Date(e.fecha + 'T' + e.hora).getTime(); if (!start) return;
      const mins = Math.max(30, (e.planos || []).length * 10 + 20);
      const notas = `🎬 ${v.title} · Escena ${i + 1}${e.titulo ? ': ' + e.titulo : ''}\n` + (e.planos || []).map((p, k) => `${String.fromCharCode(65 + k)}. ${p.desc || p.tipo || 'Plano'}`).join('\n') + (e.prepara ? `\n👉 El cliente prepara: ${e.prepara}` : '');
      sendOnce(`studio-${v.id}-${e.id}-${e.fecha}-${e.hora}-${lugar}`, { type: 'cita', key: `studio-${v.id}-${e.id}`, title: '🎥 Grabar: ' + v.title, start, end: start + mins * 60000, place: lugar, notes: notas });
    });
  }
  // Studio → NEXO PLAN: cada grabación llega como tarea con fecha y hora.
  for (const sh of store.list('shoots')) {
    if (!sh.date) continue;
    sendOnce('shoot-' + sh.id + '-' + sh.date, { type: 'task', tipo: 'tarea', title: '🎥 Grabación: ' + sh.title, due: sh.date + 'T' + (sh.time || '15:00'), notes: sh.place ? '📍 ' + sh.place : '🎬 Desde NEXO Studio' });
  }
}
let t = 0;
store.subscribe('*', (col) => { if (['invoices', 'exams', 'shoots', 'registroDiario', 'abonos', 'cotizaciones', 'jobs', 'videos'].includes(col)) { clearTimeout(t); t = setTimeout(run, 150); } });
setTimeout(run, 300);
