// NEXO Plan · tu tiempo — horario base (fijo/flexible), días ajustados, proyectos y tareas por importancia × urgencia.
import { boot, fromSchema, store, fmt, esc, h, openForm, toast, sheet, confirmSheet, openHarvey, openTimer } from '../../core/shell.js';
import { CATS, DAYS, toMin, toHM, weekday, addDays, mondayOf, score, cfg, setCfg, baseFor, dayBlocks, materialize, toggleDone, organize, undoOrganize, nowNext, overlaps, freeSlots } from '../../core/planner.js';

const VERSION = '2.0.0';
let day = fmt.today();
const dayLabel = (d) => { const t = fmt.today(); return d === t ? 'Hoy' : d === addDays(t, 1) ? 'Mañana' : d === addDays(t, -1) ? 'Ayer' : DAYS[weekday(d)]; };
const catOf = (c) => CATS[c] || CATS.trabajo;
const dur = (b) => { const m = (toMin(b.end) <= toMin(b.start) ? 1440 : toMin(b.end)) - toMin(b.start); return m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) : ''}` : m + ' min'; };
const SRC = { base: 'horario base', clase: 'clase (Aprende)', dia: 'día ajustado', manual: 'agregado', auto: '⚡ organizador', harvey: '🟣 Harvey', claude: '🗓 semana base' };
const CAT_OPTS = Object.entries(CATS).map(([k, [i]]) => [k, i + ' ' + k[0].toUpperCase() + k.slice(1)]);

// ---------- Módulos de datos ----------
const bloquesMod = fromSchema('bloques', { id: 'horario', title: 'Horario base', icon: '🗓', single: 'bloque del horario base',
  validate: (d) => (toMin(d.end) <= toMin(d.start) && d.end !== '00:00' ? 'La hora de terminar debe ser después de la de empezar' : null) });
const agendaMod = fromSchema('agenda', { id: 'agenda-x', title: 'Bloque', single: 'bloque',
  validate: (d) => (toMin(d.end) <= toMin(d.start) && d.end !== '00:00' ? 'La hora de terminar debe ser después de la de empezar' : null) });
const tareasMod = fromSchema('tareas', { id: 'tareas', title: 'Tareas', icon: '✅', single: 'tarea', checkField: 'done',
  filter: (r) => (tareasMod.tab === 'hechas' ? r.done : !r.done),
  sort: (a, b) => (a.done - b.done) || score(b) - score(a) || (a.due || '9').localeCompare(b.due || '9'),
  titleOf: (r) => r.title,
  subOf: (r) => [store.get('proyectos', r.project)?.name, r.minutes ? r.minutes + ' min' : '', r.due ? 'para ' + fmt.date(r.due) : ''].filter(Boolean).map(esc).join(' · '),
  sideOf: (r) => { const s = score(r); return `<span class="chip ${s >= 16 ? 's-delete' : s >= 9 ? 's-pending' : ''}" title="importancia × urgencia">${r.imp || 3}×${r.urg || 3} = ${s}</span>`; },
  render(el, api) {
    const pend = store.list('tareas').filter((t) => !t.done).length;
    el.innerHTML = `<div class="tabs">${[['pendientes', `Pendientes · ${pend}`], ['hechas', 'Hechas']].map(([k, l]) => `<button data-t="${k}" aria-pressed="${(tareasMod.tab || 'pendientes') === k}">${l}</button>`).join('')}</div>
      <p class="muted" style="font-size:13px;margin:0 0 10px">Orden = importancia × urgencia (1 a 5). Tareas pequeñas de 15–45 min. ⚡ Organizar las pone en tus huecos libres.</p><div id="tl"></div>`;
    api.renderList(el.querySelector('#tl'), { ...tareasMod, render: null });
    el.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { tareasMod.tab = b.dataset.t; api.paint(); } };
  } });
const proyMod = fromSchema('proyectos', { id: 'proyectos', title: 'Proyectos', icon: '🚀', single: 'proyecto',
  render(el) {
    const ps = store.list('proyectos');
    const groups = [['activo', '🟢 Activos'], ['futuro', '📅 Empiezan después'], ['pausado', '⏸ Pausados'], ['idea', '💡 Ideas'], ['terminado', '✅ Terminados']];
    el.innerHTML = `<form class="nq" data-idea><input name="q" placeholder="💡 Idea rápida… escribe y Enter" autocomplete="off" enterkeyhint="done"><button class="btn btn-create sm">Guardar</button></form>
      ${groups.map(([k, l]) => { const list = ps.filter((p) => (p.status || 'activo') === k); if (!list.length) return '';
        return `<div class="section"><h2>${l} · ${list.length}</h2><div class="grid">${list.map((p) => { const ts = store.list('tareas').filter((t) => t.project === p.id); const dn = ts.filter((t) => t.done).length;
          return `<button class="card proj" data-p="${p.id}" style="--k:${esc(p.color || 'var(--accent)')}"><b>${esc(p.name)}</b>
            <span class="muted" style="font-size:13px">${k === 'futuro' && p.start ? 'Empieza ' + fmt.date(p.start) + ' · ' : ''}${ts.length ? `${dn}/${ts.length} tareas` : k === 'idea' ? 'Toca para volverla proyecto' : 'Sin tareas: pártelo en pasos pequeños'}</span>
            ${ts.length ? `<div class="bar"><i style="width:${(dn / ts.length) * 100}%;background:var(--k)"></i></div>` : ''}</button>`; }).join('')}</div></div>`; }).join('') || '<div class="empty section"><b>Sin proyectos</b>Escribe una idea arriba o toca ＋. Cada proyecto se parte en tareas pequeñas.</div>'}`;
    el.querySelector('[data-idea]').addEventListener('submit', (e) => { e.preventDefault(); const v = e.target.q.value.trim(); if (!v) return; store.add('proyectos', { name: v, status: 'idea' }); e.target.q.value = ''; toast('💡 Idea guardada'); });
    el.onclick = (e) => { const c = e.target.closest('[data-p]'); if (c) projectSheet(store.get('proyectos', c.dataset.p)); };
  } });

function projectSheet(p) {
  if (!p) return;
  const body = h('<div class="form"></div>');
  let un = null;
  const s = sheet(p.name, body, { onClose: () => un?.() });
  const paint = () => {
    p = store.get('proyectos', p.id); if (!p) { s.close(); return; }
    const ts = store.list('tareas').filter((t) => t.project === p.id).sort((a, b) => (a.done - b.done) || score(b) - score(a));
    body.innerHTML = `<div class="seg" data-st>${[['idea', '💡 Idea'], ['activo', '🟢 Activo'], ['pausado', '⏸ Pausado'], ['futuro', '📅 Después'], ['terminado', '✅ Listo']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${(p.status || 'activo') === k}">${l}</button>`).join('')}</div>
      ${p.status === 'futuro' ? `<div class="field"><label for="ps">Empieza</label><input id="ps" type="date" value="${esc(p.start || '')}"></div>` : ''}
      ${p.goal ? `<p class="muted" style="margin:0">🎯 ${esc(p.goal)}</p>` : ''}
      <form class="nq" data-t><input name="q" placeholder="＋ Paso pequeño (Enter)" autocomplete="off" enterkeyhint="done"><button class="btn btn-create sm">＋</button></form>
      <div class="list">${ts.map((t) => `<div class="list-item" data-task="${t.id}"><button class="check" data-check="${t.id}" aria-pressed="${!!t.done}" aria-label="Marcar">✓</button><div class="li-main"><div class="li-title" ${t.done ? 'style="text-decoration:line-through;opacity:.6"' : ''}>${esc(t.title)}</div><div class="li-sub">${t.minutes || 30} min</div></div><span class="chip">${t.imp || 3}×${t.urg || 3}</span></div>`).join('') || '<p class="muted" style="margin:0">Sin pasos todavía.</p>'}</div>
      ${p.status === 'pausado' || p.status === 'futuro' || p.status === 'idea' ? '<p class="muted" style="font-size:12px;margin:0">Mientras no esté activo, sus tareas no entran al organizador.</p>' : ''}
      <div class="row end"><button type="button" class="btn btn-ai ghost sm" data-a="mike">🟣 Mike: pártelo en pasos</button><button type="button" class="btn btn-edit ghost sm" data-a="edit">✎ Editar</button></div>`;
  };
  paint();
  un = store.subscribe('*', (col) => { if (col === 'tareas' || col === 'proyectos') paint(); });
  body.addEventListener('submit', (e) => { e.preventDefault(); const f = e.target; if (!f.matches('[data-t]')) return; const v = f.q.value.trim(); if (!v) return;
    store.add('tareas', { title: v, project: p.id, imp: 3, urg: 3, minutes: 30, done: false }); f.q.value = ''; f.q.focus(); });
  body.addEventListener('change', (e) => { if (e.target.id === 'ps') store.update('proyectos', p.id, { start: e.target.value }); });
  body.addEventListener('click', (e) => {
    const st = e.target.closest('[data-st] [data-v]'); if (st) { store.update('proyectos', p.id, { status: st.dataset.v }); toast('Estado: ' + st.textContent.trim()); return; }
    const c = e.target.closest('[data-check]'); if (c) { const t = store.get('tareas', c.dataset.check); store.update('tareas', t.id, { done: !t.done, doneAt: !t.done ? new Date().toISOString() : null }); navigator.vibrate?.(8); return; }
    const it = e.target.closest('[data-task]'); if (it) return openForm(tareasMod, store.get('tareas', it.dataset.task));
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'edit') openForm(proyMod, p);
    if (a === 'mike') openHarvey(`Mike: parte mi proyecto "${p.name}" en 5 a 8 tareas pequeñas de 15 a 45 minutos, con importancia y urgencia de 1 a 5, y créalas en la colección tareas con project = ${p.id}.`);
  });
}

// ---------- Editar un bloque del día ----------
function blockSheet(date, blk) {
  const isBase = blk.src === 'base' || blk.src === 'clase';
  const body = h(`<form class="form" novalidate>
    <div class="row" style="justify-content:space-between"><span class="chip">${esc(SRC[blk.src] || blk.src)}${blk.fixed ? ' · 🔒 fijo' : ''}</span><span class="muted num">${dayLabel(date)}</span></div>
    <div class="field"><label for="bt">Bloque</label><input id="bt" value="${esc(blk.title)}"></div>
    <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="field" style="flex:1"><label for="bs">Empieza</label><input id="bs" type="time" value="${esc(blk.start)}"></div><div class="field" style="flex:1"><label for="be">Termina</label><input id="be" type="time" value="${esc(blk.end)}"></div></div>
    <div class="row"><button type="button" class="btn btn-cancel ghost sm" data-sh="-15">−15 min</button><button type="button" class="btn btn-cancel ghost sm" data-sh="15">+15 min</button><button type="button" class="btn btn-cancel ghost sm" data-sh="60">+1 h</button></div>
    <div class="field"><label for="bc">Tipo</label><select id="bc">${CAT_OPTS.map(([k, l]) => `<option value="${k}" ${blk.cat === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="bf" ${blk.fixed ? 'checked' : ''} style="width:22px;height:22px"> 🔒 Fijo (el organizador no lo mueve)</label>
    ${blk.src === 'base' ? `<div class="field"><label>¿Dónde aplico el cambio?</label><div class="seg" data-scope><button type="button" data-v="hoy" aria-pressed="true">Solo ${esc(dayLabel(date).toLowerCase())}</button><button type="button" data-v="todos" aria-pressed="false">Todos los ${esc(DAYS[weekday(date)].toLowerCase())}</button></div></div>` : ''}
    ${blk.src === 'clase' ? '<p class="muted" style="font-size:13px;margin:0">Es una clase fija de NEXO Aprende: aquí la cambias solo para este día. Para cambiarla siempre, edita el tema en Aprende.</p>' : ''}
    <div class="row end">
      <button type="button" class="btn btn-delete ghost" data-a="del">🗑</button>
      ${blk.task || blk.topic ? '<button type="button" class="btn btn-pending ghost" data-a="timer">▶ Cronómetro</button>' : ''}
      <button type="button" class="btn ${blk.done ? 'btn-cancel' : 'btn-create'} ghost" data-a="done">${blk.done ? '↺ No hecho' : '✓ Hecho'}</button>
      <button class="btn btn-edit">✓ Guardar</button></div></form>`);
  const s = sheet('Bloque', body);
  let scope = 'hoy';
  const read = () => ({ title: body.querySelector('#bt').value.trim() || blk.title, start: body.querySelector('#bs').value, end: body.querySelector('#be').value, cat: body.querySelector('#bc').value, fixed: body.querySelector('#bf').checked });
  const valid = (d) => { if (toMin(d.start) == null || toMin(d.end) == null) return 'Pon la hora de empezar y terminar'; if (toMin(d.end) <= toMin(d.start) && d.end !== '00:00') return 'La hora de terminar debe ser después de la de empezar'; return null; };
  const baseIdx = () => baseFor(date).findIndex((b) => b.key === blk.key);
  const apply = (d, remove = false) => {
    if (blk.src === 'manual' || blk.src === 'auto' || blk.src === 'harvey' || blk.src === 'claude') { remove ? store.remove('agenda', blk.ref) : store.update('agenda', blk.ref, { ...d, src: blk.src === 'auto' ? 'manual' : blk.src }); return; }
    if (blk.src === 'base' && scope === 'todos') {
      const b = store.get('bloques', blk.ref); if (!b) return;
      if (remove) { const days = (b.days || []).filter((x) => x !== weekday(date)); days.length ? store.update('bloques', b.id, { days }) : store.remove('bloques', b.id); }
      else store.update('bloques', b.id, d);
      return;
    }
    let idx = blk.idx;
    if (isBase) { const i = baseIdx(); materialize(date); idx = i; }
    const dd = store.get('dias', date); const blocks = (dd.blocks || []).slice();
    if (idx < 0 || idx >= blocks.length) return;
    remove ? blocks.splice(idx, 1) : (blocks[idx] = { ...blocks[idx], ...d });
    store.update('dias', date, { blocks, reason: dd.reason || 'Ajustado a mano' });
  };
  body.addEventListener('click', async (e) => {
    const sc = e.target.closest('[data-scope] [data-v]'); if (sc) { scope = sc.dataset.v; sc.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === sc)); return; }
    const sh = e.target.closest('[data-sh]');
    if (sh) { const n = Number(sh.dataset.sh); const st = body.querySelector('#bs'), en = body.querySelector('#be'); const a = toMin(st.value), b = toMin(en.value); if (a == null || b == null) return;
      const len = b - a; const ns = Math.max(0, Math.min(1440 - Math.max(15, len), a + n)); st.value = toHM(ns); en.value = toHM(ns + len); return; }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'done') { toggleDone(date, blk); navigator.vibrate?.(10); s.close(); return; }
    if (a === 'timer') { s.close(); setTimeout(() => openTimer({ label: blk.title.replace(/^📚 /, ''), kind: blk.topic ? 'estudio' : 'trabajo', topic: blk.topic || '' }), 300); return; }
    if (a === 'del') {
      const where = blk.src === 'base' && scope === 'todos' ? `todos los ${DAYS[weekday(date)].toLowerCase()}` : dayLabel(date).toLowerCase();
      if (!(await confirmSheet('¿Quitar bloque?', `"${blk.title}" se quita ${blk.src === 'base' || blk.src === 'clase' || blk.src === 'dia' ? 'de ' + where : ''}.`, { yes: 'Quitar', danger: true }))) return;
      apply(null, true); toast('Bloque quitado'); s.close();
    }
  });
  body.addEventListener('submit', (e) => { e.preventDefault(); const d = read(); const err = valid(d); if (err) return toast(err); apply(d); toast(scope === 'todos' ? 'Cambiado en el horario base' : 'Bloque guardado'); s.close(); });
}
function newBlock(date = day, preset = {}) {
  const slot = freeSlots(date, date === fmt.today() ? Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 15) * 15 : null)[0];
  const st = slot ? toHM(slot[0]) : '08:00';
  openForm(agendaMod, null, { date, start: st, end: toHM(Math.min(1439, toMin(st) + 60)), cat: 'trabajo', src: 'manual', ...preset });
}

