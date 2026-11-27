// Avisos de los cerebros: revisan tus 6 apps (sin gastar IA) y te dicen cuándo te estás atrasando.
// - Se ven en Harvey → 🔔 Avisos.
// - Una vez al día los cerebros dejan un reporte en el chat de Harvey (el mismo en todos tus dispositivos).
// - Si activaste notificaciones, llega una notificación del dispositivo (una vez al día por dispositivo).
import { store, fmt, prefs } from './store.js';
import { toMin, weekday, topicNeed, topicDone, score } from './planner.js';
import { planDay } from './planlink.js';

const B = { harvey: '⚖️ Harvey', donna: '💜 Donna', louis: '📊 Louis', mike: '📚 Mike', jessica: '👑 Jessica' };
const dd = (x, t) => Math.round((new Date(x + 'T12:00') - new Date(t + 'T12:00')) / 864e5);

export function avisos(now = new Date()) {
  const t = fmt.today(); const out = [];
  const add = (brain, sev, icon, text, app) => out.push({ brain, sev, icon, text, app });
  const nowM = now.getHours() * 60 + now.getMinutes();
  // ---- Donna: agenda y tareas
  const bs = (planDay(t) || []).filter((b) => !['libre', 'dormir', 'rutina', 'colegio'].includes(b.cat));
  const missed = bs.filter((b) => !b.estado && toMin(b.e) && toMin(b.e) <= nowM);
  if (missed.length >= 2) add('donna', 'alta', '🗓', `Hoy van ${missed.length} bloques sin marcar en NEXO PLAN (${missed.slice(0, 2).map((b) => b.title).join(', ')}…). ¿Reorganizo lo que queda del día?`, 'plan');
  const tareas = store.list('tareas').filter((x) => !x.done);
  const vencidas = tareas.filter((x) => x.due && x.due < t);
  if (vencidas.length) add('donna', 'alta', '✅', `${vencidas.length} tarea(s) vencida(s): ${vencidas.slice(0, 2).map((x) => x.title).join(', ')}.`, 'plan');
  tareas.filter((x) => x.due === t).forEach((x) => add('donna', 'media', '✅', `Para hoy: ${x.title}`, 'plan'));
  const top = tareas.filter((x) => score(x) >= 20 && !x.due).length;
  if (top >= 3) add('jessica', 'media', '👑', `Tienes ${top} tareas "muy importantes y urgentes" a la vez. Si todo es urgente, nada lo es: elige una.`, 'plan');
  (store.raw('planBridge')[0]?.tareas || []).filter((x) => x.para && x.para.slice(0, 10) < t).slice(0, 3).forEach((x) => add('donna', 'media', '🕰', `Entrega vencida en NEXO PLAN: ${x.titulo}`, 'plan'));
  // ---- Mike: estudio
  const frac = (weekday(t) + 1) / 7;
  for (const tp of store.list('topics')) {
    const n = topicNeed(tp); if (!n || tp.type === 'fija') continue;
    const d = topicDone(tp, t);
    if (d < n * frac * 0.6 && weekday(t) >= 2) add('mike', tp.type === 'obligatoria' ? 'alta' : 'media', '📚', `Vas atrasado en ${tp.name}: ${Math.round(d / 6) / 10} h de ${Math.round(n / 6) / 10} h esta semana.`, 'aprende');
  }
  store.list('exams').filter((x) => x.date >= t && dd(x.date, t) <= 3).forEach((x) => add('mike', 'alta', '📝', `${x.title} ${dd(x.date, t) === 0 ? 'es HOY' : 'en ' + dd(x.date, t) + ' días'}.`, 'aprende'));
  // ---- Louis: plata
  store.list('subscriptions').filter((x) => x.nextDate && dd(x.nextDate, t) <= 3).forEach((x) => { const k = dd(x.nextDate, t); add('louis', k < 0 ? 'alta' : 'media', '🔁', `${x.name} ${k < 0 ? 'venció hace ' + -k + ' días' : k === 0 ? 'se cobra hoy' : 'se cobra en ' + k + ' días'}${store.get('accounts', x.account) ? ' (' + store.get('accounts', x.account).name + ')' : ''}.`, 'finanzas'); });
  store.list('invoices').filter((x) => !x.paid && x.due && x.due < t).forEach((x) => add('louis', 'alta', '🧾', `Cobro vencido ${x.number || ''}: ${fmt.money(x.amount)}. Cóbralo hoy.`, 'negocios'));
  // ---- Harvey: negocio
  store.list('jobs').filter((x) => x.due && x.due <= t && !['entregado', 'pagado'].includes(x.status)).forEach((x) => add('harvey', 'alta', '🛠', `Entrega ${x.due < t ? 'atrasada' : 'para hoy'}: ${x.title}.`, 'negocios'));
  store.list('prospects').filter((x) => x.nextDate && x.nextDate <= t && !['ganado', 'perdido'].includes(x.stage)).forEach((x) => add('harvey', 'media', '🎯', `Seguimiento pendiente: ${x.name}${x.next ? ' — ' + x.next : ''}.`, 'negocios'));
  if (now.getHours() >= 20 && store.list('config').some((c) => c.id === 'plan10m') && !store.list('registroDiario').some((r) => r.date === t)) add('harvey', 'media', '📒', 'No has llenado el registro de ventas de hoy (2 minutos).', 'negocios');
  // ---- Studio
  store.list('shoots').filter((x) => x.date === t).forEach((x) => add('mike', 'media', '🎬', `Grabación hoy: ${x.title}${x.time ? ' a las ' + x.time : ''}.`, 'studio'));
  const cambios = store.list('contentPlans').flatMap((p) => (p.items || []).filter((i) => i.status === 'cambios').map((i) => ({ i, p })));
  if (cambios.length) add('harvey', 'media', '✏️', `${cambios.length} contenido(s) con cambios pedidos por el cliente sin resolver.`, 'studio');
  const order = { alta: 0, media: 1, baja: 2 };
  return out.sort((a, b) => order[a.sev] - order[b.sev]);
}

