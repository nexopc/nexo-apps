// 🎬 Pantalla del video: 🌳 Guion (árbol) · 📍 Grabar · ✂️ Editar · 📤 Entregar
import { store, fmt, esc, h, toast, sheet, confirmSheet } from '../../core/shell.js';
import { timer } from '../../core/timer.js';
import { EST, estIdx, colorCli, cname, lugarName, escenas, nuevaEscena, nuevoPlano, nuevoItem, ITEM, itemsDe, filas, desdeFilas, visibles, nuevaFila, contar, SEL, RED, OBJ, iniciales, PLANT, MOVS, tipoL, claq, letra, editarArbol, copia, totalSeg, tomaBuena, horas, listaEdicion, FILMORA, TAGS, uid } from './datos.js';
import { mapaEditor, mapaHtml } from './mapa.js';
import { abrirGrabacion } from './grabar.js';
import { compartirGuion } from './pdfs.js';
import { crearCliente } from './clientes.js';

const S = { vid: '', tab: 'guion', mapas: new Set(), det: new Set(), undo: null };
const wide = () => matchMedia('(min-width: 900px)').matches;
const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
export function abrirVideo(id, api, tab = 'guion') {
  S.vid = id; S.tab = tab; S.undo = null; S.mapas = new Set(); S.det = new Set();
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

// ---------- módulo oculto 'video' (hoja de rodaje) ----------
const TABS = [['guion', '✍ Escribir'], ['grabar', '🎬 Grabar'], ['editar', '✂️ Editar'], ['entregar', '📤 Entregar']];
export const videoPage = { id: 'video', title: 'Video', icon: '🎬', hidden: true, static: true,
  render(el, api) {
    const v = store.get('videos', S.vid);
    if (!v) { el.innerHTML = '<div class="empty"><b>Ese video ya no existe</b><button class="btn btn-cancel" data-home>Volver</button></div>'; el.onclick = () => api.go('home'); return; }
    document.querySelector('.page-title h1').textContent = v.title || 'Video sin título';
    const n = contar(v); const i = estIdx(v.status); const k = colorCli(v.client);
    el.innerHTML = `<div class="cnt4">${[['escenas', n.escenas], ['personas', n.personas], ['planos', n.planos], ['segundos', n.segundos]].map(([l, x]) => `<div><b>${x}</b><small>${l}</small></div>`).join('')}</div>
      <div class="tabs2">${TABS.map(([t, l], j) => `<button type="button" class="${j < 2 ? 'big' : ''}" data-tab="${t}" aria-pressed="${S.tab === t}">${l}</button>`).join('')}</div>
      <button type="button" class="sumr" data-a="datos" style="--k:${esc(k)}"><span class="avc sm" style="--k:${esc(k)}">${esc(iniciales(cname(v.client) || 'NEXO PC'))}</span><b>${esc([cname(v.client) || 'NEXO PC', v.formato || '9:16', v.meta || v.objetivo].filter(Boolean).join(' · '))}</b><span class="muted">▾</span></button>
      <div class="steps" style="--k:${esc(k)}">${EST.map((e, j) => `<button type="button" data-st="${e[0]}" class="${j < i ? 'd' : j === i ? 'n' : ''}"><i></i>${e[1]}</button>`).join('')}</div>
      <div class="dates"><label><span>📅 Grabación</span><input type="datetime-local" data-v="grabacion" value="${esc(v.grabacion || '')}"></label><label><span>🟠 Entrega</span><input type="date" data-v="due" value="${esc(v.due || '')}"></label></div>
      <div id="vt"></div>`;
    const vt = el.querySelector('#vt');
    ({ guion: tabEscribir, grabar: tabGrabar, editar: tabEditar, entregar: tabEntregar })[S.tab](vt, api);
    const head = [...el.children].slice(0, 5);
    head.forEach((h0) => h0.addEventListener('click', (e) => {
      const st = e.target.closest('[data-st]'); if (st) { store.update('videos', v.id, { status: st.dataset.st, ...(st.dataset.st === 'publicado' && !v.publishDate ? { publishDate: fmt.today() } : {}) }); return this.render(el, api); }
      const t = e.target.closest('[data-tab]'); if (t) { S.tab = t.dataset.tab; return this.render(el, api); }
      if (e.target.closest('[data-a=datos]')) datosForm(() => this.render(el, api));
    }));
    el.querySelector('.dates').addEventListener('change', (e) => { const f = e.target.dataset.v; if (f) store.update('videos', v.id, { [f]: e.target.value }); });
  } };
const repaint = (api) => api.paint();

// ---------- ✍ Escribir: escenas con filas de colores, en el orden que quieras y sin llenar nada ----------
const opts = (list, val, ph) => `<option value="">${ph}</option>${[...list, ...(val && !list.includes(val) ? [val] : [])].map((o) => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}`;
function tabEscribir(el, api) {
  el.innerHTML = '<div class="hrw"></div>';
  const W = el.querySelector('.hrw');
  let focus = null;
  const editFilas = (si, fn) => editarArbol(S.vid, (x) => { const rows = filas(x[si]); fn(rows, visibles(rows)); x[si].planos = desdeFilas(rows); });
  const fila = (r, si, ri, letraPl) => {
    const id = `${si}|${ri}`; const m = `<button type="button" class="km" data-fm="${id}" aria-label="Opciones de la fila">⋮</button>`;
    if (r.k === 'persona') return `<div class="fila per"><div class="fh"><span class="fb">🧍 Persona</span><input class="ol-in nm" data-r="${id}|nombre" value="${esc(r.nombre)}" placeholder="¿Quién? (opcional)">${m}</div>
      <div class="mic-in sm"><textarea class="ol-in" rows="1" data-r="${id}|dice" placeholder="Qué dice…">${esc(r.dice)}</textarea><button type="button" class="mic-b" data-mic="${id}|dice" aria-label="Dictar">🎙</button></div></div>`;
    if (r.k === 'plano') { const open = S.mapas.has(r.id);
      return `<div class="fila pla"><div class="fh"><span class="fb">🎥 ${letraPl}</span><select class="ol-sel" data-r="${id}|tipo">${opts(PLANT.map((x) => x.l), tipoL(r.tipo) === 'Plano' ? '' : tipoL(r.tipo), 'Tipo de plano')}</select><input class="ol-in seg" type="number" inputmode="numeric" min="0" max="120" data-r="${id}|seg" value="${r.seg || ''}" placeholder="seg">${r.grabado ? '<span class="gr">✅</span>' : ''}${m}</div>
        <input class="ol-in" data-r="${id}|desc" value="${esc(r.desc)}" placeholder="Qué se ve (opcional)">
        <button type="button" class="mapb2 ${open ? 'on' : ''}" data-mt="${r.id}">🗺 Mapa de este plano${r.mapa?.length ? ` (${r.mapa.length})` : ''} ${open ? '▴' : '▾'}</button>${open ? `<div class="ol-map" data-map="${id}"></div>` : ''}</div>`; }
    if (r.k === 'camara') return `<div class="fila cam"><div class="fh"><span class="fb">📷 Cámara</span><span class="sp"></span>${m}</div><div class="ol-two"><input class="ol-in" data-r="${id}|donde" value="${esc(r.donde)}" placeholder="Dónde se ubica"><input class="ol-in" data-r="${id}|mira" value="${esc(r.mira)}" placeholder="Qué mira"></div></div>`;
    return `<div class="fila ${r.k === 'pantalla' ? 'txt' : 'nota'}"><div class="fh"><span class="fb">${r.k === 'pantalla' ? '🔤 En pantalla' : '📝 Nota'}</span><input class="ol-in" data-r="${id}|texto" value="${esc(r.texto)}" placeholder="${r.k === 'pantalla' ? 'Texto que sale en el video' : 'Nota'}">${m}</div></div>`;
  };
  const paint = () => {
    const v = store.get('videos', S.vid); const es = escenas(v);
    W.innerHTML = `${S.undo ? '<div class="undo card"><span>Se borró.</span><button class="btn btn-edit ghost sm" data-a="undo">↶ Deshacer</button></div>' : ''}
      ${es.map((e, si) => { const rows = filas(e); const vis = visibles(rows); let pl = -1;
        const letras = rows.map((r) => (r.k === 'plano' ? claq(si, ++pl) : ''));
        return `<div class="hesc">
        <div class="fh"><span class="escb">ESC ${si + 1}</span><input class="ol-in t" data-e="${si}|titulo" value="${esc(e.titulo)}" placeholder="Nombre de la escena">${lugarName(e) || e.fecha ? `<span class="chip sm">${esc([lugarName(e), e.fecha ? fmt.date(e.fecha) + (e.hora ? ' ' + e.hora : '') : ''].filter(Boolean).join(' · '))}</span>` : ''}<button type="button" class="km" data-em="${si}" aria-label="Opciones de la escena">⋮</button></div>
        <div class="sel4">${Object.entries(SEL).map(([f, L]) => `<select class="ol-sel" data-e="${si}|${f}" aria-label="${f}">${opts(L, e[f] || '', { io: 'Interior / exterior', momento: 'Momento del día', ambiente: 'Ambiente', luz: 'Luz' }[f])}</select>`).join('')}</div>
        <details class="hdet" ${S.det.has(e.id) ? 'open' : ''} data-det="${e.id}"><summary>＋ Detalles: lugar exacto, fecha, sonido, música, Filmora…</summary>
          <div class="hdg">
            <div class="field"><label>Lugar</label><div class="picks">${store.list('lugares').map((l) => `<button type="button" class="pick sm ${l.id === e.lugar ? 'on' : ''}" data-lg="${si}|${l.id}">📍 ${esc(l.name)}</button>`).join('')}</div><input class="ol-in bx" data-e="${si}|lugarTxt" value="${esc(e.lugarTxt)}" placeholder="Lugar exacto (si no está guardado)"></div>
            <div class="ol-two"><label class="fl">Fecha<input type="date" class="ol-in bx" data-e="${si}|fecha" value="${esc(e.fecha)}"></label><label class="fl">Hora<input type="time" class="ol-in bx" data-e="${si}|hora" value="${esc(e.hora)}"></label></div>
            ${[['sonido', 'Sonido (micrófono, ruido…)'], ['musica', 'Música de la escena'], ['filmora', 'Nota para Filmora (efecto, transición…)'], ['utileria', 'Utilería'], ['vestuario', 'Vestuario'], ['prepara', 'Qué debe preparar el cliente']].map(([f, l]) => `<input class="ol-in bx" data-e="${si}|${f}" value="${esc(e[f] || '')}" placeholder="${l}">`).join('')}
          </div></details>
        <div class="filas">${vis.map((fi, ri) => fila(rows[fi], si, ri, letras[fi])).join('') || '<p class="muted hvac">Agrega la primera fila con los botones de abajo.</p>'}</div>
        <div class="addf"><button type="button" class="a-per" data-af="${si}|persona">＋ Persona</button><button type="button" class="a-pla" data-af="${si}|plano">＋ Plano</button><button type="button" class="a-cam" data-af="${si}|camara">＋ Cámara</button><button type="button" class="a-mas" data-afm="${si}" aria-label="Más filas">⋯</button></div>
      </div>`; }).join('')}
      <div class="botf"><button type="button" class="b-esc" data-a="nesc">＋ Escena</button><button type="button" class="b-pdf" data-a="pdf">📄 PDF</button></div>
      <details class="card gpsc"><summary><b>Gancho, llamado y música</b> <span class="muted">${esc([v.gancho && 'gancho ✓', v.cta && 'llamado ✓', v.musica && 'música ✓'].filter(Boolean).join(' · ') || 'opcional')}</span></summary>
        <input class="ol-in bx" data-v="gancho" value="${esc(v.gancho || '')}" placeholder="Gancho: lo primero que se dice (3 s)"><input class="ol-in bx" data-v="cta" value="${esc(v.cta || '')}" placeholder="Llamado a la acción"><input class="ol-in bx" data-v="musica" value="${esc(v.musica || '')}" placeholder="Música"></details>
      <p class="muted hnote">Todo se guarda solo, también sin internet.</p>`;
    W.querySelectorAll('[data-map]').forEach((mp) => { const [si, ri] = mp.dataset.map.split('|').map(Number); const e = escenas(store.get('videos', S.vid))[si]; const rows = filas(e); const r = rows[visibles(rows)[ri]];
      mapaEditor(mp, r.mapa || [], (items) => editFilas(si, (R, V) => { R[V[ri]].mapa = items; }), { base: store.get('lugares', e.lugar)?.mapa || [] }); });
    W.querySelectorAll('textarea.ol-in').forEach(grow);
    if (focus) { const f = W.querySelector(focus); focus = null; if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
  };
  const grow = (t) => { t.style.height = 'auto'; t.style.height = Math.max(38, t.scrollHeight) + 'px'; };
  const repaintHead = () => { const v = store.get('videos', S.vid); const n = contar(v); const root = el.parentElement; const c = root?.querySelector('.cnt4'); if (c) c.innerHTML = [['escenas', n.escenas], ['personas', n.personas], ['planos', n.planos], ['segundos', n.segundos]].map(([l, x]) => `<div><b>${x}</b><small>${l}</small></div>`).join('');
    const i = estIdx(v.status); root?.querySelectorAll('.steps [data-st]').forEach((b, j) => { b.className = j < i ? 'd' : j === i ? 'n' : ''; }); };
  const all = () => { paint(); repaintHead(); };
  paint();
  const addFila = (si, k) => { let ri = 0; editFilas(si, (R) => { R.push(nuevaFila(k)); ri = visibles(R).length - 1; }); if (k === 'plano') S.mapas.delete('x');
    focus = `[data-r="${si}|${ri}|${{ persona: 'dice', plano: 'desc', camara: 'donde' }[k] || 'texto'}"]`; all(); };
  W.oninput = (e) => { if (e.target.matches('textarea.ol-in')) grow(e.target); };
  W.addEventListener('toggle', (e) => { const d = e.target.closest?.('[data-det]'); if (d) d.open ? S.det.add(d.dataset.det) : S.det.delete(d.dataset.det); }, true);
  W.onchange = (e) => {
    const t = e.target; const val = t.type === 'number' ? Number(t.value) || 0 : t.value.trim();
    if (t.dataset.e) { const [si, f] = t.dataset.e.split('|'); editarArbol(S.vid, (x) => { x[+si][f] = val; }); if (['fecha', 'hora', 'lugarTxt'].includes(f)) paint(); return; }
    if (t.dataset.v) { store.update('videos', S.vid, { [t.dataset.v]: val }); return; }
    if (t.dataset.r) { const [si, ri, f] = t.dataset.r.split('|'); const v2 = f === 'tipo' ? (PLANT.find((x) => x.l === val)?.k || val) : val; editFilas(+si, (R, V) => { R[V[+ri]][f] = v2; }); repaintHead(); }
  };
  W.onclick = (e) => {
    const g = (s) => e.target.closest(s); let b;
    if ((b = g('[data-af]'))) { const [si, k] = b.dataset.af.split('|'); return addFila(+si, k); }
    if ((b = g('[data-afm]'))) { const si = +b.dataset.afm; const body = h('<div class="list"><button class="list-item" data-k="pantalla">🔤 Texto en pantalla</button><button class="list-item" data-k="nota">📝 Nota</button></div>'); const s = sheet('＋ Otra fila', body); body.onclick = (ev) => { const x = ev.target.closest('[data-k]'); if (x) { s.close(); setTimeout(() => addFila(si, x.dataset.k), 280); } }; return; }
    if ((b = g('[data-mt]'))) { const id = b.dataset.mt; S.mapas.has(id) ? S.mapas.delete(id) : S.mapas.add(id); return paint(); }
    if ((b = g('[data-mic]'))) { const [si, ri, f] = b.dataset.mic.split('|'); const ta = W.querySelector(`[data-r="${si}|${ri}|${f}"]`); return dictar(b, ta, (val) => { grow(ta); editFilas(+si, (R, V) => { R[V[+ri]][f] = val.trim(); }); }); }
    if ((b = g('[data-lg]'))) { const [si, id] = b.dataset.lg.split('|'); editarArbol(S.vid, (x) => { x[+si].lugar = x[+si].lugar === id ? '' : id; }); return paint(); }
    if ((b = g('[data-em]'))) return menuEscena(+b.dataset.em, all);
    if ((b = g('[data-fm]'))) { const [si, ri] = b.dataset.fm.split('|').map(Number); return menuFila(si, ri, all, editFilas); }
    const a = g('[data-a]')?.dataset.a;
    if (a === 'undo' && S.undo) { store.update('videos', S.vid, { escenas: S.undo }); S.undo = null; all(); toast('↶ Listo'); return; }
    if (a === 'nesc') { let si = 0; editarArbol(S.vid, (x) => { x.push(nuevaEscena()); si = x.length - 1; }); focus = `[data-e="${si}|titulo"]`; return all(); }
    if (a === 'pdf') return compartirGuion(store.get('videos', S.vid));
  };
}
function snap() { S.undo = copia(escenas(store.get('videos', S.vid))); clearTimeout(snap.t); snap.t = setTimeout(() => { S.undo = null; }, 15000); }
function menuEscena(si, after) {
  const es = escenas(store.get('videos', S.vid)); const n = es.length;
  const body = h(`<div class="list"><button class="list-item" data-m="up" ${si === 0 ? 'disabled' : ''}>⬆️ Subir escena</button><button class="list-item" data-m="down" ${si === n - 1 ? 'disabled' : ''}>⬇️ Bajar escena</button>
    <button class="list-item" data-m="dup">⧉ Duplicar escena</button><button class="list-item" data-m="del" style="color:var(--c-delete)">🗑 Borrar escena</button></div>`);
  const s = sheet(`ESC ${si + 1}${es[si].titulo ? ' · ' + es[si].titulo : ''}`, body);
  body.onclick = (e) => { const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return; snap();
    editarArbol(S.vid, (x) => { if (m === 'up') [x[si - 1], x[si]] = [x[si], x[si - 1]]; if (m === 'down') [x[si + 1], x[si]] = [x[si], x[si + 1]];
      if (m === 'dup') { const c = copia(x[si]); c.id = uid(); c.planos.forEach((p) => { p.id = (p.auto ? 'auto-' : '') + uid(); p.tomas = []; p.grabado = false; (p.items || []).forEach((i) => { i.id = uid(); }); }); x.splice(si + 1, 0, c); }
      if (m === 'del') x.splice(si, 1); });
    if (m !== 'del') S.undo = null; s.close(); after(); };
}
function menuFila(si, ri, after, editFilas) {
  const e = escenas(store.get('videos', S.vid))[si]; const rows = filas(e); const V = visibles(rows); const r = rows[V[ri]];
  const body = h(`<div class="list">${r.k === 'plano' ? '<button class="list-item" data-m="mov">🎥 Movimiento y grabado</button>' : ''}
    <button class="list-item" data-m="up" ${ri === 0 ? 'disabled' : ''}>⬆️ Subir</button><button class="list-item" data-m="down" ${ri === V.length - 1 ? 'disabled' : ''}>⬇️ Bajar</button>
    <button class="list-item" data-m="dup">⧉ Duplicar</button><button class="list-item" data-m="del" style="color:var(--c-delete)">🗑 Borrar fila</button></div>`);
  const s = sheet({ persona: '🧍 Persona', plano: '🎥 Plano', camara: '📷 Cámara', pantalla: '🔤 En pantalla', nota: '📝 Nota' }[r.k], body);
  body.onclick = (ev) => { const m = ev.target.closest('[data-m]')?.dataset.m; if (!m) return;
    if (m === 'mov') { s.close(); const pi = (e.planos || []).findIndex((p) => p.id === r.id); return setTimeout(() => planoDetalles(si, pi, after), 280); }
    snap(); editFilas(si, (R, VV) => { const a = VV[ri];
      if (m === 'up') { const b2 = VV[ri - 1]; const [x] = R.splice(a, 1); R.splice(b2, 0, x); }
      if (m === 'down') { const b2 = VV[ri + 1]; const [x] = R.splice(a, 1); R.splice(b2, 0, x); }
      if (m === 'dup') { const c = copia(R[a]); c.id = uid(); if (c.k === 'plano') { c.tomas = []; c.grabado = false; } R.splice(a + 1, 0, c); }
      if (m === 'del') R.splice(a, 1); });
    if (m !== 'del') S.undo = null; s.close(); after(); };
}
function planoDetalles(si, pi, after) {
  const p = escenas(store.get('videos', S.vid))[si].planos[pi];
  const f = h(`<form class="form" novalidate><div class="field"><label>Tipo de plano (opcional)</label><div class="picks">${PLANT.map((x) => `<button type="button" class="pick sm ${p.tipo === x.k ? 'on' : ''}" data-t="${x.k}">${x.e} ${x.l}</button>`).join('')}</div></div>
    <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="field" style="flex:0 0 100px"><label for="ps">Segundos</label><input id="ps" type="number" inputmode="numeric" min="0" max="120" value="${p.seg || ''}"></div><div class="field" style="flex:1"><label for="pm">Movimiento</label><select id="pm"><option value="">—</option>${MOVS.map((m) => `<option ${m === p.mov ? 'selected' : ''}>${m}</option>`).join('')}</select></div></div>
    <label class="chkl"><input type="checkbox" id="pg" ${p.grabado ? 'checked' : ''}> Ya está grabado</label>
    <div class="row end"><button class="btn btn-create">✓ Listo</button></div></form>`);
  const s = sheet(`${claq(si, pi)} · detalles`, f); let tipo = p.tipo || '';
  f.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tipo = tipo === b.dataset.t ? '' : b.dataset.t; f.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x.dataset.t === tipo)); });
  f.addEventListener('submit', (e) => { e.preventDefault(); editarArbol(S.vid, (x) => Object.assign(x[si].planos[pi], { tipo, seg: Number(f.querySelector('#ps').value) || 0, mov: f.querySelector('#pm').value, grabado: f.querySelector('#pg').checked })); s.close(); after(); });
}
function datosForm(after) {
  const v = store.get('videos', S.vid); const cs = store.list('clients');
  const f = h(`<form class="form" novalidate>
    <div class="field"><label for="vt">Nombre del video</label><input id="vt" value="${esc(v.title)}"></div>
    <div class="field"><label for="vc">Cliente</label><select id="vc"><option value="">Sin cliente / NEXO PC</option>${cs.map((c) => `<option value="${c.id}" ${c.id === v.client ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="__new">＋ Cliente nuevo…</option></select></div>
    <div class="field"><label>Objetivo</label><div class="picks">${OBJ.map((o) => `<button type="button" class="pick sm ${v.meta === o ? 'on' : ''}" data-obj="${o}">${o}</button>`).join('')}</div><input id="vo" value="${esc(v.objetivo || '')}" placeholder="Detalle del objetivo (opcional): llenar la agenda de diciembre" style="margin-top:6px"></div>
    <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="field" style="flex:1"><label for="vd">Duración</label><input id="vd" value="${esc(v.duracion || '')}" placeholder="30 s"></div><div class="field" style="flex:1"><label for="vf">Formato</label><select id="vf">${['9:16', '1:1', '4:5', '16:9'].map((x) => `<option ${x === (v.formato || '9:16') ? 'selected' : ''}>${x}</option>`).join('')}</select></div><div class="field" style="flex:1.2"><label for="vdu">Entrega</label><input id="vdu" type="date" value="${esc(v.due || '')}"></div></div>
    <div class="field"><label for="vg">Gancho (primeros 3 s)</label><input id="vg" value="${esc(v.gancho || '')}" placeholder="¿Este corte en 20 minutos?"></div>
    <div class="field"><label for="vcta">Llamado a la acción</label><input id="vcta" value="${esc(v.cta || '')}" placeholder="Agenda por WhatsApp"></div>
    <div class="field"><label for="vm">Música</label><input id="vm" value="${esc(v.musica || '')}" placeholder="Afrobeat suave"></div>
    <div class="field"><label>Etiquetas</label><div class="picks">${TAGS.map((t) => `<button type="button" class="pick sm ${(v.tags || '').includes(t) ? 'on' : ''}" data-tg="${t}">${t}</button>`).join('')}</div></div>
    <div class="row end"><button type="button" class="btn btn-delete ghost" data-a="del">🗑 Borrar video</button><button class="btn btn-create">✓ Guardar</button></div></form>`);
  const s = sheet('Datos del video', f);
  f.addEventListener('change', (e) => { if (e.target.id !== 'vc' || e.target.value !== '__new') return; const sel = e.target; sel.value = v.client || '';
    crearCliente((c) => { if (!c) return; const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.querySelector('[value="__new"]').before(o); sel.value = c.id; }); });
  f.addEventListener('click', async (e) => { const t = e.target.closest('[data-tg]'); if (t) t.classList.toggle('on');
    const o = e.target.closest('[data-obj]'); if (o) { const on = !o.classList.contains('on'); f.querySelectorAll('[data-obj]').forEach((x) => x.classList.remove('on')); if (on) o.classList.add('on'); }
    if (e.target.closest('[data-a=del]') && await confirmSheet('¿Borrar el video?', `${v.title} y su guion se borran.`, { yes: 'Borrar', danger: true })) { store.remove('videos', v.id); s.close(); history.back(); } });
  f.addEventListener('submit', (e) => { e.preventDefault(); const q = (id) => f.querySelector('#' + id).value.trim();
    store.update('videos', v.id, { title: q('vt') || 'Video sin título', meta: f.querySelector('[data-obj].on')?.dataset.obj || '', client: q('vc'), objetivo: q('vo'), duracion: q('vd'), formato: q('vf'), due: q('vdu'), gancho: q('vg'), cta: q('vcta'), musica: q('vm'), tags: [...f.querySelectorAll('[data-tg].on')].map((x) => x.dataset.tg).join(', ') });
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
export { S as estadoVideo };