// ---------- Organizar ----------
async function runOrganize(dates) {
  const made = [];
  for (const d of dates) made.push(...organize(d));
  if (!made.length) { toast(store.list('tareas').some((t) => !t.done) || store.list('topics').length ? 'No hay huecos libres suficientes (o todo ya está agendado)' : 'Agrega tareas o temas de estudio para organizar'); return; }
  const body = h(`<div class="form"><p style="margin:0">Puse <b>${made.length}</b> bloque${made.length > 1 ? 's' : ''} en tus huecos libres, por importancia × urgencia:</p>
    <div class="list">${made.slice(0, 14).map((r) => `<div class="list-item" style="cursor:default"><span class="num" style="min-width:92px">${dates.length > 1 ? DAYS[weekday(r.date)].slice(0, 3) + ' ' : ''}${r.start}–${r.end}</span><div class="li-main"><div class="li-title">${esc(r.title)}</div></div></div>`).join('')}</div>
    ${made.length > 14 ? `<p class="muted" style="margin:0">…y ${made.length - 14} más</p>` : ''}
    <div class="row end"><button class="btn btn-delete ghost" data-a="undo">↺ Deshacer</button><button class="btn btn-create" data-a="ok">✓ Listo</button></div></div>`);
  const s = sheet('⚡ Organizado', body);
  body.onclick = (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (a === 'undo') { undoOrganize(made); toast('Deshecho'); s.close(); } if (a === 'ok') s.close(); };
}

