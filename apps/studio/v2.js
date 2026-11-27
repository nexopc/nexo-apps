// NEXO Studio v2: línea de metro por video, guion 100 % modular, orden de grabación,
// planes de contenido mensuales que aprueba el cliente, idea rápida (texto o voz) y biblioteca reutilizable.
import { store, fmt, esc, h, toast, sheet, confirmSheet, openForm } from '../../core/shell.js';

export const ST = [['idea', '💡', 'Plan'], ['guion', '📝', 'Guion'], ['grabado', '🎥', 'Grabar'], ['edicion', '✂️', 'Editar'], ['revision', '👀', 'Aprobación'], ['publicado', '✅', 'Entregado']];
const cname = (id) => store.get('clients', id)?.name || '';
// Copiar con respaldo: portapapeles → método antiguo → mostrar el texto para copiarlo a mano (siempre con botón de WhatsApp)
async function copyTxt(t, { wa = false } = {}) {
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch {}
  if (!ok) { try { const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch {} }
  if (ok && !wa) { toast('Copiado: pégalo en WhatsApp'); return true; }
  const body = h(`<div class="form">${ok ? '<p class="muted" style="margin:0">✓ Copiado. Pégalo en el chat del cliente o ábrelo directo:</p>' : '<p class="muted" style="margin:0">Tu teléfono no dejó copiar solo. Mantén presionado el texto para copiarlo, o ábrelo directo en WhatsApp:</p>'}
    <textarea readonly rows="8" style="width:100%;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--fg);padding:10px">${esc(t)}</textarea>
    <a class="btn btn-create" href="https://wa.me/?text=${encodeURIComponent(t)}" target="_blank" rel="noopener">💬 Abrir en WhatsApp</a></div>`);
  sheet('Mensaje listo', body);
  return true;
}

// ---------- Línea de metro ----------
export function metro(status, { big = false } = {}) {
  const i = Math.max(0, ST.findIndex((s) => s[0] === (status || 'idea')));
  return `<div class="metro ${big ? 'big' : ''}" role="img" aria-label="Paso ${i + 1} de ${ST.length}: ${ST[i][2]}">${ST.map(([k, e, l], j) => `${j ? `<span class="mline ${j <= i ? 'on' : ''}"></span>` : ''}<span class="mst ${j < i ? 'on' : j === i ? 'cur' : ''}" ${big ? `data-st="${k}"` : ''} title="${l}">${big ? `<i>${e}</i><small>${l}</small>` : ''}</span>`).join('')}</div>`;
}
export function videoSheet(v, videosMod) {
  if (!v) return;
  const body = h('<div class="form"></div>');
  let un = null;
  const s = sheet(v.title, body, { onClose: () => un?.() });
  const paint = () => {
    v = store.get('videos', v.id); if (!v) return s.close();
    const sc = store.get('scripts', v.script), sh = store.get('shoots', v.shoot);
    body.innerHTML = `${metro(v.status, { big: true })}
      <p class="muted" style="font-size:12px;margin:0;text-align:center">Toca una estación para mover el video</p>
      <div class="list">
        <div class="list-item" data-a="client"><span>🤝</span><div class="li-main"><div class="li-title">${esc(cname(v.client) || 'Sin cliente')}</div><div class="li-sub">${esc(v.platform || 'Red sin definir')}${v.publishDate ? ' · 📅 ' + fmt.date(v.publishDate) : ''}</div></div></div>
        <div class="list-item" data-a="script"><span>📝</span><div class="li-main"><div class="li-title">${sc ? esc(sc.title) : 'Sin guion'}</div><div class="li-sub">${sc ? `${(sc.blocks || []).filter((b) => b.type === 'escena').length} escenas · toca para abrir` : 'Toca para crear o elegir un guion'}</div></div></div>
        <div class="list-item" data-a="shoot"><span>🎥</span><div class="li-main"><div class="li-title">${sh ? esc(sh.title) : 'Sin grabación agendada'}</div><div class="li-sub">${sh ? `${fmt.date(sh.date)} ${esc(sh.time || '')} ${sh.place ? '· 📍 ' + esc(sh.place) : ''}` : 'Toca para agendarla'}</div></div></div>
      </div>
      ${sc && (sc.blocks || []).some((b) => b.type === 'escena') ? '<button type="button" class="btn btn-pending ghost" data-a="orden">🎬 Orden de grabación</button>' : ''}
      <div class="row end"><button type="button" class="btn btn-edit ghost" data-a="edit">✎ Editar datos</button></div>`;
  };
  paint();
  un = store.subscribe('*', (c) => { if (['videos', 'scripts', 'shoots'].includes(c)) paint(); });
  body.addEventListener('click', (e) => {
    const st = e.target.closest('[data-st]');
    if (st) { const n = st.dataset.st; store.update('videos', v.id, { status: n, ...(n === 'publicado' && !v.publishDate ? { publishDate: fmt.today() } : {}) }); navigator.vibrate?.(10); toast(`→ ${ST.find((x) => x[0] === n)[2]}`); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'edit' || a === 'client') openForm(videosMod, v);
    if (a === 'script') { if (v.script && store.get('scripts', v.script)) return scriptEditor(store.get('scripts', v.script));
      pickOrNewScript((sc) => { store.update('videos', v.id, { script: sc.id, ...(v.status === 'idea' ? { status: 'guion' } : {}) }); scriptEditor(sc); }, v); }
    if (a === 'shoot') { if (v.shoot && store.get('shoots', v.shoot)) return openForm(SHOOT_MOD, store.get('shoots', v.shoot));
      const sh = store.add('shoots', { title: 'Grabar: ' + v.title, client: v.client || '', date: fmt.today(), checklist: 'Batería cargada\nMemoria libre\nMicrófono\nLuz\nGuion\nPlanos de apoyo (B-roll)' });
      store.update('videos', v.id, { shoot: sh.id }); openForm(SHOOT_MOD, sh); }
    if (a === 'orden') shootingOrder(store.get('scripts', v.script));
  });
}
let SHOOT_MOD = null;
export function setShootMod(m) { SHOOT_MOD = m; }

// ---------- Guion modular ----------
export const BT = {
  escena: ['🎬', 'Escena', '#FF4F9A'], lugar: ['📍', 'Lugar', '#1CE783'], persona: ['👤', 'Persona', '#FFC23D'], plano: ['🎥', 'Plano', '#4EA8FF'],
  camara: ['📹', 'Cámara', '#4EA8FF'], angulo: ['📐', 'Ángulo', '#4EA8FF'], dialogo: ['💬', 'Diálogo', '#FFC23D'], vestuario: ['👕', 'Vestuario', '#1CE783'],
  tono: ['🎭', 'Tono', '#9B5CFF'], referencia: ['🔗', 'Referencia', '#9B5CFF'], corte: ['✂️', 'Dónde cortar', '#FF5C6C'], nota: ['📝', 'Nota', '#8E99AD'],
};
const PH = { escena: 'Escena 1 · Taller · tarde', lugar: 'Taller de NEXO PC', persona: 'Cristóbal', plano: 'Plano medio', camara: 'Fija en trípode', angulo: 'Ángulo bajo', dialogo: '"¿Tu PC suena así?"', vestuario: 'Camisa NEXO negra', tono: 'Curioso, rápido', referencia: 'https://… o "reel de @…"', corte: 'Cortar justo después de "¿así?"', nota: 'Algo para recordar' };
export const MOLD_BLOCKS = {
  'Gancho-Problema-Solución-CTA': [['escena', 'Gancho (0–3 s)'], ['dialogo', ''], ['escena', 'Problema (3–10 s)'], ['dialogo', ''], ['escena', 'Solución (10–40 s)'], ['dialogo', ''], ['escena', 'Llamado a la acción'], ['dialogo', '']],
  'Antes y después': [['escena', 'Antes'], ['plano', ''], ['escena', 'Transición'], ['corte', 'Corte fuerte con sonido'], ['escena', 'Después'], ['plano', ''], ['dialogo', '']],
  'Top 3': [['escena', 'Gancho: "3 ___ que nadie te dice"'], ['escena', 'Número 3'], ['escena', 'Número 2'], ['escena', 'Número 1 (el mejor)'], ['escena', 'Llamado a la acción']],
  'Mito vs realidad': [['escena', 'Mito'], ['dialogo', ''], ['escena', 'Realidad (con dato)'], ['dialogo', ''], ['escena', 'Llamado a la acción']],
  'Unboxing / review': [['escena', 'Gancho: precio o resultado'], ['escena', 'Qué trae'], ['plano', 'Detalle de cerca'], ['escena', '3 puntos fuertes'], ['escena', '1 punto débil (honesto)'], ['escena', 'Dónde comprar']],
  'Tutorial rápido': [['escena', 'Qué vas a lograr'], ['escena', 'Paso 1'], ['escena', 'Paso 2'], ['escena', 'Paso 3'], ['escena', 'Resultado + llamado a la acción']],
  'En blanco': [['escena', 'Escena 1']],
};
const mk = (type, text = '') => ({ id: store.uid(), type, text, ...(type === 'escena' ? { tomas: 2 } : {}) });
export function newScript(mold = 'En blanco', preset = {}) {
  return store.add('scripts', { title: preset.title || (mold === 'En blanco' ? 'Guion nuevo' : mold), mold, client: preset.client || '', blocks: (MOLD_BLOCKS[mold] || MOLD_BLOCKS['En blanco']).map(([t, x]) => mk(t, x)) });
}
function pickOrNewScript(cb, v = null) {
  const ex = store.list('scripts').filter((s) => !v?.client || !s.client || s.client === v.client).slice(-8).reverse();
  const body = h(`<div class="form"><b>Crear con un molde</b><div class="picks">${Object.keys(MOLD_BLOCKS).map((m) => `<button type="button" class="pick" data-m="${esc(m)}">🧩 ${esc(m)}</button>`).join('')}</div>
    ${ex.length ? `<b>O usar uno que ya tienes</b><div class="list">${ex.map((s) => `<div class="list-item" data-s="${s.id}"><span>📄</span><div class="li-main"><div class="li-title">${esc(s.title)}</div><div class="li-sub">${esc(cname(s.client) || s.mold || '')}</div></div></div>`).join('')}</div>` : ''}</div>`);
  const sh = sheet('Guion', body);
  body.onclick = (e) => {
    const m = e.target.closest('[data-m]'); if (m) { const sc = newScript(m.dataset.m, { title: v ? v.title : '', client: v?.client }); sh.close(); setTimeout(() => cb(sc), 300); return; }
    const s = e.target.closest('[data-s]'); if (s) { sh.close(); setTimeout(() => cb(store.get('scripts', s.dataset.s)), 300); }
  };
}
export function startScript() { pickOrNewScript((sc) => scriptEditor(sc)); }
export function scriptEditor(sc) {
  if (!sc) return;
  if (!Array.isArray(sc.blocks)) sc = store.update('scripts', sc.id, { blocks: sc.body ? [mk('nota', sc.body)] : [mk('escena', 'Escena 1')] });
  let blocks = sc.blocks.map((b) => ({ ...b })); let title = sc.title;
  const body = h('<div class="sed"></div>');
  let tmr = 0;
  const save = (now = false) => { clearTimeout(tmr); const f = () => store.update('scripts', sc.id, { blocks, title: title.trim() || 'Guion' }); now ? f() : (tmr = setTimeout(f, 400)); };
  const s = sheet('📝 Guion', body, { onClose: () => save(true) });
  let dragFrom = null;
  const sceneNo = (i) => blocks.slice(0, i + 1).filter((b) => b.type === 'escena').length;
  const paint = (focusId = null) => {
    body.innerHTML = `<input class="stitle" value="${esc(title)}" aria-label="Título del guion" placeholder="Título del guion">
      <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:12px">${blocks.filter((b) => b.type === 'escena').length} escenas · ${blocks.length} bloques · se guarda solo</span>
        ${blocks.some((b) => b.type === 'escena') ? '<button type="button" class="btn btn-pending ghost sm" data-a="orden">🎬 Orden de grabación</button>' : ''}</div>
      <div class="blist">${blocks.map((b, i) => { const [ic, lb, col] = BT[b.type] || BT.nota; return `<div class="sblk ${b.type === 'escena' ? 'scene' : ''}" data-i="${i}" draggable="true" style="--c:${col}">
        <div class="sh"><span class="grip" aria-hidden="true">⠿</span><button type="button" class="stype" data-type="${i}" title="Cambiar tipo">${ic} ${lb}${b.type === 'escena' ? ' ' + sceneNo(i) : ''}</button>
          ${b.type === 'escena' ? `<span class="tomas"><button type="button" data-tk="${i}" data-d="-1" aria-label="Menos tomas">−</button><b class="num">${b.tomas || 1}</b> tomas<button type="button" data-tk="${i}" data-d="1" aria-label="Más tomas">＋</button></span>` : ''}
          <span class="sctl"><button type="button" data-mv="${i}" data-d="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>▲</button><button type="button" data-mv="${i}" data-d="1" aria-label="Bajar" ${i === blocks.length - 1 ? 'disabled' : ''}>▼</button><button type="button" data-dup="${i}" aria-label="Duplicar">⧉</button><button type="button" data-del="${i}" aria-label="Borrar">✕</button></span></div>
        <textarea rows="1" data-tx="${i}" placeholder="${esc(PH[b.type] || '')}">${esc(b.text || '')}</textarea></div>`; }).join('')}</div>
      <div class="addb"><span class="muted" style="font-size:12px;width:100%">＋ Agregar bloque</span>${Object.entries(BT).map(([k, [ic, lb]]) => `<button type="button" class="pick" data-add="${k}">${ic} ${lb}</button>`).join('')}</div>
      <div class="row end"><button type="button" class="btn btn-delete ghost sm" data-a="delscript">🗑 Borrar guion</button><button type="button" class="btn btn-edit ghost sm" data-a="copy">📋 Copiar como texto</button></div>`;
    body.querySelectorAll('textarea').forEach((t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; });
    if (focusId) { const i = blocks.findIndex((b) => b.id === focusId); body.querySelector(`[data-tx="${i}"]`)?.focus(); }
  };
  paint();
  body.addEventListener('input', (e) => {
    if (e.target.matches('.stitle')) { title = e.target.value; save(); return; }
    const t = e.target.closest('[data-tx]'); if (!t) return;
    blocks[+t.dataset.tx].text = t.value; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; save();
  });
  body.addEventListener('click', async (e) => {
    const g = (sel) => e.target.closest(sel);
    let b;
    if ((b = g('[data-add]'))) { const nb = mk(b.dataset.add); blocks.push(nb); save(); paint(nb.id); body.querySelector(`[data-i="${blocks.length - 1}"]`)?.scrollIntoView({ block: 'center' }); return; }
    if ((b = g('[data-mv]'))) { const i = +b.dataset.mv, j = i + +b.dataset.d; if (j < 0 || j >= blocks.length) return; [blocks[i], blocks[j]] = [blocks[j], blocks[i]]; save(); paint(); return; }
    if ((b = g('[data-dup]'))) { const i = +b.dataset.dup; blocks.splice(i + 1, 0, { ...blocks[i], id: store.uid() }); save(); paint(); return; }
    if ((b = g('[data-del]'))) { const i = +b.dataset.del; const x = blocks[i]; blocks.splice(i, 1); save(); paint(); toast(`Bloque borrado`); showUndo(() => { blocks.splice(i, 0, x); save(); paint(); }); return; }
    if ((b = g('[data-tk]'))) { const i = +b.dataset.tk; blocks[i].tomas = Math.max(1, Math.min(20, (blocks[i].tomas || 1) + +b.dataset.d)); save(); paint(); return; }
    if ((b = g('[data-type]'))) { const i = +b.dataset.type; typePicker(blocks[i].type, (t) => { blocks[i] = { ...blocks[i], type: t, ...(t === 'escena' && !blocks[i].tomas ? { tomas: 2 } : {}) }; save(); paint(); }); return; }
    const a = g('[data-a]')?.dataset.a;
    if (a === 'orden') { save(true); shootingOrder(store.get('scripts', sc.id)); }
    if (a === 'copy') { save(true); copyTxt(scriptText(store.get('scripts', sc.id))); }
    if (a === 'delscript' && await confirmSheet('¿Borrar guion?', `"${title}" se borra en todos tus dispositivos.`, { yes: 'Borrar', danger: true })) { clearTimeout(tmr); store.remove('scripts', sc.id); for (const v of store.list('videos').filter((x) => x.script === sc.id)) store.update('videos', v.id, { script: '' }); toast('Guion borrado'); s.close(); }
  });
  // Arrastrar para reordenar (PC). En celular: ▲ ▼
  body.addEventListener('dragstart', (e) => { const r = e.target.closest('.sblk'); if (!r || e.target.matches('textarea')) return; dragFrom = +r.dataset.i; r.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; });
  body.addEventListener('dragover', (e) => { if (dragFrom == null) return; const r = e.target.closest('.sblk'); if (r) { e.preventDefault(); body.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); r.classList.add('over'); } });
  body.addEventListener('drop', (e) => { const r = e.target.closest('.sblk'); if (dragFrom == null || !r) return; e.preventDefault(); const to = +r.dataset.i; const [x] = blocks.splice(dragFrom, 1); blocks.splice(to, 0, x); dragFrom = null; save(); paint(); });
  body.addEventListener('dragend', () => { dragFrom = null; body.querySelectorAll('.drag,.over').forEach((x) => x.classList.remove('drag', 'over')); });
  return s;
}
function showUndo(fn) {
  let u = document.querySelector('.undo-bar'); u?.remove();
  u = h('<div class="undo-bar"><span>Bloque borrado</span><button class="btn btn-edit sm">↺ Deshacer</button></div>');
  document.body.appendChild(u);
  u.querySelector('button').onclick = () => { fn(); u.remove(); };
  setTimeout(() => u.remove(), 5000);
}
function typePicker(cur, cb) {
  const body = h(`<div class="picks">${Object.entries(BT).map(([k, [ic, lb]]) => `<button type="button" class="pick ${k === cur ? 'on' : ''}" data-t="${k}">${ic} ${lb}</button>`).join('')}</div>`);
  const s = sheet('Tipo de bloque', body);
  body.onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { s.close(); cb(b.dataset.t); } };
}
export function scenesOf(sc) {
  const out = []; let cur = null;
  (sc.blocks || []).forEach((b) => {
    if (b.type === 'escena') { cur = { id: b.id, n: out.length + 1, title: b.text || 'Escena ' + (out.length + 1), tomas: b.tomas || 1, lugar: '', persona: [], cortes: [], planos: [] }; out.push(cur); return; }
    if (!cur) { cur = { id: 'intro', n: 0, title: 'Antes de la escena 1', tomas: 1, lugar: '', persona: [], cortes: [], planos: [] }; out.push(cur); }
    if (b.type === 'lugar' && b.text) cur.lugar = b.text.trim();
    if (b.type === 'persona' && b.text) cur.persona.push(b.text.trim());
    if (b.type === 'corte' && b.text) cur.cortes.push(b.text.trim());
    if (['plano', 'camara', 'angulo'].includes(b.type) && b.text) cur.planos.push(b.text.trim());
  });
  // una escena sin lugar hereda el de la anterior (en el guion se suele escribir una vez)
  let last = ''; for (const s of out) { if (s.lugar) last = s.lugar; else s.lugar = last; }
  return out;
}
export function scriptText(sc) {
  return `${sc.title}\n\n` + (sc.blocks || []).map((b, i) => { const [ic, lb] = BT[b.type] || BT.nota; return b.type === 'escena' ? `\n${ic} ${(b.text || lb).toUpperCase()} (${b.tomas || 1} tomas)` : `${ic} ${lb}: ${b.text || ''}`; }).join('\n');
}
// Orden de grabación: agrupa escenas por lugar y persona para no ir y volver; muestra tomas y dónde cortar
export function shootingOrder(sc) {
  if (!sc) return;
  const body = h('<div class="form"></div>');
  const s = sheet('🎬 Orden de grabación', body);
  const paint = () => {
    sc = store.get('scripts', sc.id); if (!sc) return s.close();
    const scenes = scenesOf(sc).filter((x) => x.n > 0);
    const groups = {};
    for (const x of scenes) { const k = (x.lugar || 'Sin lugar') + '|' + (x.persona.join(', ') || 'Sin persona'); (groups[k] = groups[k] || []).push(x); }
    const done = new Set(sc.shot || []);
    const total = scenes.reduce((a, x) => a + x.tomas, 0);
    body.innerHTML = scenes.length ? `<p class="muted" style="margin:0;font-size:13px">${scenes.length} escenas · ${total} tomas · ${Object.keys(groups).length} montaje${Object.keys(groups).length > 1 ? 's' : ''} (lugar + persona). Graba en este orden y marca cada escena.</p>
      ${Object.entries(groups).map(([k, xs], gi) => { const [lugar, persona] = k.split('|'); return `<div class="card og"><b>${gi + 1}. 📍 ${esc(lugar)} · 👤 ${esc(persona)}</b>
        ${xs.map((x) => `<div class="list-item" style="cursor:default"><button class="check" data-shot="${x.id}" aria-pressed="${done.has(x.id)}" aria-label="Grabada">✓</button><div class="li-main"><div class="li-title">Esc ${x.n} · ${esc(x.title)}</div><div class="li-sub" style="white-space:normal">${x.tomas} toma${x.tomas > 1 ? 's' : ''}${x.planos.length ? ' · ' + esc(x.planos.join(', ')) : ''}${x.cortes.length ? ' · ✂️ ' + esc(x.cortes.join(' · ')) : ''}</div></div></div>`).join('')}</div>`; }).join('')}
      <div class="bar"><i style="width:${scenes.length ? (scenes.filter((x) => done.has(x.id)).length / scenes.length) * 100 : 0}%"></i></div>
      <div class="row end"><button type="button" class="btn btn-cancel ghost sm" data-a="reset">↺ Empezar de nuevo</button><button type="button" class="btn btn-edit ghost sm" data-a="copy">📋 Copiar lista</button></div>`
      : '<div class="empty"><b>Este guion no tiene escenas</b>Agrega bloques 🎬 Escena con 📍 Lugar y 👤 Persona para armar el orden.</div>';
  };
  paint();
  body.onclick = (e) => {
    const b = e.target.closest('[data-shot]'); if (b) { const d = new Set(sc.shot || []); d.has(b.dataset.shot) ? d.delete(b.dataset.shot) : d.add(b.dataset.shot); store.update('scripts', sc.id, { shot: [...d] }); navigator.vibrate?.(8); paint(); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'reset') { store.update('scripts', sc.id, { shot: [] }); paint(); }
    if (a === 'copy') { const sc2 = scenesOf(sc).filter((x) => x.n > 0); copyTxt(`ORDEN DE GRABACIÓN · ${sc.title}\n` + sc2.map((x) => `Esc ${x.n} (${x.tomas} tomas) · ${x.lugar || '-'} · ${x.persona.join(', ') || '-'} · ${x.title}`).join('\n')); }
  };
}

