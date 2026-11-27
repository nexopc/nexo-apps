// 🎬 Pantalla del video: 🌳 Guion (árbol) · 📍 Grabar · ✂️ Editar · 📤 Entregar
import { store, fmt, esc, h, toast, sheet, confirmSheet } from '../../core/shell.js';
import { timer } from '../../core/timer.js';
import { EST, estIdx, colorCli, cname, lugarName, escenas, nuevaEscena, nuevoPlano, PLANT, MOVS, tipoL, claq, letra, editarArbol, copia, totalSeg, tomaBuena, horas, listaEdicion, FILMORA, TAGS, uid } from './datos.js';
import { mapaEditor, mapaHtml } from './mapa.js';
import { abrirGrabacion } from './grabar.js';
import { compartirGuion } from './pdfs.js';

const S = { vid: '', tab: 'guion', open: new Set(), sel: null, undo: null };
const wide = () => matchMedia('(min-width: 900px)').matches;
const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
export function abrirVideo(id, api, tab = 'guion') {
  S.vid = id; S.tab = tab; S.sel = null; S.undo = null;
  const v = store.get('videos', id); if (v) S.open = new Set(escenas(v).slice(0, 1).map((e) => e.id));
  api.go('video');
}

// ---------- metro ----------
export function metroHtml(v, { click = false } = {}) {
  const i = estIdx(v.status); const k = colorCli(v.client);
  return `<div class="metro" style="--k:${esc(k)}">${EST.map((e, n) => `${n ? `<i class="ln ${n <= i ? 'd' : ''}"></i>` : ''}${click ? `<button type="button" class="st ${n < i ? 'd' : n === i ? 'n' : ''}" data-st="${e[0]}" aria-label="Pasar a ${e[1]}"></button>` : `<i class="st ${n < i ? 'd' : n === i ? 'n' : ''}"></i>`}`).join('')}</div>
    <div class="stl">${EST.map((e, n) => `<span class="${n === i ? 'on' : ''}">${e[1]}</span>`).join('')}</div>`;
}

// ---------- dictar por voz ----------
export function dictar(btn, input, onDone) {
  const R = SR(); if (!R) { toast('Tu navegador no deja dictar: escribe la idea'); return; }
  if (btn._rec) { btn._rec.stop(); return; }
  const rec = new R(); rec.lang = 'es-CO'; rec.interimResults = true; const base = input.value ? input.value + ' ' : '';
  rec.onresult = (ev) => { input.value = base + Array.from(ev.results).map((r) => r[0].transcript).join(' '); };
  rec.onend = () => { btn._rec = null; btn.classList.remove('rec'); onDone?.(input.value); };
  rec.onerror = (e) => { btn._rec = null; btn.classList.remove('rec'); if (e.error !== 'aborted' && e.error !== 'no-speech') toast('No pude escuchar: revisa el permiso del micrófono'); };
  btn._rec = rec; btn.classList.add('rec');
  try { rec.start(); } catch { btn._rec = null; btn.classList.remove('rec'); }
}