// ---------- Hoy ----------
function blockRow(b, date) {
  const [ic, col] = catOf(b.cat);
  const nowM = new Date().getHours() * 60 + new Date().getMinutes();
  const isNow = date === fmt.today() && toMin(b.start) <= nowM && nowM < (toMin(b.end) || 1440);
  return `<div class="blk ${b.done ? 'done' : ''} ${isNow ? 'now' : ''}" data-k="${esc(b.key)}" style="--c:${col}" tabindex="0">
    <button class="check" data-done="${esc(b.key)}" aria-pressed="${b.done}" aria-label="Marcar hecho">✓</button>
    <div class="bt num">${b.start}<small>${b.end}</small></div>
    <div class="bm"><b>${b.fixed ? '🔒 ' : ''}${esc(b.title)}</b><span class="muted">${ic} ${dur(b)}${b.src !== 'base' ? ' · ' + esc(SRC[b.src] || '') : ''}${isNow ? ' · <span class="up">ahora</span>' : ''}</span></div></div>`;
}
function home(el, api) {
  const bs = dayBlocks(day);
  const ov = overlaps(day);
  const { now, next } = nowNext();
  const tops = store.list('tareas').filter((t) => !t.done).sort((a, b) => score(b) - score(a)).slice(0, 3);
  const isToday = day === fmt.today();
  const ajustado = store.get('dias', day);
  el.innerHTML = `
    <div class="daynav"><button class="btn btn-cancel ghost sm" data-d="-1" aria-label="Día anterior">‹</button><button class="dl" data-d="0"><b>${esc(dayLabel(day))}</b><small>${esc(DAYS[weekday(day)].toLowerCase())} ${esc(fmt.date(day))}</small></button><button class="btn btn-cancel ghost sm" data-d="1" aria-label="Día siguiente">›</button></div>
    ${isToday ? `<div class="card nowc">${now ? `<span class="muted">Ahora · hasta las ${now.end}</span><b>${esc(now.title)}</b>` : '<span class="muted">Ahora</span><b>Tiempo libre</b>'}${next ? `<span class="muted" style="font-size:13px">Después: ${next.start} ${esc(next.title)}</span>` : ''}</div>` : ''}
    ${ov.length ? `<div class="card warn">⚠️ ${ov.length} choque${ov.length > 1 ? 's' : ''}: ${ov.slice(0, 2).map(([a, b]) => `${esc(a.title)} y ${esc(b.title)}`).join(' · ')}. Toca un bloque para moverlo.</div>` : ''}
    ${ajustado ? `<p class="muted" style="font-size:13px;margin:8px 0 0">Este día está ajustado${ajustado.reason ? ': ' + esc(ajustado.reason) : ''}. <button class="linkish" data-a="reset">Volver al horario base</button></p>` : ''}
    <div class="row" style="margin:12px 0"><button class="btn btn-ai" data-a="org">⚡ Organizar ${isToday ? 'desde ahora' : 'este día'}</button><button class="btn btn-create ghost" data-a="add">＋ Bloque</button></div>
    <div class="tl">${bs.map((b) => blockRow(b, day)).join('') || `<div class="empty"><b>Día vacío</b>Arma tu horario base en 🗓 Horario base (colegio, trabajo, descanso) o toca ＋ Bloque.</div>`}</div>
    <div class="section"><h2>🔥 Lo más importante</h2>${tops.map((t) => `<div class="list-item" data-task="${t.id}"><button class="check" data-tcheck="${t.id}" aria-label="Marcar hecha">✓</button><div class="li-main"><div class="li-title">${esc(t.title)}</div><div class="li-sub">${t.minutes || 30} min${t.due ? ' · para ' + fmt.date(t.due) : ''}</div></div><span class="chip">${score(t)}</span><button class="btn btn-pending ghost sm" data-play="${t.id}" aria-label="Empezar">▶</button></div>`).join('') || '<p class="muted">Sin tareas pendientes. Agrega una con ✅ Tarea.</p>'}</div>`;
  el.onclick = async (e) => {
    const d = e.target.closest('[data-d]'); if (d) { const n = Number(d.dataset.d); day = n === 0 ? fmt.today() : addDays(day, n); api.paint(); return; }
    const dn = e.target.closest('[data-done]'); if (dn) { const b = dayBlocks(day).find((x) => x.key === dn.dataset.done); if (b) { toggleDone(day, b); navigator.vibrate?.(10); } return; }
    const tc = e.target.closest('[data-tcheck]'); if (tc) { store.update('tareas', tc.dataset.tcheck, { done: true, doneAt: new Date().toISOString() }); toast('✓ Tarea hecha'); return; }
    const pl = e.target.closest('[data-play]'); if (pl) { const t = store.get('tareas', pl.dataset.play); openTimer({ label: t.title, kind: 'trabajo' }); return; }
    const bk = e.target.closest('[data-k]'); if (bk) { const b = dayBlocks(day).find((x) => x.key === bk.dataset.k); if (b) blockSheet(day, b); return; }
    const tk = e.target.closest('[data-task]'); if (tk) return openForm(tareasMod, store.get('tareas', tk.dataset.task));
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'org') runOrganize([day]);
    if (a === 'add') newBlock(day);
    if (a === 'reset' && await confirmSheet('Volver al horario base', `Se quitan los cambios hechos solo para ${dayLabel(day).toLowerCase()}. Los bloques que agregaste aparte se quedan.`, { yes: 'Volver' })) { store.remove('dias', day); toast('Día con el horario base'); }
  };
  el.onkeydown = (e) => { if (e.key === 'Enter' && e.target.matches('[data-k]')) e.target.click(); };
}