// ---------- Idea rápida (texto o voz) ----------
export function quickIdea() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const body = h(`<form class="form"><div class="field"><textarea id="qi" rows="3" placeholder="Reel: antes y después del PC sucio de un cliente…"></textarea></div>
    <div class="picks">${['NEXO PC', 'Agencia', 'Cliente', 'Personal'].map((x, i) => `<button type="button" class="pick ${i === 0 ? 'on' : ''}" data-for="${x}">${x}</button>`).join('')}</div>
    <div class="row end">${SR ? '<button type="button" class="btn btn-ai ghost" data-a="mic">🎙 Dictar</button>' : ''}<button class="btn btn-create">💡 Guardar idea</button></div></form>`);
  const s = sheet('💡 Idea rápida', body);
  let forV = 'NEXO PC', rec = null;
  body.addEventListener('click', (e) => {
    const f = e.target.closest('[data-for]'); if (f) { forV = f.dataset.for; body.querySelectorAll('[data-for]').forEach((x) => x.classList.toggle('on', x === f)); return; }
    if (e.target.closest('[data-a=mic]')) {
      const btn = e.target.closest('[data-a=mic]');
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'es-CO'; rec.interimResults = true; const ta = body.querySelector('#qi'); const base = ta.value ? ta.value + ' ' : '';
      rec.onresult = (ev) => { ta.value = base + Array.from(ev.results).map((r) => r[0].transcript).join(' '); };
      rec.onend = () => { rec = null; btn.textContent = '🎙 Dictar'; };
      rec.onerror = () => { rec = null; btn.textContent = '🎙 Dictar'; toast('No pude escuchar: revisa el permiso del micrófono'); };
      btn.textContent = '■ Parar'; rec.start();
    }
  });
  body.addEventListener('submit', (e) => { e.preventDefault(); const v = body.querySelector('#qi').value.trim(); if (!v) return toast('Escribe o dicta la idea');
    rec?.stop(); store.add('ideas', { title: v.length > 90 ? v.slice(0, 90) + '…' : v, hook: v.length > 90 ? v : '', for: forV }); toast('💡 Idea guardada'); s.close(); });
  setTimeout(() => body.querySelector('#qi').focus(), 320);
}