// Notificación del dispositivo (funciona con la app abierta o recién abierta; push con servidor queda para la V2)
export async function notify(title, body, tag = 'nexo') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try { const reg = await navigator.serviceWorker?.getRegistration(); if (reg?.showNotification) { await reg.showNotification(title, { body, tag, icon: new URL('/nexo-apps/core/icons/harvey-192.png', location.origin).href, badge: new URL('/nexo-apps/core/icons/harvey-192.png', location.origin).href }); return true; } } catch {}
  try { new Notification(title, { body, tag }); return true; } catch { return false; }
}

// Reporte diario de los cerebros en el chat (uno por día para todos tus dispositivos) + notificación (una por dispositivo)
export async function dailyReport() {
  const t = fmt.today();
  const list = avisos();
  if (!list.length) return null;
  const altas = list.filter((a) => a.sev === 'alta');
  if (new Date().getHours() < 7) return null;
  let rep = store.get('reportes', t);
  if (!rep) {
    const byBrain = {};
    for (const a of list.slice(0, 8)) (byBrain[a.brain] = byBrain[a.brain] || []).push(a.text);
    const text = `**🔔 Reporte del bufete · ${fmt.date(t)}**\n` + Object.entries(byBrain).map(([b, xs]) => `**${B[b]}:** ${xs.join(' ')}`).join('\n') + (altas.length ? `\n**👑 Jessica (decisión):** Empieza por lo rojo: ${altas[0].text}` : '');
    store.add('chat', { role: 'assistant', text, report: true });
    rep = store.add('reportes', { id: t, count: list.length, altas: altas.length });
  }
  if (prefs.get('notif:' + t) !== true && altas.length) { const ok = await notify(`NEXO · ${altas.length} aviso${altas.length > 1 ? 's' : ''} importante${altas.length > 1 ? 's' : ''}`, altas.slice(0, 3).map((a) => a.text).join('\n'), 'nexo-diario'); if (ok) prefs.set('notif:' + t, true); }
  return rep;
}