// ---------- Semana ----------
let weekOf = mondayOf(fmt.today());
const semana = { id: 'semana', title: 'Semana', icon: '📆',
  render(el, api) {
    const days = [...Array(7)].map((_, i) => addDays(weekOf, i));
    const t = fmt.today();
    el.innerHTML = `<div class="daynav"><button class="btn btn-cancel ghost sm" data-w="-7" aria-label="Semana anterior">‹</button><button class="dl" data-w="0"><b>${weekOf === mondayOf(t) ? 'Esta semana' : 'Semana del ' + fmt.date(weekOf)}</b><small>${fmt.date(weekOf)} – ${fmt.date(addDays(weekOf, 6))}</small></button><button class="btn btn-cancel ghost sm" data-w="7" aria-label="Semana siguiente">›</button></div>
      <div class="row" style="margin:12px 0"><button class="btn btn-ai" data-a="orgw" ${addDays(weekOf, 6) < t ? 'disabled' : ''}>⚡ Organizar ${weekOf <= t ? 'lo que queda de la semana' : 'la semana'}</button></div>
      <div class="week">${days.map((d) => { const bs = dayBlocks(d); const done = bs.filter((b) => b.done).length;
        return `<button class="wd ${d === t ? 'today' : ''} ${d < t ? 'past' : ''}" data-day="${d}"><header><b>${DAYS[weekday(d)].slice(0, 3)} ${d.slice(8)}</b><span class="muted num">${bs.length ? done + '/' + bs.length : ''}</span></header>
          ${bs.slice(0, 9).map((b) => `<i class="wb ${b.done ? 'done' : ''}" style="--c:${catOf(b.cat)[1]}"><span class="num">${b.start}</span> ${b.fixed ? '🔒' : ''}${esc(b.title)}</i>`).join('')}${bs.length > 9 ? `<i class="muted">+${bs.length - 9} más</i>` : ''}${!bs.length ? '<i class="muted">Libre</i>' : ''}</button>`; }).join('')}</div>`;
    el.onclick = (e) => {
      const w = e.target.closest('[data-w]'); if (w) { const n = Number(w.dataset.w); weekOf = n === 0 ? mondayOf(t) : addDays(weekOf, n); api.paint(); return; }
      const d = e.target.closest('[data-day]'); if (d) { day = d.dataset.day; api.go('home'); return; }
      if (e.target.closest('[data-a=orgw]')) { const ds = days.filter((x) => x >= t); runOrganize(ds); }
    };
  } };

