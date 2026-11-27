// 🎬 Pantalla del video: 🌳 Guion (árbol) · 📍 Grabar · ✂️ Editar · 📤 Entregar
import { store, fmt, esc, h, toast, sheet, confirmSheet } from '../../core/shell.js';
import { timer } from '../../core/timer.js';
import { EST, estIdx, colorCli, cname, lugarName, escenas, nuevaEscena, nuevoPlano, nuevoItem, ITEM, itemsDe, PLANT, MOVS, tipoL, claq, letra, editarArbol, copia, totalSeg, tomaBuena, horas, listaEdicion, FILMORA, TAGS, uid } from './datos.js';
import { mapaEditor, mapaHtml } from './mapa.js';
import { abrirGrabacion } from './grabar.js';
import { compartirGuion } from './pdfs.js';
import { crearCliente } from './clientes.js';

const S = { vid: '', tab: 'guion', closed: new Set(), closedP: new Set(), more: new Set(), undo: null };
const wide = () => matchMedia('(min-width: 900px)').matches;
const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;
export function abrirVideo(id, api, tab = 'guion') {
  S.vid = id; S.tab = tab; S.undo = null; S.closed = new Set(); S.closedP = new Set(); S.more = new Set();
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

// ---------- 🌳 Guion: esquema libre ----------
// Agregas escena, plano, diálogo, cámara, mapa, texto o nota en el orden que quieras, sin llenar nada.
// Todo se escribe ahí mismo cuando lo sepas (se guarda al salir de cada campo).
const ph = { persona: 'Qué dice…', camara: 'Dónde va la cámara', pantalla: 'Texto que sale en pantalla', nota: 'Nota' };
function tabGuion(el, api) {
  el.innerHTML = '<div class="olw"><div id="gl"></div></div>';
  const gl = el.querySelector('#gl');
  let focus = null;
  const itemHtml = (x, si, pi, ii) => {
    const id = `${si}|${pi}|${ii}`; const k = x.k;
    const menu = `<button type="button" class="km" data-im="${id}" aria-label="Opciones">⋮</button>`;
    if (k === 'persona') return `<div class="ol-it per"><span class="ic">🧍</span><div class="ol-col"><input class="ol-in nm" data-i="${id}|nombre" value="${esc(x.nombre)}" placeholder="¿Quién? (opcional)"><div class="mic-in sm"><textarea class="ol-in" rows="1" data-i="${id}|dice" placeholder="Qué dice…">${esc(x.dice)}</textarea><button type="button" class="mic-b" data-mic="${id}|dice" aria-label="Dictar">🎙</button></div>
        ${x.donde || x.hace || S.more?.has(x.id) ? `<div class="ol-two"><input class="ol-in sm" data-i="${id}|donde" value="${esc(x.donde)}" placeholder="Dónde está"><input class="ol-in sm" data-i="${id}|hace" value="${esc(x.hace)}" placeholder="Qué hace"></div>` : `<button type="button" class="linkish sm" data-more="${x.id}">＋ dónde está / qué hace</button>`}</div>${menu}</div>`;
    if (k === 'camara') return `<div class="ol-it"><span class="ic">📷</span><div class="ol-col"><input class="ol-in" data-i="${id}|donde" value="${esc(x.donde)}" placeholder="Dónde va la cámara"><input class="ol-in" data-i="${id}|mira" value="${esc(x.mira)}" placeholder="Qué mira"></div>${menu}</div>`;
    if (k === 'mapa') return `<div class="ol-it map"><span class="ic">🗺</span><div class="ol-col"><small class="muted">Mapa de este plano</small><div class="ol-map" data-map="${id}"></div></div>${menu}</div>`;
    return `<div class="ol-it"><span class="ic">${ITEM[k]?.[0] || '📝'}</span><div class="ol-col"><input class="ol-in" data-i="${id}|texto" value="${esc(x.texto)}" placeholder="${ph[k] || 'Texto'}"></div>${menu}</div>`;
  };
  const addBar = (si, pi) => `<div class="ol-add">${Object.entries(ITEM).map(([k, [ic, l]]) => `<button type="button" data-oadd="${si}|${pi}|${k}">＋ ${ic} ${l}</button>`).join('')}</div>`;
  const paintTree = () => {
    const vv = store.get('videos', S.vid); const es = escenas(vv);
    gl.innerHTML = `
      <div class="card kv vdat" data-a="datos"><b>Objetivo</b><span>${esc(vv.objetivo || '—')}</span><b>Duración</b><span>${esc(vv.duracion || (totalSeg(vv) ? totalSeg(vv) + ' s' : '—'))} · ${esc(vv.formato || '9:16')}</span><b>Gancho 3 s</b><span>${esc(vv.gancho || '—')}</span><b>Llamado</b><span>${esc(vv.cta || '—')}</span><span class="vdat-e">✎</span></div>
      ${S.undo ? '<div class="undo card"><span>Se borró.</span><button class="btn btn-edit ghost sm" data-a="undo">↶ Deshacer</button></div>' : ''}
      <div class="ol">${es.map((e, si) => { const cerrada = S.closed.has(e.id); const det = [lugarName(e), e.fecha ? fmt.date(e.fecha) + (e.hora ? ' ' + e.hora : '') : ''].filter(Boolean).join(' · ');
        return `<div class="ol-esc">
        <div class="ol-row esc"><button type="button" class="ar" data-tog="${e.id}" aria-label="${cerrada ? 'Abrir' : 'Cerrar'} escena">${cerrada ? '▸' : '▾'}</button><b class="cl">E${si + 1}</b><input class="ol-in t" data-e="${si}|titulo" value="${esc(e.titulo)}" placeholder="Escena ${si + 1} (nombre opcional)"><button type="button" class="chipb ${det ? 'on' : ''}" data-ee="${si}">📍 ${esc(det || 'lugar y fecha')}</button><button type="button" class="km" data-em="${si}" aria-label="Opciones de la escena">⋮</button></div>
        ${cerrada ? `<div class="muted ol-sum">${e.planos.length} plano(s)</div>` : `
          ${e.planos.map((p, pi) => { const pc = S.closedP.has(p.id); const its = itemsDe(p); const chips = [p.tipo && tipoL(p.tipo), p.seg ? p.seg + ' s' : '', p.mov].filter(Boolean).join(' · ');
            return `<div class="ol-pl ${p.grabado ? 'ok' : ''}">
            <div class="ol-row pl"><button type="button" class="ar" data-togp="${p.id}" aria-label="${pc ? 'Abrir' : 'Cerrar'} plano">${pc ? '▸' : '▾'}</button><b class="cl">${claq(si, pi)}</b><input class="ol-in" data-p="${si}|${pi}|desc" value="${esc(p.desc)}" placeholder="Plano · qué se ve (opcional)">${chips ? `<span class="chip sm">${esc(chips)}</span>` : ''}${p.grabado ? '<span class="gr">✅</span>' : ''}<button type="button" class="km" data-pm="${si}|${pi}" aria-label="Opciones del plano">⋮</button></div>
            ${pc ? `<div class="muted ol-sum">${its.map((x) => ITEM[x.k]?.[0]).join(' ') || 'vacío'}</div>` : `${its.map((x, ii) => itemHtml(x, si, pi, ii)).join('')}${addBar(si, pi)}`}</div>`; }).join('')}
          <div class="ol-addp"><button type="button" data-np="${si}">＋ Plano</button><button type="button" data-npd="${si}">＋ 🧍 Diálogo (plano nuevo)</button></div>`}</div>`; }).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn btn-create" data-a="nesc" style="flex:1">＋ Escena</button><button class="btn btn-edit ghost" data-a="pdf">📄 PDF para el cliente</button></div>
      ${!es.length ? '<p class="muted" style="font-size:13px">Toca ＋ Escena y ve agregando planos, diálogos, cámara, mapa o texto en el orden que quieras. Nada es obligatorio: el nombre y los detalles los pones cuando los sepas.</p>' : ''}`;
    // mapas (uno por plano)
    gl.querySelectorAll('[data-map]').forEach((m) => { const [si, pi, ii] = m.dataset.map.split('|').map(Number); const ee = escenas(store.get('videos', S.vid))[si];
      const it = itemsDe(ee.planos[pi])[ii]; mapaEditor(m, it.mapa || [], (items) => editarArbol(S.vid, (x) => { x[si].planos[pi].items[ii].mapa = items; }), { base: store.get('lugares', ee.lugar)?.mapa || [] }); });
    gl.querySelectorAll('textarea.ol-in').forEach(grow);
    if (focus) { const f = gl.querySelector(focus); focus = null; if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }
  };
  const grow = (t) => { t.style.height = 'auto'; t.style.height = Math.max(38, t.scrollHeight) + 'px'; };
  paintTree();
  const firstEmpty = (si, pi, ii, k) => (k === 'persona' ? `[data-i="${si}|${pi}|${ii}|dice"]` : k === 'mapa' ? null : `[data-i="${si}|${pi}|${ii}|${k === 'camara' ? 'donde' : 'texto'}"]`);
  el.oninput = (e) => { if (e.target.matches('textarea.ol-in')) grow(e.target); };
  el.onchange = (e) => {
    const t = e.target; const val = t.value.trim();
    if (t.dataset.e) { const [si, f] = t.dataset.e.split('|'); editarArbol(S.vid, (x) => { x[+si][f] = val; }); return; }
    if (t.dataset.p) { const [si, pi, f] = t.dataset.p.split('|'); editarArbol(S.vid, (x) => { x[+si].planos[+pi][f] = val; }); return; }
    if (t.dataset.i) { const [si, pi, ii, f] = t.dataset.i.split('|'); editarArbol(S.vid, (x) => { x[+si].planos[+pi].items[+ii][f] = val; }); }
  };
  el.onclick = async (e) => {
    const g = (s) => e.target.closest(s); let b;
    if ((b = g('[data-tog]'))) { const id = b.dataset.tog; S.closed.has(id) ? S.closed.delete(id) : S.closed.add(id); return paintTree(); }
    if ((b = g('[data-togp]'))) { const id = b.dataset.togp; S.closedP.has(id) ? S.closedP.delete(id) : S.closedP.add(id); return paintTree(); }
    if ((b = g('[data-more]'))) { S.more.add(b.dataset.more); return paintTree(); }
    if ((b = g('[data-mic]'))) { const path = b.dataset.mic; const ta = gl.querySelector(`[data-i="${path}"]`); const [si, pi, ii, f] = path.split('|'); return dictar(b, ta, (val) => { grow(ta); editarArbol(S.vid, (x) => { x[+si].planos[+pi].items[+ii][f] = val.trim(); }); }); }
    if ((b = g('[data-oadd]'))) { const [si, pi, k] = b.dataset.oadd.split('|'); let ii = 0; editarArbol(S.vid, (x) => { x[+si].planos[+pi].items.push(nuevoItem(k)); ii = x[+si].planos[+pi].items.length - 1; }); focus = firstEmpty(si, pi, ii, k); return paintTree(); }
    if ((b = g('[data-np]'))) { const si = +b.dataset.np; let pi = 0; editarArbol(S.vid, (x) => { x[si].planos.push(nuevoPlano()); pi = x[si].planos.length - 1; }); focus = `[data-p="${si}|${pi}|desc"]`; return paintTree(); }
    if ((b = g('[data-npd]'))) { const si = +b.dataset.npd; let pi = 0; editarArbol(S.vid, (x) => { const p = nuevoPlano(); p.items.push(nuevoItem('persona')); x[si].planos.push(p); pi = x[si].planos.length - 1; }); focus = `[data-i="${si}|${pi}|0|dice"]`; return paintTree(); }
    if ((b = g('[data-ee]'))) return escenaForm(+b.dataset.ee, paintTree);
    if ((b = g('[data-em]'))) return menuNodo('esc', [+b.dataset.em], paintTree);
    if ((b = g('[data-pm]'))) return menuNodo('pl', b.dataset.pm.split('|').map(Number), paintTree);
    if ((b = g('[data-im]'))) return menuNodo('it', b.dataset.im.split('|').map(Number), paintTree);
    const a = g('[data-a]')?.dataset.a;
    if (a === 'datos') return datosForm(() => repaint(api));
    if (a === 'undo' && S.undo) { store.update('videos', S.vid, { escenas: S.undo }); S.undo = null; paintTree(); toast('↶ Listo'); return; }
    if (a === 'nesc') { let si = 0; editarArbol(S.vid, (x) => { x.push(nuevaEscena()); si = x.length - 1; }); focus = `[data-e="${si}|titulo"]`; return paintTree(); }
    if (a === 'pdf') return compartirGuion(store.get('videos', S.vid));
  };
}
function snap() { S.undo = copia(escenas(store.get('videos', S.vid))); clearTimeout(snap.t); snap.t = setTimeout(() => { S.undo = null; }, 15000); }
// ⋮ de escena, plano o elemento: detalles, subir, bajar, duplicar, mover, borrar
function menuNodo(tipo, [si, pi, ii], after) {
  const es = escenas(store.get('videos', S.vid));
  const lista = tipo === 'esc' ? es : tipo === 'pl' ? es[si].planos : itemsDe(es[si].planos[pi]);
  const idx = tipo === 'esc' ? si : tipo === 'pl' ? pi : ii; const n = lista.length;
  const titulo = tipo === 'esc' ? `E${si + 1}${es[si].titulo ? ' · ' + es[si].titulo : ''}` : tipo === 'pl' ? claq(si, pi) : `${ITEM[lista[ii].k][0]} ${ITEM[lista[ii].k][1]}`;
  const body = h(`<div class="list">
    ${tipo === 'esc' ? '<button class="list-item" data-m="det">📍 Lugar, fecha, luz y qué prepara el cliente</button>' : tipo === 'pl' ? '<button class="list-item" data-m="det">🎥 Tipo de plano, segundos y movimiento</button>' : ''}
    <button class="list-item" data-m="up" ${idx === 0 ? 'disabled' : ''}>⬆️ Subir</button><button class="list-item" data-m="down" ${idx === n - 1 ? 'disabled' : ''}>⬇️ Bajar</button>
    <button class="list-item" data-m="dup">⧉ Duplicar</button>${tipo === 'pl' && es.length > 1 ? '<button class="list-item" data-m="mv">↪ Pasar a otra escena</button>' : ''}
    <button class="list-item" data-m="del" style="color:var(--c-delete)">🗑 Borrar</button></div>`);
  const s = sheet(titulo, body);
  const arr = (x) => (tipo === 'esc' ? x : tipo === 'pl' ? x[si].planos : x[si].planos[pi].items);
  body.onclick = (e) => {
    const t = e.target.closest('[data-to]'); if (t) { snap(); editarArbol(S.vid, (x) => { const [p] = x[si].planos.splice(pi, 1); x[+t.dataset.to].planos.push(p); }); S.undo = null; s.close(); return after(); }
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
    if (m === 'det') { s.close(); return setTimeout(() => (tipo === 'esc' ? escenaForm(si, after) : planoDetalles(si, pi, after)), 280); }
    if (m === 'mv') { body.innerHTML = `<div class="list">${es.map((x, k) => (k === si ? '' : `<button class="list-item" data-to="${k}">E${k + 1} · ${esc(x.titulo || 'Escena ' + (k + 1))}</button>`)).join('')}</div>`; return; }
    snap(); editarArbol(S.vid, (x) => { const L = arr(x);
      if (m === 'up') [L[idx - 1], L[idx]] = [L[idx], L[idx - 1]];
      if (m === 'down') [L[idx + 1], L[idx]] = [L[idx], L[idx + 1]];
      if (m === 'dup') { const c = copia(L[idx]); c.id = uid(); if (tipo === 'esc') c.planos.forEach((p) => { p.id = uid(); p.tomas = []; p.grabado = false; (p.items || []).forEach((i) => { i.id = uid(); }); }); if (tipo === 'pl') { c.tomas = []; c.grabado = false; (c.items || []).forEach((i) => { i.id = uid(); }); } L.splice(idx + 1, 0, c); }
      if (m === 'del') L.splice(idx, 1);
    });
    if (m !== 'del') S.undo = null; s.close(); after();
  };
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
    <div class="field"><label for="vo">Objetivo</label><input id="vo" value="${esc(v.objetivo || '')}" placeholder="Llenar la agenda de diciembre"></div>
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
