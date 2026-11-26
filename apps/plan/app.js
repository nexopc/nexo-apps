// NEXO Plan · tu tiempo
import { boot, fromSchema, store, fmt, esc, h, openForm, toast, weekStart, isoDay, mins } from '../../core/shell.js';

const VERSION = '1.0.0';
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const PRI = { alta: 0, media: 1, baja: 2 };
const KIND_COLOR = { Colegio: '#4EA8FF', Trabajo: '#FF8A1F', Estudio: '#FFC23D', Clientes: '#FF4F9A', Ejercicio: '#18C27A', Descanso: '#8E99AD', Otro: '#9B5CFF' };
const nowHM = () => new Date().toTimeString().slice(0, 5);
const todayDow = () => String(new Date().getDay());

function weekDates() { const s = weekStart(); return [...Array(7)].map((_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return isoDay(d); }); }
function streak(habitId) {
  const logs = new Set(store.list('habitLogs').filter((l) => l.habit === habitId).map((l) => l.date));
  let n = 0; const d = new Date();
  if (!logs.has(isoDay(d))) d.setDate(d.getDate() - 1);
  while (logs.has(isoDay(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function weekStats() {
  const days = weekDates();
  const planned = store.list('blocks').reduce((a, b) => a + mins(b.start, b.end), 0);
  const done = store.list('hours').filter((x) => days.includes(x.date)).reduce((a, x) => a + (Number(x.minutes) || 0), 0);
  const tasks = store.list('tasks');
  const tDone = tasks.filter((t) => t.done && t.doneAt && days.includes(t.doneAt.slice(0, 10))).length;
  const habits = store.list('habits');
  const logs = store.list('habitLogs').filter((l) => days.includes(l.date));
  const elapsed = ((new Date().getDay() + 6) % 7) + 1;
  const habitPct = habits.length ? Math.round((logs.length / (habits.length * elapsed)) * 100) : 0;
  return { planned, done, pct: planned ? Math.min(100, Math.round((done / planned) * 100)) : 0, tDone, tOpen: tasks.filter((t) => !t.done).length, habitPct };
}

// ---------- Horario semanal ----------
const horario = fromSchema('blocks', { id: 'horario', title: 'Horario', icon: '🗓', single: 'bloque',
  preset: () => ({ day: todayDow() }),
  render(el) {
    const blocks = store.list('blocks');
    const t = todayDow();
    el.innerHTML = `<div class="week">${ORDER.map((d) => {
      const list = blocks.filter((b) => b.day === String(d)).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
      const total = list.reduce((a, b) => a + mins(b.start, b.end), 0);
      return `<section class="day ${String(d) === t ? 'today' : ''}"><header><b>${DAYS[d]}</b><span class="muted num">${total ? fmt.hours(total) : ''}</span></header>
        ${list.map((b) => `<button class="blk" data-id="${b.id}" style="--k:${KIND_COLOR[b.kind] || 'var(--accent)'}"><span class="num">${esc(b.start || '')}–${esc(b.end || '')}</span>${esc(b.title)}</button>`).join('') || '<p class="muted none">Libre</p>'}
        <button class="add-blk" data-day="${d}" aria-label="Agregar bloque el ${DAYS[d]}">＋</button></section>`;
    }).join('')}</div>`;
    el.onclick = (e) => {
      const b = e.target.closest('.blk'); if (b) return openForm(horario, store.get('blocks', b.dataset.id));
      const a = e.target.closest('.add-blk'); if (a) openForm(horario, null, { day: a.dataset.day });
    };
    // en móvil, desplaza al día de hoy
    setTimeout(() => el.querySelector('.day.today')?.scrollIntoView({ inline: 'start', block: 'nearest' }), 50);
  } });

// ---------- Agenda ----------
const agenda = fromSchema('events', { id: 'agenda', title: 'Agenda', icon: '📅', single: 'evento',
  sort: (a, b) => (a.date || '').localeCompare(b.date || ''),
  titleOf: (r) => r.title, subOf: (r) => `${fmt.date(r.date)}${r.time ? ' · ' + r.time : ''}`,
  sideOf: (r) => { const d = Math.round((new Date(r.date + 'T12:00') - new Date(fmt.today() + 'T12:00')) / 864e5); return d < 0 ? '<span class="chip">pasó</span>' : d === 0 ? '<span class="chip s-pending">hoy</span>' : `<span class="chip s-edit">en ${d} d</span>`; } });

// ---------- Metas: mandala 64 + línea de 4 años ----------
const metas = fromSchema('goals', { id: 'metas', title: 'Metas', icon: '🎯', single: 'meta',
  render(el, api) {
    const goals = store.list('goals');
    const central = goals.find((g) => g.level === 'central');
    const pillars = goals.filter((g) => g.level === 'pilar').slice(0, 8);
    const actionsOf = (p) => goals.filter((g) => g.level === 'accion' && g.parent === p.id).slice(0, 8);
    const hitos = goals.filter((g) => g.level === 'hito').sort((a, b) => (a.due || '').localeCompare(b.due || ''));
    // Mandala 9x9: bloque central = meta + 8 pilares; bloques externos = pilar + 8 acciones
    const POS = [0, 1, 2, 3, 5, 6, 7, 8]; // posiciones alrededor del centro (4)
    const cell = (g, cls = '') => g ? `<button class="mc ${cls} ${g.done ? 'done' : ''}" data-id="${g.id}" title="${esc(g.title)}"><span>${esc(g.title)}</span>${g.progress ? `<i style="width:${Math.min(100, g.progress)}%"></i>` : ''}</button>` : `<span class="mc empty-c"></span>`;
    const blocks = [...Array(9)].map((_, bi) => {
      if (bi === 4) return [...Array(9)].map((_, ci) => ci === 4 ? cell(central, 'core') : cell(pillars[POS.indexOf(ci)], 'pillar')).join('');
      const p = pillars[POS.indexOf(bi)];
      if (!p) return [...Array(9)].map(() => '<span class="mc empty-c"></span>').join('');
      const acts = actionsOf(p);
      return [...Array(9)].map((_, ci) => ci === 4 ? cell(p, 'pillar') : cell(acts[POS.indexOf(ci)])).join('');
    });
    const done = goals.filter((g) => g.level === 'accion' && g.done).length;
    el.innerHTML = `
      <div class="tabs"><button aria-pressed="true" data-t="m">Mandala 64</button><button data-t="l">Línea de 4 años</button><button data-t="all">Todas</button></div>
      <div data-p="m"><p class="muted" style="margin:0 0 10px">${central ? `<b style="color:var(--fg)">${esc(central.title)}</b> · ${done}/64 acciones cumplidas` : 'Empieza creando tu <b>meta central</b> (nivel "Meta central"), luego 8 pilares y 8 acciones por pilar.'}</p>
        <div class="mandala-wrap"><div class="mandala">${blocks.map((b, i) => `<div class="mb ${i === 4 ? 'center' : ''}">${b}</div>`).join('')}</div></div></div>
      <div data-p="l" hidden><div class="timeline">${hitos.map((g) => `<button class="hito ${g.done ? 'done' : ''}" data-id="${g.id}"><span class="dot"></span><span class="num muted">${fmt.date(g.due) || 'sin fecha'} ${g.due ? g.due.slice(0, 4) : ''}</span><b>${esc(g.title)}</b><span class="bar"><i style="width:${g.progress || 0}%"></i></span></button>`).join('') || '<div class="empty"><b>Sin hitos todavía</b>Crea metas con nivel "Hito" y fecha (6 meses, 1 año, 2 años, 4 años).</div>'}</div></div>
      <div data-p="all" hidden id="allgoals"></div>`;
    api.renderList(el.querySelector('#allgoals'), { ...metas, titleOf: (r) => r.title, subOf: (r) => `${{ central: 'Central', pilar: 'Pilar', accion: 'Acción', hito: 'Hito' }[r.level] || ''} ${r.due ? '· ' + fmt.date(r.due) : ''}`, sideOf: (r) => `${r.progress || 0}%`, render: null });
    el.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; el.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); el.querySelectorAll('[data-p]').forEach((p) => (p.hidden = p.dataset.p !== b.dataset.t)); };
    el.addEventListener('click', (e) => { const c = e.target.closest('.mc[data-id], .hito[data-id]'); if (c) openForm(metas, store.get('goals', c.dataset.id)); });
  } });

// ---------- Hábitos ----------
const habitos = fromSchema('habits', { id: 'habitos', title: 'Hábitos', icon: '🔥', single: 'hábito',
  render(el) {
    const habits = store.list('habits');
    const days = weekDates();
    const logs = store.list('habitLogs');
    if (!habits.length) { el.innerHTML = '<div class="empty"><b>Sin hábitos todavía</b>Toca ＋ para crear tu primer hábito (ejercicio, inglés, leer…).</div>'; return; }
    el.innerHTML = `<div class="list">${habits.map((hb) => {
      const s = streak(hb.id);
      return `<div class="card habit"><div class="hh"><button class="hname" data-edit="${hb.id}">${esc(hb.emoji || '•')} ${esc(hb.name)}</button><span class="chip ${s ? 's-pending' : ''}">🔥 ${s} día${s === 1 ? '' : 's'}</span></div>
        <div class="hdays">${days.map((d, i) => { const on = logs.some((l) => l.habit === hb.id && l.date === d); const fut = d > fmt.today(); return `<button class="hd ${on ? 'on' : ''} ${d === fmt.today() ? 'is-today' : ''}" data-h="${hb.id}" data-d="${d}" ${fut ? 'disabled' : ''} aria-pressed="${on}" aria-label="${DAYS[ORDER[i]]}">${DAYS[ORDER[i]][0]}</button>`; }).join('')}</div></div>`;
    }).join('')}</div>`;
    el.onclick = (e) => {
      const d = e.target.closest('.hd'); if (d) {
        const ex = store.list('habitLogs').find((l) => l.habit === d.dataset.h && l.date === d.dataset.d);
        ex ? store.remove('habitLogs', ex.id) : store.add('habitLogs', { habit: d.dataset.h, date: d.dataset.d, value: 1 });
        navigator.vibrate?.(12); return;
      }
      const ed = e.target.closest('[data-edit]'); if (ed) openForm(habitos, store.get('habits', ed.dataset.edit));
    };
  } });

// ---------- Tareas ----------
let taskTab = 'open';
const tareas = fromSchema('tasks', { id: 'tareas', title: 'Tareas', icon: '✅', single: 'tarea', checkField: 'done',
  filter: (r) => (taskTab === 'open' ? !r.done : r.done),
  sort: (a, b) => (PRI[a.priority] ?? 1) - (PRI[b.priority] ?? 1) || (a.due || '9').localeCompare(b.due || '9'),
  subOf: (r) => [r.project, r.due ? '📅 ' + fmt.date(r.due) : ''].filter(Boolean).map(esc).join(' · '),
  sideOf: (r) => `<span class="chip ${r.priority === 'alta' ? 's-delete' : r.priority === 'baja' ? 's-create' : 's-pending'}">${esc(r.priority || 'media')}</span>`,
  render(el, api) {
    el.innerHTML = `<div class="tabs"><button data-t="open" aria-pressed="${taskTab === 'open'}">Pendientes</button><button data-t="done" aria-pressed="${taskTab === 'done'}">Hechas</button></div><div id="tl"></div>`;
    api.renderList(el.querySelector('#tl'), tareas);
    el.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { taskTab = b.dataset.t; api.paint(); } };
  } });

// ---------- Horas cumplidas (con cronómetro) ----------
let timer = JSON.parse(localStorage.getItem('nexo:plan:timer') || 'null');
const horas = fromSchema('hours', { id: 'horas', title: 'Horas', icon: '⏱', single: 'registro de horas',
  sort: (a, b) => (b.date || '').localeCompare(a.date || ''),
  titleOf: (r) => r.title, subOf: (r) => fmt.date(r.date), sideOf: (r) => fmt.hours(Number(r.minutes) || 0),
  render(el, api) {
    const s = weekStats();
    el.innerHTML = `<div class="grid k" style="margin-bottom:14px">
      <div class="card kpi"><div class="v num">${fmt.hours(s.done)}</div><div class="l">cumplidas esta semana</div></div>
      <div class="card kpi"><div class="v num">${fmt.hours(s.planned)}</div><div class="l">planeadas en tu horario</div></div>
      <div class="card kpi"><div class="v num">${s.pct}%</div><div class="l">cumplimiento</div><div class="bar" style="margin-top:8px"><i style="width:${s.pct}%"></i></div></div></div>
      <div class="card timer"><div><b>Cronómetro</b><div class="muted" id="tlabel">${timer ? esc(timer.title) : 'Mide lo que estás haciendo ahora'}</div></div>
        <div class="tclock num" id="tclock">00:00</div>
        ${timer ? '<button class="btn btn-delete" data-a="stop">■ Detener y guardar</button>' : '<button class="btn btn-create" data-a="start">▶ Empezar</button>'}</div>
      <div class="section"><h2>Registros</h2><div id="hl"></div></div>`;
    api.renderList(el.querySelector('#hl'), { ...horas, render: null });
    const tick = () => { if (!timer) return; const m = Math.floor((Date.now() - timer.t0) / 1000); const c = el.querySelector('#tclock'); if (c?.isConnected) { c.textContent = `${String(Math.floor(m / 3600)).padStart(2, '0')}:${String(Math.floor(m / 60) % 60).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; requestAnimationFrame(() => setTimeout(tick, 1000)); } };
    tick();
    el.querySelector('.timer').onclick = async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'start') {
        const t = todayDow(); const n = nowHM();
        const cur = store.list('blocks').find((b) => b.day === t && b.start <= n && b.end > n);
        timer = { t0: Date.now(), title: cur?.title || 'Trabajo enfocado', block: cur?.id || '' };
        localStorage.setItem('nexo:plan:timer', JSON.stringify(timer)); api.paint();
      }
      if (a === 'stop') {
        const m = Math.max(1, Math.round((Date.now() - timer.t0) / 60000));
        store.add('hours', { title: timer.title, minutes: m, date: fmt.today(), block: timer.block });
        timer = null; localStorage.removeItem('nexo:plan:timer'); toast(`Guardado: ${fmt.hours(m)}`);
      }
    };
  } });

// ---------- Diario ----------
const diario = fromSchema('journal', { id: 'diario', title: 'Diario', icon: '📓', single: 'entrada',
  sort: (a, b) => (b.date || '').localeCompare(a.date || ''),
  titleOf: (r) => `${r.mood || '📓'} ${fmt.date(r.date)}`, subOf: (r) => esc((r.good || r.learn || '').slice(0, 90)), sideOf: (r) => (r.private ? '🔒' : '') });

// ---------- Estadísticas ----------
const stats = { id: 'stats', title: 'Estadísticas', icon: '📊',
  render(el) {
    const s = weekStats();
    const days = weekDates();
    const perDay = days.map((d) => store.list('hours').filter((x) => x.date === d).reduce((a, x) => a + (Number(x.minutes) || 0), 0));
    const plannedDay = ORDER.map((d) => store.list('blocks').filter((b) => b.day === String(d)).reduce((a, b) => a + mins(b.start, b.end), 0));
    const max = Math.max(60, ...perDay, ...plannedDay);
    el.innerHTML = `<div class="grid k">
      <div class="card kpi"><div class="v num">${s.pct}%</div><div class="l">horario cumplido</div></div>
      <div class="card kpi"><div class="v num">${s.habitPct}%</div><div class="l">hábitos de la semana</div></div>
      <div class="card kpi"><div class="v num">${s.tDone}</div><div class="l">tareas hechas esta semana</div></div>
      <div class="card kpi"><div class="v num">${s.tOpen}</div><div class="l">tareas pendientes</div></div></div>
      <div class="card section"><h3>Horas por día · cumplidas vs planeadas</h3>
        <div class="chart">${days.map((d, i) => `<div class="col"><div class="bars"><i class="pl" style="height:${(plannedDay[i] / max) * 100}%"></i><i class="dn" style="height:${(perDay[i] / max) * 100}%" title="${fmt.hours(perDay[i])}"></i></div><span class="muted">${DAYS[ORDER[i]]}</span></div>`).join('')}</div>
        <div class="row muted" style="font-size:12px;margin-top:8px"><span><i class="sw pl"></i> planeado</span><span><i class="sw dn"></i> cumplido</span></div></div>
      <div class="row" style="margin-top:14px"><button class="btn btn-ai" data-a="ask">🟣 Pedirle a Donna un análisis</button></div>`;
    el.querySelector('[data-a=ask]').onclick = () => import('../../core/shell.js').then((m) => m.openHarvey('Donna: analiza mis estadísticas de esta semana en NEXO Plan y dime 3 ajustes concretos para la próxima.'));
  } };

// ---------- Inicio ----------
function home(el, api) {
  const t = todayDow(); const n = nowHM();
  const today = store.list('blocks').filter((b) => b.day === t).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const cur = today.find((b) => b.start <= n && b.end > n);
  const next = today.find((b) => b.start > n);
  const s = weekStats();
  const tasks = store.list('tasks').filter((x) => !x.done).sort((a, b) => (PRI[a.priority] ?? 1) - (PRI[b.priority] ?? 1)).slice(0, 5);
  const habits = store.list('habits');
  const logs = store.list('habitLogs').filter((l) => l.date === fmt.today());
  const events = store.list('events').filter((e) => e.date >= fmt.today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  el.innerHTML = `
    <div class="page-title"><div><p class="muted" style="margin:0;text-transform:capitalize">${fmt.day()}</p><h1>Tu tiempo</h1></div></div>
    <div class="now card" style="--k:${KIND_COLOR[cur?.kind] || 'var(--accent)'}">
      <span class="eyebrow">AHORA · ${n}</span>
      <h2>${cur ? esc(cur.title) : 'Tiempo libre'}</h2>
      <p class="muted" style="margin:4px 0 0">${cur ? `${cur.start}–${cur.end}` : ''}${next ? `${cur ? ' · ' : ''}Sigue: <b style="color:var(--fg)">${esc(next.title)}</b> a las ${next.start}` : today.length ? ' · No hay más bloques hoy' : 'Arma tu horario en 🗓 Horario'}</p>
      <div class="bar" style="margin-top:12px"><i style="width:${cur ? Math.round((mins(cur.start, n) / Math.max(1, mins(cur.start, cur.end))) * 100) : 0}%;background:var(--k)"></i></div>
    </div>
    <div class="grid k" style="margin-top:12px">
      <div class="card kpi"><div class="v num">${s.pct}%</div><div class="l">semana cumplida</div><div class="bar" style="margin-top:8px"><i style="width:${s.pct}%"></i></div></div>
      <div class="card kpi"><div class="v num">${logs.length}/${habits.length}</div><div class="l">hábitos hoy</div></div>
      <div class="card kpi"><div class="v num">${s.tOpen}</div><div class="l">tareas pendientes</div></div>
    </div>
    <div class="grid" style="margin-top:12px">
      <div class="card"><h3>✅ Lo más importante</h3><div id="ht"></div><button class="btn btn-create ghost sm" style="margin-top:10px" data-a="newtask">＋ Tarea</button></div>
      <div class="card"><h3>🔥 Hábitos de hoy</h3><div class="hq">${habits.map((hb) => { const on = logs.some((l) => l.habit === hb.id); return `<button class="hqb ${on ? 'on' : ''}" data-h="${hb.id}" aria-pressed="${on}">${esc(hb.emoji || '•')} ${esc(hb.name)}</button>`; }).join('') || '<p class="muted" style="margin:0">Crea hábitos en 🔥 Hábitos</p>'}</div></div>
      <div class="card"><h3>📅 Próximo</h3>${events.map((e) => `<div class="li-sub" style="padding:4px 0"><b style="color:var(--fg)">${fmt.date(e.date)}</b> · ${esc(e.title)}</div>`).join('') || '<p class="muted" style="margin:0">Sin eventos próximos</p>'}</div>
    </div>`;
  api.renderList(el.querySelector('#ht'), { ...tareas, filter: (r) => !r.done && tasks.some((x) => x.id === r.id), render: null, emptyTitle: 'Todo al día', emptyText: 'No tienes tareas pendientes.' });
  el.querySelector('[data-a=newtask]').onclick = () => openForm(tareas);
  el.querySelector('.hq').onclick = (e) => {
    const b = e.target.closest('[data-h]'); if (!b) return;
    const ex = store.list('habitLogs').find((l) => l.habit === b.dataset.h && l.date === fmt.today());
    ex ? store.remove('habitLogs', ex.id) : store.add('habitLogs', { habit: b.dataset.h, date: fmt.today(), value: 1 });
  };
}

boot({ appId: 'plan', version: VERSION, home, modules: [horario, tareas, habitos, agenda, metas, horas, diario, stats] });