// ---------- Horario base ----------
const horario = { ...bloquesMod,
  render(el) {
    const c = cfg();
    const bs = store.list('bloques');
    el.innerHTML = `<div class="card"><h3>⏰ Tu jornada</h3><div class="row" style="gap:10px;flex-wrap:nowrap">
        <div class="field" style="flex:1"><label for="cw">Me levanto</label><input id="cw" type="time" value="${c.wake}"></div>
        <div class="field" style="flex:1"><label for="cs">Me acuesto</label><input id="cs" type="time" value="${c.sleep}"></div></div>
        <p class="muted" style="font-size:12px;margin:0">El organizador solo usa el tiempo entre estas dos horas.</p></div>
      ${DAYS.map((dn, i) => { const list = bs.filter((b) => (b.days || []).includes(i)).sort((a, b) => toMin(a.start) - toMin(b.start));
        return `<div class="section"><h2>${dn}</h2>${list.map((b) => `<div class="list-item" data-b="${b.id}"><span class="num" style="min-width:96px">${b.start}–${b.end}</span><div class="li-main"><div class="li-title">${b.fixed ? '🔒 ' : ''}${esc(b.title)}</div><div class="li-sub">${catOf(b.cat)[0]} ${esc(b.cat || '')}${(b.days || []).length > 1 ? ' · ' + b.days.map((x) => DAYS[x].slice(0, 2)).join(' ') : ''}</div></div></div>`).join('') || '<p class="muted" style="margin:0">Libre</p>'}</div>`; }).join('')}`;
    el.onchange = (e) => { if (e.target.id === 'cw' || e.target.id === 'cs') { const w = el.querySelector('#cw').value, sl = el.querySelector('#cs').value; if (toMin(w) == null || toMin(sl) == null) return; setCfg({ wake: w, sleep: sl }); toast('Jornada guardada'); } };
    el.onclick = (e) => { const b = e.target.closest('[data-b]'); if (b) openForm(horario, store.get('bloques', b.dataset.b)); };
  },
  preset: () => ({ days: [0, 1, 2, 3, 4], cat: 'trabajo' }) };

const QUICK = [
  { label: 'Bloque', icon: '＋', color: '#00E5FF', run: () => newBlock(day) },
  { label: 'Organizar', icon: '⚡', color: '#9B5CFF', run: () => runOrganize([day]) },
  { label: 'Tarea', icon: '✅', color: '#1CE783', run: () => openForm(tareasMod, null, { imp: 3, urg: 3, minutes: 30, done: false }) },
  { label: 'Idea', icon: '💡', color: '#FFC23D', run: (api) => api.go('proyectos') },
];
boot({ appId: 'plan', version: VERSION, home, quick: QUICK, modules: [semana, tareasMod, proyMod, horario] });