// ---------- módulo oculto 'video' ----------
export const videoPage = { id: 'video', title: 'Video', icon: '🎬', hidden: true, static: true,
  render(el, api) {
    const v = store.get('videos', S.vid);
    if (!v) { el.innerHTML = '<div class="empty"><b>Ese video ya no existe</b><button class="btn btn-cancel" data-home>Volver</button></div>'; el.onclick = () => api.go('home'); return; }
    document.querySelector('.page-title h1').textContent = '🎬 ' + v.title;
    el.innerHTML = `<div class="card vtop">${metroHtml(v, { click: true })}<div class="row" style="justify-content:space-between;margin-top:6px;font-size:12.5px"><span><i class="cdot" style="background:${esc(colorCli(v.client))}"></i> ${esc(cname(v.client) || 'Sin cliente')}${v.due ? ' · entrega ' + fmt.date(v.due) : ''}</span><span class="muted">${totalSeg(v) ? totalSeg(v) + ' s · ' : ''}${escenas(v).length} escenas</span></div></div>
      <div class="seg vtabs">${[['guion', '🌳 Guion'], ['grabar', '📍 Grabar'], ['editar', '✂️ Editar'], ['entregar', '📤 Entregar']].map(([k, l]) => `<button type="button" data-tab="${k}" aria-pressed="${S.tab === k}">${l}</button>`).join('')}</div>
      <div id="vt"></div>`;
    const vt = el.querySelector('#vt');
    ({ guion: tabGuion, grabar: tabGrabar, editar: tabEditar, entregar: tabEntregar })[S.tab](vt, api);
    el.querySelector('.vtop').onclick = (e) => { const b = e.target.closest('[data-st]'); if (!b) return; store.update('videos', v.id, { status: b.dataset.st, ...(b.dataset.st === 'publicado' && !v.publishDate ? { publishDate: fmt.today() } : {}) }); this.render(el, api); };
    el.querySelector('.vtabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (!b) return; S.tab = b.dataset.tab; this.render(el, api); };
  } };
const repaint = (api) => api.paint();

// ---------- 🌳 Guion ----------
function tabGuion(el, api) {
  const v = store.get('videos', S.vid);
  el.innerHTML = `<div class="${wide() ? 'gwide' : ''}"><div id="gl"></div>${wide() ? '<div id="gr" class="card gside"></div>' : ''}</div>`;
  const paintTree = () => {
    const vv = store.get('videos', S.vid); const es = escenas(vv);
    el.querySelector('#gl').innerHTML = `
      <div class="card kv vdat" data-a="datos"><b>Objetivo</b><span>${esc(vv.objetivo || '—')}</span><b>Duración</b><span>${esc(vv.duracion || (totalSeg(vv) ? totalSeg(vv) + ' s' : '—'))} · ${esc(vv.formato || '9:16')}</span><b>Gancho 3 s</b><span>${esc(vv.gancho || '—')}</span><b>Llamado</b><span>${esc(vv.cta || '—')}</span><b>Música</b><span>${esc(vv.musica || '—')}</span><span class="vdat-e">✎</span></div>
      ${S.undo ? '<div class="undo card"><span>Se borró.</span><button class="btn btn-edit ghost sm" data-a="undo">↶ Deshacer</button></div>' : ''}
      <div class="tree">${es.map((e, si) => { const op = S.open.has(e.id); return `
        <div class="nd esc" data-et="${e.id}"><span class="ar">${op ? '▾' : '▸'}</span><span class="t"><b>E${si + 1} · ${esc(e.titulo || 'Escena ' + (si + 1))}</b><small>${esc([lugarName(e), e.fecha ? fmt.date(e.fecha) + (e.hora ? ' ' + e.hora : '') : '', e.ambiente || e.luz].filter(Boolean).join(' · ') || 'toca ✎ para lugar, luz y fecha')}</small></span><span class="chip">${e.planos.length} planos</span><button class="km" data-em="${si}" aria-label="Opciones de la escena">⋮</button></div>
        ${op ? `<div class="nd sub" data-ee="${si}"><span class="t muted">✎ Lugar, ambiente, luz, fecha y hora, utilería, vestuario, qué prepara el cliente</span></div>
          ${e.planos.map((p, pi) => `<div class="nd pl ${S.sel && S.sel[0] === si && S.sel[1] === pi ? 'on' : ''}" data-pl="${si}|${pi}"><span class="t"><b>🎥 ${claq(si, pi)} ${esc(tipoL(p.tipo))}</b><small>${esc([p.seg ? p.seg + ' s' : '', p.mov, p.desc].filter(Boolean).join(' · '))}</small>
            <span class="pills">${p.mapa?.length ? '<i>🗺</i>' : ''}${p.cam?.donde || p.cam?.mira ? '<i>📷</i>' : ''}${p.personas?.length ? `<i>🧍${p.personas.length > 1 ? p.personas.length : ''}</i>` : ''}${p.pantalla ? '<i>🔤</i>' : ''}${tomaBuena(p) ? `<i>T${tomaBuena(p)}</i>` : ''}</span></span>${p.grabado ? '<span class="gr">✅</span>' : ''}<button class="km" data-pm="${si}|${pi}" aria-label="Opciones del plano">⋮</button></div>`).join('')}
          <button class="nd add" data-np="${si}">＋ Plano en E${si + 1}</button>` : ''}`; }).join('')}
      </div>
      <div class="row" style="margin-top:10px"><button class="btn btn-create" data-a="nesc" style="flex:1">＋ Escena</button><button class="btn btn-edit ghost" data-a="pdf">📄 PDF para el cliente</button></div>
      ${!es.length ? '<p class="muted" style="font-size:13px">Empieza con ＋ Escena (un lugar o momento del video) y dentro agrega sus planos. Solo el plano es obligatorio: mapa, cámara y persona los llenas si ese plano los necesita.</p>' : ''}`;
  };
  const paintSide = () => {
    const gr = el.querySelector('#gr'); if (!gr) return;
    if (!S.sel) { gr.innerHTML = '<p class="muted">Toca un plano del árbol para verlo aquí con su mapa grande.</p>'; return; }
    planoEditor(gr, S.sel[0], S.sel[1], { onChange: paintTree });
  };
  paintTree(); paintSide();
  el.onclick = async (e) => {
    const g = (s) => e.target.closest(s); let b;
    if ((b = g('[data-em]'))) { e.stopPropagation(); return menuEscena(+b.dataset.em, () => { paintTree(); paintSide(); }); }
    if ((b = g('[data-pm]'))) { e.stopPropagation(); const [si, pi] = b.dataset.pm.split('|').map(Number); return menuPlano(si, pi, () => { paintTree(); paintSide(); }); }
    if ((b = g('[data-et]'))) { const id = b.dataset.et; S.open.has(id) ? S.open.delete(id) : S.open.add(id); return paintTree(); }
    if ((b = g('[data-ee]'))) return escenaForm(+b.dataset.ee, paintTree);
    if ((b = g('[data-pl]'))) { const [si, pi] = b.dataset.pl.split('|').map(Number); S.sel = [si, pi]; if (wide()) { paintTree(); paintSide(); } else planoSheet(si, pi, paintTree); return; }
    if ((b = g('[data-np]'))) return elegirPlantilla(+b.dataset.np, (si, pi) => { paintTree(); S.sel = [si, pi]; if (wide()) paintSide(); else planoSheet(si, pi, paintTree); });
    const a = g('[data-a]')?.dataset.a;
    if (a === 'datos') return datosForm(() => repaint(api));
    if (a === 'undo' && S.undo) { store.update('videos', S.vid, { escenas: S.undo }); S.undo = null; S.sel = null; paintTree(); paintSide(); toast('↶ Listo'); return; }
    if (a === 'nesc') { const ne = nuevaEscena(); editarArbol(S.vid, (es) => es.push(ne)); S.open.add(ne.id); paintTree(); escenaForm(escenas(store.get('videos', S.vid)).length - 1, paintTree); return; }
    if (a === 'pdf') return compartirGuion(store.get('videos', S.vid));
  };
}
function snap() { S.undo = copia(escenas(store.get('videos', S.vid))); clearTimeout(snap.t); snap.t = setTimeout(() => { S.undo = null; }, 15000); }
function menuEscena(si, after) {
  const es = escenas(store.get('videos', S.vid)); const body = h(`<div class="list">
    <button class="list-item" data-m="up" ${si === 0 ? 'disabled' : ''}>⬆️ Subir</button><button class="list-item" data-m="down" ${si === es.length - 1 ? 'disabled' : ''}>⬇️ Bajar</button>
    <button class="list-item" data-m="dup">⧉ Duplicar escena (con sus planos)</button><button class="list-item" data-m="del" style="color:var(--c-delete)">🗑 Borrar escena</button></div>`);
  const s = sheet(`E${si + 1} · ${es[si].titulo || 'Escena'}`, body);
  body.onclick = (e) => { const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
    snap(); editarArbol(S.vid, (x) => {
      if (m === 'up') [x[si - 1], x[si]] = [x[si], x[si - 1]];
      if (m === 'down') [x[si + 1], x[si]] = [x[si], x[si + 1]];
      if (m === 'dup') { const c = copia(x[si]); c.id = uid(); c.planos.forEach((p) => { p.id = uid(); p.tomas = []; p.grabado = false; }); x.splice(si + 1, 0, c); }
      if (m === 'del') x.splice(si, 1);
    });
    if (m !== 'del') S.undo = null; S.sel = null; s.close(); after();
  };
}
function menuPlano(si, pi, after) {
  const es = escenas(store.get('videos', S.vid)); const n = es[si].planos.length;
  const body = h(`<div class="list"><button class="list-item" data-m="up" ${pi === 0 ? 'disabled' : ''}>⬆️ Subir</button><button class="list-item" data-m="down" ${pi === n - 1 ? 'disabled' : ''}>⬇️ Bajar</button>
    <button class="list-item" data-m="dup">⧉ Duplicar plano</button>${es.length > 1 ? '<button class="list-item" data-m="mv">↪ Pasar a otra escena</button>' : ''}<button class="list-item" data-m="del" style="color:var(--c-delete)">🗑 Borrar plano</button></div>`);
  const s = sheet(`${claq(si, pi)} · ${tipoL(es[si].planos[pi].tipo)}`, body);
  body.onclick = (e) => { const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
    if (m === 'mv') { body.innerHTML = `<div class="list">${es.map((x, k) => (k === si ? '' : `<button class="list-item" data-to="${k}">E${k + 1} · ${esc(x.titulo || 'Escena ' + (k + 1))}</button>`)).join('')}</div>`; return; }
    snap(); editarArbol(S.vid, (x) => { const P = x[si].planos;
      if (m === 'up') [P[pi - 1], P[pi]] = [P[pi], P[pi - 1]];
      if (m === 'down') [P[pi + 1], P[pi]] = [P[pi], P[pi + 1]];
      if (m === 'dup') { const c = copia(P[pi]); c.id = uid(); c.tomas = []; c.grabado = false; P.splice(pi + 1, 0, c); }
      if (m === 'del') P.splice(pi, 1);
    });
    if (m !== 'del') S.undo = null; S.sel = null; s.close(); after();
  };
  body.addEventListener('click', (e) => { const t = e.target.closest('[data-to]'); if (!t) return; snap(); editarArbol(S.vid, (x) => { const [p] = x[si].planos.splice(pi, 1); x[+t.dataset.to].planos.push(p); }); S.undo = null; S.sel = null; s.close(); after(); });
}
function elegirPlantilla(si, after) {
  const body = h(`<div class="plt">${PLANT.map((p) => `<button data-k="${p.k}"><span>${p.e}</span><b>${p.l}</b><small>${p.d}</small></button>`).join('')}</div>`);
  const s = sheet(`＋ Plano en E${si + 1}`, body);
  body.onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; let pi = 0; editarArbol(S.vid, (x) => { x[si].planos.push(nuevoPlano(b.dataset.k)); pi = x[si].planos.length - 1; }); s.close(); setTimeout(() => after(si, pi), 280); };
}
function datosForm(after) {
  const v = store.get('videos', S.vid); const cs = store.list('clients');
  const f = h(`<form class="form" novalidate>
    <div class="field"><label for="vt">Nombre del video</label><input id="vt" value="${esc(v.title)}"></div>
    <div class="field"><label for="vc">Cliente</label><select id="vc"><option value="">Sin cliente / NEXO PC</option>${cs.map((c) => `<option value="${c.id}" ${c.id === v.client ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="vo">Objetivo</label><input id="vo" value="${esc(v.objetivo || '')}" placeholder="Llenar la agenda de diciembre"></div>
    <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="field" style="flex:1"><label for="vd">Duración</label><input id="vd" value="${esc(v.duracion || '')}" placeholder="30 s"></div><div class="field" style="flex:1"><label for="vf">Formato</label><select id="vf">${['9:16', '1:1', '4:5', '16:9'].map((x) => `<option ${x === (v.formato || '9:16') ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field" style="flex:1.2"><label for="vdu">Entrega</label><input id="vdu" type="date" value="${esc(v.due || '')}"></div></div>
    <div class="field"><label for="vg">Gancho (primeros 3 s)</label><input id="vg" value="${esc(v.gancho || '')}" placeholder="¿Este corte en 20 minutos?"></div>
    <div class="field"><label for="vcta">Llamado a la acción</label><input id="vcta" value="${esc(v.cta || '')}" placeholder="Agenda por WhatsApp"></div>
    <div class="field"><label for="vm">Música</label><input id="vm" value="${esc(v.musica || '')}" placeholder="Afrobeat suave"></div>
    <div class="field"><label>Etiquetas</label><div class="picks">${TAGS.map((t) => `<button type="button" class="pick sm ${(v.tags || '').includes(t) ? 'on' : ''}" data-tg="${t}">${t}</button>`).join('')}</div></div>
    <div class="row end"><button type="button" class="btn btn-delete ghost" data-a="del">🗑 Borrar video</button><button class="btn btn-create">✓ Guardar</button></div></form>`);
  const s = sheet('Datos del video', f);
  f.addEventListener('click', async (e) => { const t = e.target.closest('[data-tg]'); if (t) t.classList.toggle('on');
    if (e.target.closest('[data-a=del]') && await confirmSheet('¿Borrar el video?', `${v.title} y su guion se borran.`, { yes: 'Borrar', danger: true })) { store.remove('videos', v.id); s.close(); history.back(); } });
  f.addEventListener('submit', (e) => { e.preventDefault(); const q = (id) => f.querySelector('#' + id).value.trim();
    if (!q('vt')) return toast('El video necesita nombre');
    store.update('videos', v.id, { title: q('vt'), client: q('vc'), objetivo: q('vo'), duracion: q('vd'), formato: q('vf'), due: q('vdu'), gancho: q('vg'), cta: q('vcta'), musica: q('vm'), tags: [...f.querySelectorAll('[data-tg].on')].map((x) => x.dataset.tg).join(', ') });
    s.close(); after(); });
}
export function escenaForm(si, after, vid = S.vid) {
  const v = store.get('videos', vid); const e = escenas(v)[si]; if (!e) return;
  const ls = store.list('lugares').sort((a, b) => (b.client === v.client) - (a.client === v.client));
  const f = h(`<form class="form" novalidate>
    <div class="field"><label for="et">Nombre de la escena</label><input id="et" value="${esc(e.titulo)}" placeholder="Entrada del local"></div>
    <div class="field"><label>Lugar</label><div class="picks">${ls.map((l) => `<button type="button" class="pick sm ${l.id === e.lugar ? 'on' : ''}" data-lg="${l.id}">📍 ${esc(l.name)}</button>`).join('')}<button type="button" class="pick sm add" data-a="nl">＋ Lugar</button></div>
      ${ls.length ? '' : `<input id="elt" value="${esc(e.lugarTxt || '')}" placeholder="O escribe el lugar" style="margin-top:6px">`}</div>
    <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="field" style="flex:1"><label for="ef">Fecha de grabación</label><input id="ef" type="date" value="${esc(e.fecha)}"></div><div class="field" style="flex:1"><label for="eh">Hora</label><input id="eh" type="time" value="${esc(e.hora)}"></div></div>
    <p class="muted" style="font-size:12px;margin:-4px 0 0">Con fecha y hora se pone sola en NEXO PLAN como bloque 🔒 fijo.</p>
    <div class="field"><label for="ea">Ambiente</label><input id="ea" value="${esc(e.ambiente)}" placeholder="Tarde, local lleno, música baja"></div>
    <div class="field"><label for="el">Luz</label><input id="el" value="${esc(e.luz)}" placeholder="Natural por la puerta + aro de luz"></div>
    <div class="field"><label for="eu">Utilería</label><input id="eu" value="${esc(e.utileria)}" placeholder="Tijeras, capa, producto"></div>
    <div class="field"><label for="ev">Vestuario</label><input id="ev" value="${esc(e.vestuario)}" placeholder="Camiseta negra con logo"></div>
    <div class="field"><label for="es">Sonido</label><input id="es" value="${esc(e.sonido)}" placeholder="Micrófono de solapa"></div>
    <div class="field"><label for="ep">Qué debe preparar el cliente</label><input id="ep" value="${esc(e.prepara)}" placeholder="Local limpio, 1 cliente para el corte"></div>
    <div class="row end"><button class="btn btn-create">✓ Guardar</button></div></form>`);
  const s = sheet(`E${si + 1} · Escena`, f);
  let lugar = e.lugar;
  f.addEventListener('click', (ev) => { const b = ev.target.closest('[data-lg]'); if (b) { lugar = lugar === b.dataset.lg ? '' : b.dataset.lg; f.querySelectorAll('[data-lg]').forEach((x) => x.classList.toggle('on', x.dataset.lg === lugar)); }
    if (ev.target.closest('[data-a=nl]')) { const n = prompt('Nombre del lugar (ej. Barbería Flow)'); if (n?.trim()) { const l = store.add('lugares', { name: n.trim(), client: v.client || '' }); lugar = l.id; const nb = h(`<button type="button" class="pick sm on" data-lg="${l.id}">📍 ${esc(l.name)}</button>`); f.querySelectorAll('[data-lg]').forEach((x) => x.classList.remove('on')); ev.target.closest('[data-a=nl]').before(nb); } } });
  f.addEventListener('submit', (ev) => { ev.preventDefault(); const q = (id) => f.querySelector('#' + id)?.value.trim() || '';
    editarArbol(vid, (x) => Object.assign(x[si], { titulo: q('et'), lugar, lugarTxt: q('elt') || (lugar ? '' : x[si].lugarTxt), fecha: q('ef'), hora: q('eh'), ambiente: q('ea'), luz: q('el'), utileria: q('eu'), vestuario: q('ev'), sonido: q('es'), prepara: q('ep') }));
    if (q('ef') && ['idea', 'guion'].includes(v.status || 'idea') && escenas(store.get('videos', vid)).some((x) => x.planos.length)) store.update('videos', vid, { status: 'grabar' });
    s.close(); after?.(); });
}

// ---------- editor de plano (hoja en el celular, panel al lado en el PC) ----------
function planoSheet(si, pi, after) {
  const body = h('<div class="pe"></div>');
  const s = sheet(`${claq(si, pi)}`, body, { onClose: () => after() });
  planoEditor(body, si, pi, { onChange: () => {}, onTitle: (t) => { s.el.querySelector('.sheet-head h2').textContent = t; } });
}
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const set = (o, path, val) => { const ks = path.split('.'); const last = ks.pop(); const t = ks.reduce((a, k) => (a[k] = a[k] ?? (/^\d+$/.test(k) ? [] : {})), o); t[last] = val; };
export function planoEditor(el, si, pi, { onChange = () => {}, onTitle } = {}) {
  const P = () => escenas(store.get('videos', S.vid))[si]?.planos[pi];
  const upd = (fn) => { editarArbol(S.vid, (x) => fn(x[si].planos[pi])); onChange(); };
  const paint = () => {
    const p = P(); if (!p) { el.innerHTML = '<p class="muted">Ese plano ya no existe.</p>'; return; }
    const e = escenas(store.get('videos', S.vid))[si];
    onTitle?.(`${claq(si, pi)} · ${tipoL(p.tipo)}`);
    const pick = (path, opts) => `<div class="picks">${opts.map(([v, l]) => `<button type="button" class="pick sm ${get(p, path) === v ? 'on' : ''}" data-pk="${path}" data-v="${esc(v)}">${l}</button>`).join('')}</div>`;
    el.innerHTML = `<div class="form pform2">
      ${wide() && el.id === 'gr' ? `<h3 style="margin:0">${claq(si, pi)} · ${esc(tipoL(p.tipo))}</h3>` : ''}
      ${pick('tipo', PLANT.map((x) => [x.k, x.e + ' ' + x.l]))}
      <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="field" style="flex:0 0 90px"><label>Segundos</label><input type="number" inputmode="numeric" min="1" max="120" data-f="seg" value="${esc(p.seg || '')}"></div><div class="field" style="flex:1"><label>Movimiento</label><select data-f="mov">${MOVS.map((m) => `<option ${m === p.mov ? 'selected' : ''}>${m}</option>`).join('')}</select></div></div>
      <div class="field"><label>Qué se ve</label><div class="mic-in"><textarea rows="2" data-f="desc" placeholder="Juan peina al cliente frente al espejo">${esc(p.desc || '')}</textarea><button type="button" class="mic-b" data-mic="desc" aria-label="Dictar">🎙</button></div></div>
      <details class="sec2" ${p.mapa?.length || (wide() && el.id === 'gr') ? 'open' : ''}><summary>🗺 Mapa visual ${p.mapa?.length ? `<span class="muted">(${p.mapa.length})</span>` : ''}</summary><div class="mapw"></div></details>
      <details class="sec2" ${p.cam?.donde || p.cam?.mira ? 'open' : ''}><summary>📷 Cámara</summary>
        <div class="field"><label>Dónde se ubica</label><input data-f="cam.donde" value="${esc(p.cam?.donde || '')}" placeholder="En la puerta, a 1,5 m"></div>
        <div class="field"><label>Qué mira</label><input data-f="cam.mira" value="${esc(p.cam?.mira || '')}" placeholder="La silla del fondo"></div>
        <label class="lbl2">Altura</label>${pick('cam.altura', [['baja', 'Baja'], ['pecho', 'Pecho'], ['ojos', 'Ojos'], ['arriba', 'Desde arriba']])}
        <label class="lbl2">Zoom</label>${pick('cam.zoom', [['0.5x', '0.5x'], ['1x', '1x'], ['2x', '2x'], ['3x', '3x']])}
        <label class="lbl2">Soporte</label>${pick('cam.soporte', [['trípode', 'Trípode'], ['mano', 'En mano'], ['gimbal', 'Gimbal']])}</details>
      <details class="sec2" ${p.personas?.length ? 'open' : ''}><summary>🧍 Persona(s) ${p.personas?.length ? `<span class="muted">(${p.personas.length})</span>` : ''}</summary>
        ${(p.personas || []).map((q, k) => `<div class="pers"><div class="row" style="justify-content:space-between"><input data-f="personas.${k}.nombre" value="${esc(q.nombre || '')}" placeholder="Nombre (Juan, el dueño…)" class="pn"><button type="button" class="km" data-delp="${k}" aria-label="Quitar persona">🗑</button></div>
          <div class="field"><label>Qué dice</label><div class="mic-in"><textarea rows="2" data-f="personas.${k}.dice" placeholder="Diciembre se llena, aparta tu turno">${esc(q.dice || '')}</textarea><button type="button" class="mic-b" data-mic="personas.${k}.dice" aria-label="Dictar">🎙</button></div></div>
          <div class="row" style="gap:8px;flex-wrap:nowrap"><input data-f="personas.${k}.donde" value="${esc(q.donde || '')}" placeholder="Dónde está"><input data-f="personas.${k}.hace" value="${esc(q.hace || '')}" placeholder="Qué hace"></div>
          <input data-f="personas.${k}.expresion" value="${esc(q.expresion || '')}" placeholder="Expresión (sonriente, serio…)" style="margin-top:6px"></div>`).join('')}
        <button type="button" class="btn btn-create ghost sm" data-a="np">＋ Persona</button></details>
      <div class="field"><label>🔤 En pantalla (Filmora)</label><input data-f="pantalla" value="${esc(p.pantalla || '')}" placeholder="Diciembre lleno 🔥"></div>
      <div class="field"><label>✅ Tomas <span class="muted">(toca la buena)</span></label><div class="picks">${(p.tomas || []).map((t) => `<button type="button" class="pick sm ${t.buena ? 'on' : ''}" data-tk="${t.n}">T${t.n}${t.buena ? ' ✓' : ''}</button>`).join('')}<button type="button" class="pick sm add" data-a="nt">＋ toma</button></div></div>
      <label class="chkl"><input type="checkbox" data-a="gb" ${p.grabado ? 'checked' : ''}> Grabado</label>
    </div>`;
    const mw = el.querySelector('.mapw');
    const base = store.get('lugares', e.lugar)?.mapa || [];
    mapaEditor(mw, p.mapa || [], (items) => upd((x) => { x.mapa = items; }), { base });
  };
  paint();
  el.onchange = (ev) => {
    const f = ev.target.dataset.f;
    if (f) { const val = ev.target.type === 'number' ? Number(ev.target.value) || 0 : ev.target.value.trim(); upd((x) => set(x, f, val)); return; }
    if (ev.target.dataset.a === 'gb') upd((x) => { x.grabado = ev.target.checked; });
  };
  el.onclick = (ev) => {
    const g = (s) => ev.target.closest(s); let b;
    if ((b = g('[data-pk]'))) { const path = b.dataset.pk; const v = b.dataset.v; upd((x) => { set(x, path, get(x, path) === v && path !== 'tipo' ? '' : v); if (path === 'tipo' && !x.seg) x.seg = PLANT.find((t) => t.k === v)?.seg || 3; }); return paint(); }
    if ((b = g('[data-mic]'))) { const path = b.dataset.mic; const ta = el.querySelector(`[data-f="${path}"]`); return dictar(b, ta, (val) => upd((x) => set(x, path, val.trim()))); }
    if (g('[data-a=np]')) { upd((x) => { x.personas = [...(x.personas || []), { nombre: '', dice: '', donde: '', hace: '', expresion: '' }]; }); return paint(); }
    if ((b = g('[data-delp]'))) { const k = +b.dataset.delp; upd((x) => x.personas.splice(k, 1)); return paint(); }
    if (g('[data-a=nt]')) { upd((x) => { x.tomas = [...(x.tomas || []), { n: (x.tomas?.length || 0) + 1, buena: false }]; }); return paint(); }
    if ((b = g('[data-tk]'))) { const n = +b.dataset.tk; upd((x) => { x.tomas = x.tomas.map((t) => ({ ...t, buena: t.n === n ? !t.buena : false })); }); return paint(); }
  };
}

// ---------- 📍 Grabar ----------
function tabGrabar(el, api) {
  const v = store.get('videos', S.vid); const es = escenas(v); const hr = horas(v.id);
  const pend = es.reduce((a, e) => a + e.planos.filter((p) => !p.grabado).length, 0);
  el.innerHTML = `${es.map((e, si) => `<div class="card place" style="--k:${esc(colorCli(v.client))}"><div class="row" style="justify-content:space-between"><b>E${si + 1} · 📍 ${esc(lugarName(e) || 'Sin lugar')}</b><button class="btn btn-edit ghost sm" data-ee="${si}">${e.fecha ? '🗓 ' + fmt.date(e.fecha) + (e.hora ? ' ' + e.hora : '') : '🗓 Agendar'}</button></div>
      ${[e.luz && '💡 ' + e.luz, e.utileria && '🧰 ' + e.utileria, e.prepara && '👉 Cliente: ' + e.prepara].filter(Boolean).map((x) => `<div class="muted" style="font-size:12px">${esc(x)}</div>`).join('')}
      ${e.planos.map((p, pi) => `<label class="tk"><input type="checkbox" data-gb="${si}|${pi}" ${p.grabado ? 'checked' : ''}><span>${claq(si, pi)} ${esc(tipoL(p.tipo))}${p.desc ? ' · <span class="muted">' + esc(p.desc) + '</span>' : ''}</span>${tomaBuena(p) ? `<b class="gr">T${tomaBuena(p)}</b>` : ''}</label>`).join('') || '<p class="muted" style="margin:4px 0">Sin planos.</p>'}</div>`).join('') || '<div class="empty"><b>Primero el guion</b>Agrega escenas y planos en 🌳 Guion.</div>'}
    ${pend ? `<button class="btn btn-create" data-a="rec" style="width:100%;margin-top:6px">▶ Modo grabación (${pend} planos)</button>` : es.length ? '<p class="gr" style="text-align:center"><b>✅ Todo grabado</b></p>' : ''}
    <div class="row" style="margin-top:10px;justify-content:space-between;font-size:13px"><span class="muted">Horas grabando: <b style="color:var(--fg)">${fmt.hours(hr.grabar)}</b></span><button class="btn btn-pending ghost sm" data-a="tm">⏱ Cronómetro de grabación</button></div>`;
  el.onchange = (e) => { const b = e.target.closest('[data-gb]'); if (!b) return; const [si, pi] = b.dataset.gb.split('|').map(Number); const st = editarArbol(S.vid, (x) => { x[si].planos[pi].grabado = b.checked; }); if (st === 'editar') { toast('✅ Todo grabado: pasa a ✂️ Editar'); repaint(api); } };
  el.onclick = (e) => { const b = e.target.closest('[data-ee]'); if (b) return escenaForm(+b.dataset.ee, () => repaint(api));
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'rec') abrirGrabacion({ vid: v.id }, () => repaint(api));
    if (a === 'tm') { timer.start({ label: 'Grabar ' + v.title, kind: 'trabajo', video: v.id, fase: 'grabar', job: v.job || '', source: v.source || '' }); toast('⏱ Cronómetro corriendo'); } };
}

// ---------- ✂️ Editar ----------
function tabEditar(el, api) {
  const v = store.get('videos', S.vid); const L = listaEdicion(v); const done = new Set(v.editDone || []); const hr = horas(v.id);
  const es = escenas(v);
  el.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between"><b>Lista de edición</b><span class="muted num">${L.filter((x) => done.has(x.k)).length} de ${L.length}</span></div>
      ${L.map((x) => `<div class="tk2 ${done.has(x.k) ? 'd' : ''}"><input type="checkbox" data-ek="${esc(x.k)}" ${done.has(x.k) ? 'checked' : ''} aria-label="Hecho"><div><span class="tx">${esc(x.t)}</span>${x.tag ? `<span class="tag">${esc(x.tag)}</span>` : ''}
        ${FILMORA[x.f] && !done.has(x.k) ? `<details class="fm"><summary>▸ Cómo en Filmora 16</summary>${esc(FILMORA[x.f])}</details>` : ''}</div></div>`).join('')}
      <p class="muted" style="font-size:11.5px;margin:8px 0 0">Los pasos son una guía: algún nombre puede cambiar un poco según tu versión de Filmora.</p></div>
    <div class="card section"><b>Tomas buenas</b>${es.flatMap((e, si) => e.planos.map((p, pi) => `<div class="take"><span>${claq(si, pi)} ${esc(tipoL(p.tipo))}${p.desc ? ' · ' + esc(p.desc) : ''}</span><b class="${tomaBuena(p) ? 'gr' : 'muted'}">${tomaBuena(p) ? 'T' + tomaBuena(p) : '—'}</b></div>`)).join('') || '<p class="muted">Sin planos.</p>'}</div>
    <div class="card section row" style="justify-content:space-between;align-items:center"><span>⏱ Editando: <b>${fmt.hours(hr.editar)}</b><br><span class="muted" style="font-size:12px">total del video ${fmt.hours(hr.total)}</span></span><button class="btn btn-pending" data-a="tm">▶ Editar con cronómetro</button></div>
    ${estIdx(v.status) < 4 ? '<button class="btn btn-create" data-a="ok" style="width:100%;margin-top:8px">Listo · pasar a 📤 Entregar</button>' : ''}`;
  el.onchange = (e) => { const b = e.target.closest('[data-ek]'); if (!b) return; const s = new Set(store.get('videos', v.id).editDone || []); b.checked ? s.add(b.dataset.ek) : s.delete(b.dataset.ek); store.update('videos', v.id, { editDone: [...s] }); repaint(api); };
  el.onclick = (e) => { const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'tm') { timer.start({ label: 'Editar ' + v.title, kind: 'trabajo', video: v.id, fase: 'editar', job: v.job || '', source: v.source || '' }); if (estIdx(v.status) < 3) store.update('videos', v.id, { status: 'editar' }); toast('⏱ Cronómetro de edición corriendo'); repaint(api); }
    if (a === 'ok') { if (timer.state()?.video === v.id) timer.stop(); store.update('videos', v.id, { status: 'entregar' }); S.tab = 'entregar'; repaint(api); } };
}

// ---------- 📤 Entregar ----------
const wa = (phone, text) => { let d = String(phone || '').replace(/\D/g, ''); if (d.length === 10 && d.startsWith('3')) d = '57' + d; return `https://wa.me/${d}?text=${encodeURIComponent(text)}`; };
function sugerirCopy(v) {
  const tags = ['#Quibdó', ...String(v.tags || '').split(',').map((t) => t.trim()).filter(Boolean).map((t) => '#' + t.replace(/[^\wáéíóúñ]/gi, ''))];
  const neg = store.get('clients', v.client)?.negocio; if (neg) tags.push('#' + neg.toLowerCase().replace(/[^\wáéíóúñ]/gi, ''));
  return [v.gancho, v.objetivo && !v.gancho ? v.objetivo : '', v.cta ? '👉 ' + v.cta : ''].filter(Boolean).join(' ') + '\n' + [...new Set(tags)].join(' ');
}
function tabEntregar(el, api) {
  const v = store.get('videos', S.vid); const hr = horas(v.id); const c = store.get('clients', v.client);
  const r = v.results || {};
  const pub = store.list('videos').filter((x) => x.status === 'publicado' && x.results?.views != null);
  const avg = (arr) => (arr.length ? arr.reduce((a, x) => a + (Number(x.results.views) || 0), 0) / arr.length : 0);
  const mejor = (() => { const by = {}; for (const x of pub) for (const t of String(x.tags || '').split(',').map((s) => s.trim()).filter(Boolean)) (by[t] = by[t] || []).push(x); const all = avg(pub); const best = Object.entries(by).filter(([, a]) => a.length >= 2).map(([t, a]) => [t, avg(a) / (all || 1)]).sort((a, b) => b[1] - a[1])[0]; return best && best[1] > 1.15 ? best : null; })();
  el.innerHTML = `<div class="card kv"><b>Guion</b><span>${fmt.hours(hr.guion)}</span><b>Grabar</b><span>${fmt.hours(hr.grabar)}</span><b>Editar</b><span>${fmt.hours(hr.editar)}</span><b>Total</b><span><b>${fmt.hours(hr.total)}</b></span></div>
    <div class="form section">
      <div class="field"><label for="dl">Link del video</label><input id="dl" data-e="link" type="url" value="${esc(v.link || '')}" placeholder="Drive, WeTransfer o la publicación"></div>
      <div class="field"><label for="dc">Texto para publicar</label><textarea id="dc" data-e="copy" rows="4">${esc(v.copy || sugerirCopy(v))}</textarea><div class="row end"><button type="button" class="btn btn-edit ghost sm" data-a="cp">📋 Copiar</button></div></div>
      <button type="button" class="btn btn-create" data-a="wa">💬 "Tu video está listo" por WhatsApp</button>
      <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="field" style="flex:1"><label for="dp">Fecha de publicación</label><input id="dp" data-e="publishDate" type="date" value="${esc(v.publishDate || '')}"></div>
        ${v.status !== 'publicado' ? '<button type="button" class="btn btn-create" data-a="pub" style="align-self:flex-end">✅ Publicado</button>' : ''}</div>
    </div>
    ${v.status === 'publicado' ? `<div class="section"><h2>Resultados · 7 días</h2><div class="res">${[['views', 'vistas'], ['likes', 'likes'], ['msgs', 'mensajes']].map(([k, l]) => `<label><input type="number" inputmode="numeric" min="0" data-r="${k}" value="${r[k] ?? ''}" placeholder="0"><span>${l}</span></label>`).join('')}</div>
      ${mejor ? `<div class="card" style="font-size:13px;margin-top:8px">📈 Los videos de <b>${esc(mejor[0])}</b> te dan ${mejor[1].toFixed(1).replace('.', ',')}× más vistas que el promedio.</div>` : ''}</div>` : ''}`;
  el.onchange = (e) => {
    const k = e.target.dataset.e; if (k) { store.update('videos', v.id, { [k]: e.target.value.trim() }); return; }
    const rk = e.target.dataset.r; if (rk) { const cur = store.get('videos', v.id).results || {}; store.update('videos', v.id, { results: { ...cur, [rk]: e.target.value === '' ? null : Number(e.target.value), at: fmt.today() } }); }
  };
  el.onclick = async (e) => { const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'cp') { const t = el.querySelector('#dc').value; store.update('videos', v.id, { copy: t }); try { await navigator.clipboard.writeText(t); toast('📋 Copiado'); } catch { el.querySelector('#dc').select(); toast('Selecciónalo y cópialo'); } }
    if (a === 'wa') { const link = el.querySelector('#dl').value.trim(); window.open(wa(c?.contact, `Hola ${c?.name || ''} 👋 ¡Tu video "${v.title}" está listo! ${link ? '👉 ' + link : ''}\n\nTexto sugerido para publicarlo:\n${el.querySelector('#dc').value}\n\nSi quieres algún ajuste me dices.`), '_blank', 'noopener'); if (estIdx(v.status) < 4) store.update('videos', v.id, { status: 'entregar' }); }
    if (a === 'pub') { store.update('videos', v.id, { status: 'publicado', publishDate: el.querySelector('#dp').value || fmt.today(), link: el.querySelector('#dl').value.trim(), copy: el.querySelector('#dc').value }); toast('✅ Publicado. En 7 días te pido vistas y likes'); repaint(api); } };
}
export { S as estadoVideo, mapaHtml };