// ---------- Planes de contenido mensuales (los aprueba el cliente) ----------
const KINDS = ['Reel', 'Post', 'Historia', 'Carrusel', 'Video'];
const IST = { borrador: ['📝', 'Borrador', ''], enviado: ['📤', 'Enviado', 's-pending'], aprobado: ['✅', 'Aprobado', 's-create'], cambios: ['✏️', 'Pide cambios', 's-delete'] };
let cpClient = null, cpMonth = fmt.today().slice(0, 7);
const monthName = (m) => new Date(m + '-15T12:00').toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
const shiftMonth = (m, n) => { const d = new Date(m + '-15T12:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7); };
function planFor(client, month, create = false) {
  let p = store.list('contentPlans').find((x) => x.client === client && x.month === month);
  if (!p && create) p = store.add('contentPlans', { client, month, items: [] });
  return p;
}
export const contenido = { id: 'contenido', title: 'Plan de contenido', icon: '🗂',
  render(el) {
    const cs = store.list('clients');
    if (!cs.length) { el.innerHTML = '<div class="empty"><b>Primero agrega un cliente</b>Los clientes se crean en NEXO Negocios (🤝 Clientes) y aparecen aquí solos.</div>'; return; }
    if (!cpClient || !store.get('clients', cpClient)) cpClient = cs[0].id;
    const p = planFor(cpClient, cpMonth);
    const items = (p?.items || []).slice().sort((a, b) => a.week - b.week);
    const cnt = (k) => items.filter((i) => (i.status || 'borrador') === k).length;
    el.innerHTML = `<div class="picks">${cs.map((c) => `<button type="button" class="pick ${c.id === cpClient ? 'on' : ''}" data-c="${c.id}">${esc(c.name)}</button>`).join('')}</div>
      <div class="daynav" style="margin:12px 0"><button class="btn btn-cancel ghost sm" data-m="-1" aria-label="Mes anterior">‹</button><b style="text-transform:capitalize">${monthName(cpMonth)}</b><button class="btn btn-cancel ghost sm" data-m="1" aria-label="Mes siguiente">›</button></div>
      ${items.length ? `<div class="row" style="gap:6px;margin-bottom:10px">${Object.entries(IST).map(([k, [ic, lb, cl]]) => cnt(k) ? `<span class="chip ${cl}">${ic} ${cnt(k)} ${lb.toLowerCase()}</span>` : '').join('')}</div>` : ''}
      ${[1, 2, 3, 4, 5].map((w) => { const xs = items.filter((i) => i.week === w); if (!xs.length && w === 5) return ''; return `<div class="section"><h2>Semana ${w}</h2>${xs.map((i) => { const [ic, lb, cl] = IST[i.status || 'borrador']; return `<div class="list-item" data-it="${i.id}"><span class="chip">${esc(i.kind || 'Reel')}</span><div class="li-main"><div class="li-title">${esc(i.title)}</div>${i.comment ? `<div class="li-sub">💬 ${esc(i.comment)}</div>` : ''}</div><span class="chip ${cl}">${ic} ${lb}</span></div>`; }).join('')}
        <button class="linkish" data-addw="${w}">＋ Contenido en la semana ${w}</button></div>`; }).join('')}
      <div class="row section">${cnt('borrador') ? `<button class="btn btn-pending" data-a="send">📤 Enviar ${cnt('borrador')} para aprobar</button>` : ''}${cnt('enviado') ? `<button class="btn btn-create ghost" data-a="okall">✓ El cliente aprobó todo lo enviado</button>` : ''}</div>
      <p class="muted" style="font-size:12px">Se envía por WhatsApp como lista numerada; el cliente responde "OK" o qué cambiar, y tú marcas cada uno. (Un enlace para que el cliente apruebe solo queda para la V2.)</p>`;
    el.onclick = async (e) => {
      const g = (s) => e.target.closest(s); let b;
      if ((b = g('[data-c]'))) { cpClient = b.dataset.c; this.render(el); return; }
      if ((b = g('[data-m]'))) { cpMonth = shiftMonth(cpMonth, +b.dataset.m); this.render(el); return; }
      if ((b = g('[data-addw]'))) return itemSheet(cpClient, cpMonth, null, +b.dataset.addw);
      if ((b = g('[data-it]'))) return itemSheet(cpClient, cpMonth, items.find((i) => i.id === b.dataset.it));
      const a = g('[data-a]')?.dataset.a;
      if (a === 'send') {
        const pend = items.filter((i) => (i.status || 'borrador') === 'borrador');
        const txt = `Hola ${cname(cpClient)} 👋 Este es el plan de contenido de ${monthName(cpMonth)}:\n\n${pend.map((i, n) => `${n + 1}. Semana ${i.week} · ${i.kind || 'Reel'}: ${i.title}`).join('\n')}\n\nResponde *OK* para aprobar todo, o dime el número y qué cambio. 🙌\n— Cristóbal`;
        if (await copyTxt(txt, { wa: true })) { const p2 = planFor(cpClient, cpMonth); store.update('contentPlans', p2.id, { items: p2.items.map((i) => ((i.status || 'borrador') === 'borrador' ? { ...i, status: 'enviado', sentAt: fmt.today() } : i)) }); }
      }
      if (a === 'okall') { const p2 = planFor(cpClient, cpMonth); store.update('contentPlans', p2.id, { items: p2.items.map((i) => (i.status === 'enviado' ? { ...i, status: 'aprobado' } : i)) }); toast('✅ Aprobado'); }
    };
  } };
function itemSheet(client, month, it, week = 1) {
  const body = h(`<form class="form"><div class="field"><label for="ct">Contenido</label><input id="ct" value="${esc(it?.title || '')}" placeholder="Reel: corte fade en 15 segundos"></div>
    <div class="field"><label>Tipo</label><div class="picks" data-g="k">${KINDS.map((k) => `<button type="button" class="pick ${(it?.kind || 'Reel') === k ? 'on' : ''}" data-v="${k}">${k}</button>`).join('')}</div></div>
    <div class="field"><label>Semana</label><div class="seg" data-g="w">${[1, 2, 3, 4, 5].map((w) => `<button type="button" data-v="${w}" aria-pressed="${(it?.week || week) === w}">${w}</button>`).join('')}</div></div>
    ${it ? `<div class="field"><label>Estado</label><div class="seg" data-g="s">${Object.entries(IST).map(([k, [ic, lb]]) => `<button type="button" data-v="${k}" aria-pressed="${(it.status || 'borrador') === k}">${ic} ${lb}</button>`).join('')}</div></div>
    <div class="field"><label for="cc">Comentario del cliente</label><input id="cc" value="${esc(it.comment || '')}" placeholder="Que salga el logo al final"></div>` : ''}
    <div class="row end">${it ? '<button type="button" class="btn btn-delete ghost" data-a="del">🗑</button><button type="button" class="btn btn-pending ghost" data-a="video">→ Al tablero</button>' : ''}<button class="btn ${it ? 'btn-edit' : 'btn-create'}">${it ? '✓ Guardar' : '＋ Agregar'}</button></div></form>`);
  const s = sheet(it ? 'Contenido' : 'Nuevo contenido · semana ' + week, body);
  body.addEventListener('click', (e) => {
    const p = e.target.closest('[data-g] [data-v]');
    if (p) { const g = p.closest('[data-g]'); g.querySelectorAll('[data-v]').forEach((x) => { x.classList.toggle('on', x === p); if (x.hasAttribute('aria-pressed')) x.setAttribute('aria-pressed', x === p); }); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    const pl = planFor(client, month);
    if (a === 'del') { store.update('contentPlans', pl.id, { items: pl.items.filter((i) => i.id !== it.id) }); toast('Quitado'); s.close(); }
    if (a === 'video') { store.add('videos', { title: it.title, client, status: 'idea', platform: it.kind === 'Reel' ? 'Instagram Reels' : '' }); toast('🎞 Pasó al tablero de videos'); s.close(); }
  });
  body.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = body.querySelector('#ct').value.trim(); if (!title) return toast('Escribe el contenido');
    const pick = (g) => body.querySelector(`[data-g=${g}] .on, [data-g=${g}] [aria-pressed=true]`)?.dataset.v;
    const data = { title, kind: pick('k') || 'Reel', week: Number(pick('w')) || week };
    if (it) { data.status = pick('s') || it.status || 'borrador'; data.comment = body.querySelector('#cc').value.trim(); }
    const pl = planFor(client, month, true);
    store.update('contentPlans', pl.id, { items: it ? pl.items.map((i) => (i.id === it.id ? { ...i, ...data } : i)) : [...(pl.items || []), { id: store.uid(), status: 'borrador', ...data }] });
    toast(it ? 'Guardado' : '＋ Agregado'); s.close();
  });
  if (!it) setTimeout(() => body.querySelector('#ct').focus(), 320);
}

// ---------- Biblioteca reutilizable (clips, ideas, guiones, referencias) ----------
let libTab = 'todo', libQ = '';
export function biblioteca(clipsMod, ideasMod, refsMod) {
  return { id: 'biblioteca', title: 'Biblioteca', icon: '📚',
    render(el) {
      const rows = [
        ...store.list('clips').map((r) => ({ t: 'clips', ic: '🎞', r, title: r.title, sub: [r.tags, cname(r.client), r.link].filter(Boolean).join(' · ') })),
        ...store.list('ideas').map((r) => ({ t: 'ideas', ic: '💡', r, title: r.title, sub: [r.for, cname(r.client)].filter(Boolean).join(' · ') })),
        ...store.list('scripts').map((r) => ({ t: 'scripts', ic: '📄', r, title: r.title, sub: [cname(r.client), `${(r.blocks || []).filter((b) => b.type === 'escena').length} escenas`].filter(Boolean).join(' · ') })),
        ...store.list('references').map((r) => ({ t: 'references', ic: '📌', r, title: r.title, sub: r.note || r.link || '' })),
      ].filter((x) => (libTab === 'todo' || x.t === libTab) && (!libQ || (x.title + ' ' + x.sub).toLowerCase().includes(libQ.toLowerCase())))
        .sort((a, b) => (b.r.updatedAt || '').localeCompare(a.r.updatedAt || ''));
      el.innerHTML = `<input class="libq" type="search" placeholder="🔎 Buscar en todo (cliente, etiqueta, idea…)" value="${esc(libQ)}">
        <div class="tabs" style="margin-top:10px">${[['todo', 'Todo'], ['clips', '🎞 Clips'], ['ideas', '💡 Ideas'], ['scripts', '📄 Guiones'], ['references', '📌 Referencias']].map(([k, l]) => `<button data-t="${k}" aria-pressed="${libTab === k}">${l}</button>`).join('')}</div>
        <div class="row" style="margin-bottom:10px"><button class="btn btn-create ghost sm" data-a="clip">＋ Clip</button><button class="btn btn-create ghost sm" data-a="idea">＋ Idea</button><button class="btn btn-create ghost sm" data-a="ref">＋ Referencia</button></div>
        <div class="list">${rows.slice(0, 120).map((x) => `<div class="list-item" data-t="${x.t}" data-id="${x.r.id}"><span style="font-size:20px">${x.ic}</span><div class="li-main"><div class="li-title">${esc(x.title)}</div><div class="li-sub">${esc(x.sub)}</div></div>
          ${x.t === 'scripts' ? `<button class="btn btn-edit ghost sm" data-reuse="${x.r.id}" title="Usar para otro cliente">⧉ Reusar</button>` : x.t === 'ideas' ? `<button class="btn btn-create ghost sm" data-promote="${x.r.id}">→ Video</button>` : ''}</div>`).join('') || `<div class="empty"><b>${libQ ? 'Nada con "' + esc(libQ) + '"' : 'Biblioteca vacía'}</b>Guarda aquí clips, ideas, guiones y referencias para reusarlos con cualquier cliente.</div>`}</div>`;
      const q = el.querySelector('.libq');
      q.oninput = () => { libQ = q.value; const pos = q.selectionStart; this.render(el); const n = el.querySelector('.libq'); n.focus(); n.setSelectionRange(pos, pos); };
      el.onclick = (e) => {
        const g = (s) => e.target.closest(s); let b;
        if ((b = g('[data-t]')) && b.closest('.tabs')) { libTab = b.dataset.t; this.render(el); return; }
        if ((b = g('[data-reuse]'))) { e.stopPropagation(); const sc = store.get('scripts', b.dataset.reuse); const n = store.add('scripts', { ...sc, id: undefined, title: sc.title + ' (copia)', client: '', shot: [], blocks: (sc.blocks || []).map((x) => ({ ...x, id: store.uid() })) }); toast('⧉ Copia creada: cámbiale el cliente'); scriptEditor(n); return; }
        if ((b = g('[data-promote]'))) { e.stopPropagation(); const i = store.get('ideas', b.dataset.promote); store.add('videos', { title: i.title, client: i.client || '', platform: i.platform || '', status: 'idea' }); toast('🎞 Pasó al tablero (la idea se queda en la biblioteca)'); return; }
        const a = g('[data-a]')?.dataset.a;
        if (a === 'clip') return openForm(clipsMod);
        if (a === 'idea') return quickIdea();
        if (a === 'ref') return openForm(refsMod);
        if ((b = g('.list-item[data-id]'))) { const t = b.dataset.t, r = store.get(t, b.dataset.id); if (t === 'scripts') return scriptEditor(r); return openForm(t === 'clips' ? clipsMod : t === 'ideas' ? ideasMod : refsMod, r); }
      };
    } };
}
