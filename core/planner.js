// Planificador común de la red NEXO (lo usan NEXO Plan, Aprende y Harvey).
// Día efectivo = (día ajustado si existe, si no: horario base + clases fijas de Aprende) + bloques sueltos de la agenda.
// Organizar = llenar los huecos libres con las tareas y el estudio más importantes (importancia × urgencia).
import { store, fmt } from './store.js';

export const CATS = {
  estudio: ['📚', '#FFC23D'], trabajo: ['💼', '#FF8A1F'], cliente: ['🤝', '#1CE783'], contenido: ['🎬', '#FF4F9A'],
  salud: ['💪', '#4EA8FF'], personal: ['🙂', '#9B5CFF'], descanso: ['😴', '#8E99AD'],
};
export const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const toMin = (t) => { if (!/^\d{1,2}:\d{2}$/.test(t || '')) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const toHM = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const weekday = (date) => (new Date(date + 'T12:00').getDay() + 6) % 7; // 0 = lunes
export const addDays = (date, n) => { const d = new Date(date + 'T12:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const mondayOf = (date) => addDays(date, -weekday(date));
export const score = (t) => (Number(t.imp) || 3) * (Number(t.urg) || 3);

export function cfg() { const c = store.get('config', 'plan') || {}; return { wake: c.wake || '06:00', sleep: c.sleep || '22:00', gap: Number(c.gap ?? 5), chunk: Number(c.chunk || 45) }; }
export function setCfg(p) { store.add('config', { ...(store.get('config', 'plan') || {}), ...p, id: 'plan' }); }

// Bloques del horario base + clases fijas de Aprende para una fecha
export function baseFor(date) {
  const wd = weekday(date);
  const base = store.list('bloques').filter((b) => (b.days || []).includes(wd) && toMin(b.start) != null && toMin(b.end) != null)
    .map((b) => ({ key: 'b:' + b.id, src: 'base', ref: b.id, title: b.title, start: b.start, end: b.end, fixed: !!b.fixed, cat: b.cat || 'trabajo' }));
  const clases = store.list('topics').filter((t) => t.type === 'fija' && (t.classDays || []).includes(wd) && toMin(t.classTime) != null)
    .map((t) => ({ key: 'c:' + t.id, src: 'clase', ref: t.id, title: '📚 ' + t.name, start: t.classTime, end: toHM(toMin(t.classTime) + (Number(t.classMinutes) || 60)), fixed: true, cat: 'estudio' }));
  return [...base, ...clases];
}
// Día completo, ordenado
export function dayBlocks(date) {
  const ov = store.get('dias', date);
  const main = ov ? (ov.blocks || []).map((b, i) => ({ key: 'd:' + i, src: 'dia', idx: i, title: b.title, start: b.start, end: b.end, fixed: !!b.fixed, cat: b.cat || 'trabajo', done: !!b.done }))
    : baseFor(date).map((b) => ({ ...b, done: !!(store.get('hechos', date)?.keys || []).includes(b.key) }));
  const extra = store.list('agenda').filter((a) => a.date === date && toMin(a.start) != null && toMin(a.end) != null)
    .map((a) => ({ key: 'a:' + a.id, src: a.src || 'manual', ref: a.id, title: a.title, start: a.start, end: a.end, fixed: !!a.fixed, cat: a.cat || 'trabajo', done: !!a.done, task: a.task, topic: a.topic }));
  return [...main, ...extra].sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end));
}
// Convierte el día en un día ajustado (para editar un bloque "solo hoy" sin tocar el horario base)
export function materialize(date) {
  if (store.get('dias', date)) return store.get('dias', date);
  const done = store.get('hechos', date)?.keys || [];
  return store.add('dias', { id: date, reason: 'Ajustado a mano', blocks: baseFor(date).map((b) => ({ title: b.title, start: b.start, end: b.end, fixed: b.fixed, cat: b.cat, done: done.includes(b.key) })) });
}
// Marca un bloque como hecho / no hecho según de dónde viene
export function toggleDone(date, blk) {
  if (blk.src === 'dia') { const d = store.get('dias', date); const blocks = d.blocks.slice(); blocks[blk.idx] = { ...blocks[blk.idx], done: !blocks[blk.idx].done }; store.update('dias', date, { blocks }); return; }
  if (blk.src === 'base' || blk.src === 'clase') { const h = store.get('hechos', date); const keys = new Set(h?.keys || []); keys.has(blk.key) ? keys.delete(blk.key) : keys.add(blk.key); store.add('hechos', { id: date, keys: [...keys] }); return; }
  const a = store.get('agenda', blk.ref); if (!a) return;
  store.update('agenda', a.id, { done: !a.done });
  if (a.task && !a.done) { const t = store.get('tareas', a.task); if (t && !t.done) store.update('tareas', t.id, { done: true, doneAt: new Date().toISOString() }); }
}
// Huecos libres entre la hora de levantarse y la de dormir
export function freeSlots(date, fromMin = null) {
  const c = cfg();
  let start = toMin(c.wake), end = toMin(c.sleep);
  if (end <= start) end = 24 * 60;
  if (fromMin != null) start = Math.max(start, fromMin);
  const busy = dayBlocks(date).filter((b) => b.src !== 'auto').map((b) => [toMin(b.start), toMin(b.end) <= toMin(b.start) ? 24 * 60 : toMin(b.end)]).sort((a, b) => a[0] - b[0]);
  const out = []; let cur = start;
  for (const [s, e] of busy) { if (e <= cur) continue; if (s > cur) out.push([cur, Math.min(s, end)]); cur = Math.max(cur, e); if (cur >= end) break; }
  if (cur < end) out.push([cur, end]);
  return out.filter(([s, e]) => e - s >= 15);
}
// Minutos estudiados de un tema en la semana de una fecha (cronómetro)
export function studiedMin(topicId, date = fmt.today()) {
  const mon = mondayOf(date), sun = addDays(mon, 6);
  return store.list('timeLogs').filter((l) => l.topic === topicId && l.date >= mon && l.date <= sun).reduce((a, l) => a + (Number(l.minutes) || 0), 0);
}
// Minutos de estudio ya planeados (bloques en agenda) para un tema desde una fecha hasta el domingo, sin contar 'auto' del día que se reorganiza
function plannedStudy(topicId, from, skipDate) {
  const sun = addDays(mondayOf(from), 6); const start = fmt.today() > mondayOf(from) ? fmt.today() : mondayOf(from);
  return store.list('agenda').filter((a) => a.topic === topicId && a.date >= start && a.date <= sun && !a.done && !(a.date === skipDate && a.src === 'auto'))
    .reduce((x, a) => x + Math.max(0, toMin(a.end) - toMin(a.start)), 0);
}
// Lo que hay por hacer: tareas pendientes + estudio que falta en la semana
export function candidates(date) {
  const tasks = store.list('tareas').filter((t) => !t.done && !(t.project && ['pausado', 'futuro', 'idea', 'terminado'].includes(store.get('proyectos', t.project)?.status)))
    .filter((t) => !store.list('agenda').some((a) => a.task === t.id && !a.done && !(a.date === date && a.src === 'auto') && a.date >= fmt.today()))
    .map((t) => {
      let s = score(t);
      if (t.due) { const d = Math.round((new Date(t.due + 'T12:00') - new Date(date + 'T12:00')) / 864e5); if (d <= 0) s += 10; else if (d <= 2) s += 5; }
      return { kind: 'task', id: t.id, title: t.title, minutes: Math.max(15, Number(t.minutes) || 30), score: s, cat: 'trabajo' };
    });
  const daysLeft = 7 - weekday(date);
  const study = store.list('topics').filter((t) => t.type !== 'fija' && Number(t.hoursWeek) > 0).map((t) => {
    const need = Number(t.hoursWeek) * 60 - studiedMin(t.id, date) - plannedStudy(t.id, date, date);
    const today = Math.ceil(Math.max(0, need) / daysLeft / 15) * 15;
    return { kind: 'study', id: t.id, title: '📚 ' + t.name, minutes: Math.min(today, cfg().chunk * 2), score: score(t) + (t.type === 'obligatoria' ? 5 : 0), cat: 'estudio' };
  }).filter((x) => x.minutes >= 15);
  return [...tasks, ...study].sort((a, b) => b.score - a.score);
}
// Organiza un día: borra lo que había puesto el organizador ese día y vuelve a llenar los huecos. Devuelve lo creado.
export function organize(date, { fromNow = true } = {}) {
  for (const a of store.list('agenda').filter((x) => x.date === date && x.src === 'auto' && !x.done)) store.remove('agenda', a.id);
  const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
  const from = date === fmt.today() && fromNow ? Math.ceil((nowMin + 5) / 15) * 15 : null;
  const slots = freeSlots(date, from).map(([s, e]) => ({ s, e }));
  const { gap, chunk } = cfg();
  const made = [];
  for (const c of candidates(date)) {
    let left = c.minutes;
    while (left >= 15) {
      const piece = Math.min(left, c.kind === 'study' ? chunk : left);
      const slot = slots.find((x) => x.e - x.s >= piece) || (c.kind === 'study' ? slots.find((x) => x.e - x.s >= 30) : null);
      if (!slot) break;
      const len = Math.min(piece, slot.e - slot.s);
      const rec = store.add('agenda', { date, start: toHM(slot.s), end: toHM(slot.s + len), title: c.title, cat: c.cat, src: 'auto', ...(c.kind === 'task' ? { task: c.id } : { topic: c.id }) });
      made.push(rec);
      slot.s += len + gap; left -= len;
      if (c.kind === 'task') break; // una tarea va en un solo bloque
    }
  }
  return made;
}
// Organiza varios días de una vez: primero limpia lo automático de todos para repartir parejo
export function organizeRange(dates) {
  for (const d of dates) for (const a of store.list('agenda').filter((x) => x.date === d && x.src === 'auto' && !x.done)) store.remove('agenda', a.id);
  return dates.flatMap((d) => organize(d));
}
export function undoOrganize(made) { for (const r of made) store.remove('agenda', r.id); }
// Bloque que está pasando ahora y el siguiente
export function nowNext(date = fmt.today()) {
  const n = new Date(); const m = n.getHours() * 60 + n.getMinutes();
  const bs = dayBlocks(date);
  return { now: bs.find((b) => toMin(b.start) <= m && m < (toMin(b.end) || 1440)), next: bs.find((b) => toMin(b.start) > m) };
}
// Choques: dos bloques que se pisan
export function overlaps(date) {
  const bs = dayBlocks(date); const out = [];
  for (let i = 1; i < bs.length; i++) if (toMin(bs[i].start) < toMin(bs[i - 1].end)) out.push([bs[i - 1], bs[i]]);
  return out;
}
// Resumen compacto para Harvey
export function planSnapshot(date = fmt.today()) {
  const f = (b) => `${b.start}-${b.end} ${b.title}${b.fixed ? ' 🔒' : ''}${b.done ? ' ✓' : ''}`;
  return {
    hoy: dayBlocks(date).map(f), manana: dayBlocks(addDays(date, 1)).map(f),
    tareas_top: store.list('tareas').filter((t) => !t.done).sort((a, b) => score(b) - score(a)).slice(0, 12).map((t) => `${t.title} (${t.imp || 3}×${t.urg || 3}${t.due ? ', para ' + t.due : ''})`),
    proyectos: store.list('proyectos').filter((p) => p.status !== 'terminado').map((p) => `${p.name} [${p.status}]`),
  };
}
// Horas de un tema: una clase fija necesita sus horas de clase y cuenta las clases marcadas ✓ en NEXO Plan
export function topicNeed(t) { return t.type === 'fija' ? (Number(t.classMinutes) || 60) * (t.classDays || []).length : Math.round((Number(t.hoursWeek) || 0) * 60); }
export function topicDone(t, date = fmt.today()) {
  let m = studiedMin(t.id, date);
  if (t.type === 'fija') { const mon = mondayOf(date); for (let i = 0; i < 7; i++) { const d = addDays(mon, i); if ((store.get('hechos', d)?.keys || []).includes('c:' + t.id)) m += Number(t.classMinutes) || 60; } }
  return m;
}
