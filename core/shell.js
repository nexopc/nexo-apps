// Shell común de todas las apps NEXO: barra superior, navegación (adaptada por SO),
// formularios con botones de color, botón Actualizar por app, bloqueo y Harvey integrado.
import { applyPlatform, OS, isDesktopLike, haptic, setOSOverride } from './platform.js';
import { store, prefs, fmt } from './store.js';
import { security, lockScreen } from './security.js';
import { LOGOS, appById } from './registry.js';
import { cloud } from './sync.js';
import { timer, clock } from './timer.js';
import { notes, FOLDERS, LINKABLE, linkLabel } from './notes.js';
import './automations.js';

export { store, prefs, fmt, OS };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

let ctx = null;

// ---------- Utilidades de UI ----------
export function toast(msg) {
  let t = $('.toast');
  if (!t) { t = h('<div class="toast" role="status"></div>'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

const openSheets = [];
let ignorePop = 0; // cuántos popstate provocamos nosotros mismos (para no cerrar/navegar de más)
const selfBack = () => { ignorePop++; history.back(); };
export function sheet(title, bodyEl, { onClose } = {}) {
  const scrim = h('<div class="scrim"></div>');
  // ✕ siempre visible + barra para deslizar hacia abajo: nunca quedas atrapado en una ventana
  const el = h(`<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sheet-head"><div class="grab"></div><h2>${esc(title)}</h2><button type="button" class="sheet-x" aria-label="Cerrar">✕</button></div></div>`);
  el.appendChild(bodyEl);
  document.body.append(scrim, el);
  requestAnimationFrame(() => { scrim.classList.add('open'); el.classList.add('open'); });
  const close = (fromPop = false) => {
    el.classList.remove('open'); scrim.classList.remove('open');
    setTimeout(() => { el.remove(); scrim.remove(); }, 280);
    const i = openSheets.indexOf(api); if (i >= 0) openSheets.splice(i, 1);
    if (!fromPop && history.state?.sheet) selfBack();
    onClose?.();
  };
  const api = { el, close };
  openSheets.push(api);
  history.pushState({ ...(history.state || {}), sheet: true }, ''); // el botón atrás de Android (y el gesto en iOS) cierra la hoja
  scrim.addEventListener('click', () => close());
  el.querySelector('.sheet-x').addEventListener('click', () => close());
  // deslizar hacia abajo desde la cabecera cierra
  const head = el.querySelector('.sheet-head'); let y0 = null;
  head.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  head.addEventListener('touchmove', (e) => { if (y0 == null) return; const d = e.touches[0].clientY - y0; if (d > 0) el.style.transform = `translateY(${d}px)`; }, { passive: true });
  head.addEventListener('touchend', (e) => { if (y0 == null) return; const d = e.changedTouches[0].clientY - y0; el.style.transform = ''; y0 = null; if (d > 90) close(); }, { passive: true });
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  setTimeout(() => bodyEl.querySelector('input,select,textarea,button')?.focus({ preventScroll: true }), 300);
  return api;
}
let onNavPop = null;
addEventListener('popstate', () => {
  if (ignorePop > 0) { ignorePop--; return; }
  const s = openSheets[openSheets.length - 1];
  if (s) { s.close(true); return; }
  onNavPop?.(history.state?.nav || 'home');
});
// Atrás universal: cierra la ventana abierta → vuelve a Inicio → vuelve al Hub. No depende del historial del navegador
// (en iPhone instalado no hay botón atrás del sistema, por eso antes a veces no hacía nada).
let navBack = null;
export function goBack() {
  const s = openSheets[openSheets.length - 1];
  if (s) { s.close(); return; }
  if (navBack?.()) return;
  location.href = '../../index.html';
}
window.NEXO_BACK = goBack;

export function confirmSheet(title, text, { yes = 'Sí', no = 'No', danger = false } = {}) {
  return new Promise((res) => {
    const body = h(`<div class="form"><p style="margin:0">${esc(text)}</p><div class="row end">
      <button class="btn btn-cancel" data-a="no">${esc(no)}</button><button class="btn ${danger ? 'btn-delete' : 'btn-create'}" data-a="yes">${esc(yes)}</button></div></div>`);
    let done = false;
    const s = sheet(title, body, { onClose: () => !done && res(false) });
    body.addEventListener('click', (e) => { const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return; done = true; res(a === 'yes'); s.close(); });
  });
}

// ---------- Formularios genéricos ----------
function fieldHTML(f, v) {
  const id = 'f-' + f.k;
  const val = v ?? f.default ?? '';
  const L = `<label for="${id}">${esc(f.label)}</label>`;
  switch (f.type) {
    case 'textarea': return `<div class="field">${L}<textarea id="${id}" name="${f.k}" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea></div>`;
    case 'select': return `<div class="field">${L}<select id="${id}" name="${f.k}">${(f.options || []).map((o) => { const [k, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(k)}" ${String(k) === String(val) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></div>`;
    case 'ref': {
      const opts = store.list(f.ref);
      return `<div class="field">${L}<select id="${id}" name="${f.k}"><option value="">—</option>${opts.map((o) => `<option value="${o.id}" ${o.id === val ? 'selected' : ''}>${esc(o[f.refLabel || 'name'] || o.title || o.id)}</option>`).join('')}</select></div>`;
    }
    case 'check': return `<div class="field"><label style="display:flex;gap:10px;align-items:center;color:var(--fg)"><input type="checkbox" id="${id}" name="${f.k}" ${val ? 'checked' : ''} style="width:22px;height:22px;min-height:0"> ${esc(f.label)}</label></div>`;
    case 'money': return `<div class="field">${L}<input id="${id}" name="${f.k}" type="number" inputmode="numeric" step="100" min="0" value="${esc(val)}" placeholder="$"></div>`;
    case 'number': return `<div class="field">${L}<input id="${id}" name="${f.k}" type="number" inputmode="decimal" step="${f.step || 'any'}" value="${esc(val)}"></div>`;
    case 'date': return `<div class="field">${L}<input id="${id}" name="${f.k}" type="date" value="${esc(val || (f.today ? fmt.today() : ''))}"></div>`;
    case 'time': return `<div class="field">${L}<input id="${id}" name="${f.k}" type="time" value="${esc(val)}"></div>`;
    case 'days': { const sel = Array.isArray(val) ? val : []; return `<div class="field"><label>${esc(f.label.replace(/ \(.*\)$/, ''))}</label><div class="seg days" data-days="${f.k}">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => `<button type="button" data-d="${i}" aria-pressed="${sel.includes(i)}" aria-label="${['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'][i]}">${d}</button>`).join('')}</div></div>`; }
    case 'scale': { const v0 = Number(val) || 3; return `<div class="field"><label>${esc(f.label)}</label><div class="seg scale" data-scale="${f.k}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-n="${n}" aria-pressed="${n === v0}">${n}</button>`).join('')}</div></div>`; }
    case 'color': return `<div class="field">${L}<input id="${id}" name="${f.k}" type="color" value="${esc(val || '#2D7CFF')}"></div>`;
    default: return `<div class="field">${L}<input id="${id}" name="${f.k}" type="${f.type === 'url' ? 'url' : 'text'}" value="${esc(val)}" placeholder="${esc(f.ph || '')}"></div>`;
  }
}
function readForm(form, fields) {
  const out = {};
  for (const f of fields) {
    if (f.type === 'days') { const g = form.querySelector(`[data-days="${f.k}"]`); if (g) out[f.k] = [...g.querySelectorAll('[aria-pressed=true]')].map((b) => Number(b.dataset.d)); continue; }
    if (f.type === 'scale') { const g = form.querySelector(`[data-scale="${f.k}"] [aria-pressed=true]`); if (g) out[f.k] = Number(g.dataset.n); continue; }
    const el = form.elements[f.k]; if (!el) continue;
    if (f.type === 'check') out[f.k] = el.checked;
    else if (f.type === 'number' || f.type === 'money') out[f.k] = el.value === '' ? null : Number(el.value);
    else out[f.k] = el.value.trim();
  }
  return out;
}

export function openForm(mod, rec = null, preset = {}) {
  const fields = mod.fields || [];
  const form = h(`<form class="form" novalidate>${fields.map((f) => fieldHTML(f, rec ? rec[f.k] : preset[f.k])).join('')}
    <div class="row end" style="margin-top:6px">
      ${rec ? '<button type="button" class="btn btn-delete ghost" data-a="del">🗑 Borrar</button>' : ''}
      <button type="button" class="btn btn-cancel" data-a="cancel">Cancelar</button>
      <button type="submit" class="btn ${rec ? 'btn-edit' : 'btn-create'}">${rec ? '✓ Guardar cambios' : '＋ Guardar'}</button>
    </div></form>`);
  const s = sheet((rec ? 'Editar · ' : 'Nuevo · ') + (mod.single || mod.title), form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = { ...preset, ...readForm(form, fields) };
    const req = fields.find((f) => f.required && (data[f.k] === '' || data[f.k] == null || (Array.isArray(data[f.k]) && !data[f.k].length)));
    if (req) { toast(`Falta: ${req.label}`); form.elements[req.k]?.focus(); return; }
    if (mod.validate) { const err = mod.validate(data, rec); if (err) { toast(err); return; } }
    const saved = rec ? store.update(mod.collection, rec.id, data) : store.add(mod.collection, data);
    haptic(); toast(rec ? 'Cambios guardados' : 'Guardado'); s.close();
    mod.afterSave?.(saved, !rec);
  });
  form.addEventListener('click', async (e) => {
    const dd = e.target.closest('[data-days] button'); if (dd) { dd.setAttribute('aria-pressed', dd.getAttribute('aria-pressed') !== 'true'); return; }
    const sc = e.target.closest('[data-scale] button'); if (sc) { sc.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b === sc)); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'cancel') s.close();
    if (a === 'del' && await confirmSheet('¿Borrar?', 'Esto se borra en todas tus apps y dispositivos.', { yes: 'Borrar', danger: true })) {
      store.remove(mod.collection, rec.id); toast('Borrado'); s.close();
    }
  });
  return s;
}

// Lista genérica de un módulo
export function renderList(el, mod) {
  let items = store.list(mod.collection);
  if (mod.filter) items = items.filter(mod.filter);
  items.sort(mod.sort || ((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
  if (!items.length) {
    el.innerHTML = `<div class="empty"><b>${esc(mod.emptyTitle || 'Aún no hay nada aquí')}</b>${esc(mod.emptyText || 'Toca ＋ para agregar el primero, o pídeselo a Harvey.')}</div>`;
    return;
  }
  el.innerHTML = `<div class="list">${items.map((r) => `
    <div class="list-item" data-id="${r.id}" tabindex="0">
      ${mod.checkField ? `<button class="check" data-check="${r.id}" aria-pressed="${!!r[mod.checkField]}" aria-label="Marcar">✓</button>` : ''}
      ${mod.itemIcon && !mod.checkField ? `<span style="font-size:20px">${mod.itemIcon(r)}</span>` : ''}
      <div class="li-main"><div class="li-title" ${mod.checkField && r[mod.checkField] ? 'style="text-decoration:line-through;opacity:.6"' : ''}>${esc(mod.titleOf ? mod.titleOf(r) : r.title || r.name)}</div>
      <div class="li-sub">${mod.subOf ? mod.subOf(r) : ''}</div></div>
      <div class="li-side">${mod.sideOf ? mod.sideOf(r) : ''}</div>
    </div>`).join('')}</div>`;
  el.onclick = (e) => {
    const c = e.target.closest('[data-check]');
    if (c) { const r = store.get(mod.collection, c.dataset.check); store.update(mod.collection, r.id, { [mod.checkField]: !r[mod.checkField], doneAt: !r[mod.checkField] ? new Date().toISOString() : null }); haptic(); mod.onCheck?.(r, !r[mod.checkField]); return; }
    const it = e.target.closest('.list-item'); if (it) { const r = store.get(mod.collection, it.dataset.id); mod.onOpen ? mod.onOpen(r) : openForm(mod, r); }
  };
  el.onkeydown = (e) => { if (e.key === 'Enter' && e.target.classList.contains('list-item')) e.target.click(); };
}

// ---------- Actualizaciones independientes por app ----------
async function checkUpdate(appId, installed) {
  try {
    const r = await fetch('version.json', { cache: 'no-store' });
    const v = await r.json();
    return { latest: v.version, notes: v.notes || '', has: v.version !== installed };
  } catch { return { latest: installed, has: false, offline: true }; }
}
async function doUpdate(appId, latest) {
  const reg = await navigator.serviceWorker?.getRegistration();
  reg?.active?.postMessage({ type: 'purge', scope: appId });
  // borra solo la caché de ESTA app → las demás apps y Harvey no se tocan
  // borra la caché de ESTA app y la del núcleo compartido (se vuelve a bajar sola); tus datos no se tocan
  if (window.caches) for (const k of await caches.keys()) if (k === 'nexo-app-' + appId || k === 'nexo-core') await caches.delete(k);
  prefs.set('ver:' + appId, latest);
  location.reload();
}

// ---------- Ajustes ----------
export function openSettings() { return settings(); }
function settings() {
  const user = cloud.user();
  const body = h(`<div class="form">
    <div class="card"><h3>☁️ Cuenta y respaldo</h3>
      <p class="muted" style="margin:0 0 10px">${user ? `Conectado como <b>${esc(user.email)}</b>. Tus datos se sincronizan en todos tus dispositivos y Claude los puede leer.` : 'Entra con Google para tener tus datos en todos tus dispositivos. Mientras tanto se guardan aquí y se suben al entrar.'}</p>
      <div class="row">${cloud.available() ? (user ? '<button class="btn btn-cancel sm" data-a="out">Cerrar sesión</button>' : '<button class="btn btn-create sm" data-a="google">G  Entrar con Google</button>') : ''}
      <button class="btn btn-edit ghost sm" data-a="export">⬇ Exportar copia</button><button class="btn btn-edit ghost sm" data-a="import">⬆ Importar copia</button></div></div>
    <div class="card"><h3>🔒 Seguridad</h3>
      <div class="row">${security.hasPin() ? '<button class="btn btn-delete ghost sm" data-a="nopin">Quitar PIN</button><button class="btn btn-cancel sm" data-a="lock">Bloquear ahora</button>' : '<button class="btn btn-create sm" data-a="pin">Poner PIN de 4 dígitos</button>'}
      <button class="btn btn-edit ghost sm" data-a="bio" ${security.hasPin() ? '' : 'disabled'}>☝️ Face ID / huella</button></div></div>
    <div class="card"><h3>🎨 Apariencia</h3>
      <div class="field"><label>Tema</label><div class="seg" data-g="theme">${[['dark', 'Oscuro'], ['light', 'Claro']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${(prefs.get('theme', 'dark')) === k}">${l}</button>`).join('')}</div></div>
      <div class="field"><label>Diseño del sistema (detectado: ${OS})</label><div class="seg" data-g="os">${[['', 'Auto'], ['ios', 'iOS'], ['android', 'Android'], ['windows', 'Windows']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${(localStorage.getItem('nexo:os-override') || '') === k}">${l}</button>`).join('')}</div></div></div>
    <p class="muted" style="font-size:12px;margin:0">${esc(ctx?.app.name || 'NEXO Hub')} ${ctx ? 'v' + esc(ctx.version) : ''} · núcleo NEXO</p>
  </div>`);
  const s = sheet('Ajustes', body);
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const g = b.closest('[data-g]')?.dataset.g;
    if (g === 'theme') { prefs.set('theme', b.dataset.v); applyTheme(); s.close(); return; }
    if (g === 'os') { setOSOverride(b.dataset.v); return; }
    const a = b.dataset.a;
    try {
      if (a === 'google') await cloud.signIn();
      if (a === 'out') await cloud.signOut();
      if (a === 'export') { const blob = new Blob([JSON.stringify(store.exportAll(), null, 1)], { type: 'application/json' }); const u = URL.createObjectURL(blob); const l = h(`<a download="nexo-copia-${fmt.today()}.json" href="${u}"></a>`); document.body.appendChild(l); l.click(); l.remove(); }
      if (a === 'import') { const i = h('<input type="file" accept="application/json">'); i.onchange = async () => { store.importAll(JSON.parse(await i.files[0].text())); toast('Copia importada'); }; i.click(); }
      if (a === 'pin') { const p = await askPin('Nuevo PIN'); if (p) { await security.setPin(p); security.markUnlocked(); toast('PIN activado'); s.close(); } }
      if (a === 'nopin' && await confirmSheet('Quitar PIN', '¿Quitar el bloqueo de todas las apps NEXO en este dispositivo?', { yes: 'Quitar', danger: true })) { security.clearPin(); toast('PIN quitado'); s.close(); }
      if (a === 'lock') security.lockNow();
      if (a === 'bio') { if (!(await security.bioSupported())) return toast('Este dispositivo no tiene Face ID / huella disponible aquí'); await security.enrollBio(); toast('Face ID / huella activado'); }
    } catch (err) { toast(err.message || 'No se pudo completar'); }
  });
}
function askPin(title) {
  return new Promise((res) => {
    const body = h(`<form class="form"><div class="field"><label for="np">4 dígitos</label><input id="np" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off"></div>
      <div class="row end"><button type="button" class="btn btn-cancel" data-a="c">Cancelar</button><button class="btn btn-create">Guardar PIN</button></div></form>`);
    const s = sheet(title, body, { onClose: () => res(null) });
    body.addEventListener('submit', (e) => { e.preventDefault(); const v = body.np.value; if (!/^\d{4}$/.test(v)) return toast('Deben ser 4 números'); res(v); s.close(); });
    body.querySelector('[data-a=c]').onclick = () => s.close();
  });
}
function applyTheme() { document.documentElement.dataset.theme = prefs.get('theme', 'dark'); }

// ---------- Arranque de una app ----------
export async function boot({ appId, version, modules, home, staticHome = false, quick = [] }) {
  const app = appById(appId);
  ctx = { app, version, modules, home };
  applyPlatform(); applyTheme();
  document.documentElement.style.setProperty('--accent', app.accent);
  document.title = app.name;
  if (!prefs.get('ver:' + appId)) prefs.set('ver:' + appId, version);
  await lockScreen({ title: app.name, logo: LOGOS[app.id] || LOGOS.custom });
  if (cloud.available()) cloud.init().catch(() => {});

  const navMods = [{ id: 'home', title: 'Inicio', icon: '⌂' }, ...modules];
  const root = h(`<div class="shell">
    <header class="topbar">
      <button class="back-btn" data-a="back" aria-label="Atrás">‹ <span>Atrás</span></button>
      <a class="brand" href="../../index.html" title="Volver al Hub NEXO"><span class="logo">${LOGOS[app.id] || LOGOS.custom}</span><span><b>${esc(app.name)}</b><small>${esc(app.tagline)}</small></span></a>
      <div class="top-actions">
        <button class="icon-btn ios-add" data-a="add" aria-label="Agregar" style="color:var(--c-create);font-size:22px">＋</button>
        <button class="icon-btn sync-dot" data-a="settings" aria-label="Estado de sincronización" title="Sincronización"><i></i></button>
        <button class="icon-btn" data-a="update" aria-label="Actualizar esta app" title="Actualizar ${esc(app.name)}">⟳<span class="badge" hidden></span></button>
        <button class="icon-btn" data-a="settings" aria-label="Ajustes">⚙︎</button>
      </div>
    </header>
    <nav class="sidebar" aria-label="Secciones">${navMods.map((m, i) => `<button class="nav-item" data-nav="${m.id}"><span class="ico">${m.icon}</span>${esc(m.title)}${i < 9 ? `<span class="kbd">${i + 1}</span>` : ''}</button>`).join('')}
      <div style="flex:1"></div><button class="nav-item" data-a="harvey"><span class="ico">🟣</span>Preguntar a Harvey<span class="kbd">Ctrl K</span></button></nav>
    <main class="main" id="view"></main>
    <nav class="bottomnav" aria-label="Secciones">${navMods.slice(0, 4).map((m) => `<button class="nav-item" data-nav="${m.id}"><span class="ico">${m.icon}</span>${esc(m.title)}</button>`).join('')}
      ${navMods.length > 4 ? '<button class="nav-item" data-a="more"><span class="ico">⋯</span>Más</button>' : ''}</nav>
  </div>`);
  document.body.appendChild(root);
  const fab = h('<button class="fab" aria-label="Agregar" title="Agregar (N)">＋</button>');
  const dock = h(`<button class="harvey-dock" aria-label="Preguntar a Harvey"><span class="av">H</span>Harvey</button>`);
  if (appId !== 'harvey') document.body.append(fab, dock);
  const notesBtn = h('<button class="notes-fab" aria-label="Notas" title="Notas (Alt+N)">📝</button>');
  const bubble = h('<button class="timer-bubble" hidden aria-label="Cronómetro"><span class="tb-dot"></span><b class="tb-t">0:00</b><span class="tb-l"></span></button>');
  if (appId === 'harvey') { notesBtn.className = 'icon-btn'; root.querySelector('.top-actions').prepend(notesBtn); } // en el chat no tapa los botones Sí / No
  else document.body.append(notesBtn);
  root.querySelector('.top-actions').prepend(bubble);
  notesBtn.onclick = () => openNotes();
  bubble.onclick = () => openTimer();
  mountTimerBubble(bubble);

  const view = $('#view');
  let current = null;
  const go = (id, push = true) => {
    const prev = current;
    current = navMods.find((m) => m.id === id) || navMods[0];
    if (push && prev && prev.id !== current.id) {
      // Inicio es la base; cada sección queda UNA posición encima → atrás siempre vuelve a Inicio
      if (current.id === 'home') { if (history.state?.nav) selfBack(); }
      else if (history.state?.nav) history.replaceState({ nav: current.id }, '', '#' + current.id);
      else history.pushState({ nav: current.id }, '', '#' + current.id);
    }
    root.classList.toggle('at-home', current.id === 'home');
    document.querySelectorAll('[data-nav]').forEach((b) => b.setAttribute('aria-current', b.dataset.nav === current.id ? 'page' : 'false'));
    fab.hidden = current.id === 'home' ? !modules.find((m) => m.fields && !m.noAdd) : !(current.fields && !current.noAdd);
    const ia = root.querySelector('.ios-add'); if (ia) ia.hidden = fab.hidden;
    paint();
    view.focus?.();
  };
  const paint = () => {
    const m = current;
    if (m.id === 'home') {
      view.innerHTML = '';
      if (quick.length) {
        const q = h(`<div class="quick4" role="group" aria-label="Acciones rápidas">${quick.map((b, i) => `<button class="q4" data-q4="${i}" style="--qc:${b.color}" title="${esc(b.label)}${isDesktopLike ? ' (Ctrl+' + (i + 1) + ')' : ''}"><span class="q4i">${b.icon}</span><b>${esc(b.label)}</b></button>`).join('')}</div>`);
        q.onclick = (e) => { const b = e.target.closest('[data-q4]'); if (b) { haptic(12); quick[+b.dataset.q4].run(api); } };
        view.appendChild(q);
      }
      const body = document.createElement('div'); view.appendChild(body);
      home(body, api); return;
    }
    view.innerHTML = `<div class="page-title"><h1>${m.icon} ${esc(m.title)}</h1>${m.headerExtra ? m.headerExtra() : ''}</div><div id="mod"></div>`;
    const el = $('#mod', view);
    m.render ? m.render(el, api) : renderList(el, m);
  };
  const addCurrent = () => {
    const m = current.id === 'home' ? modules.find((x) => x.fields && !x.noAdd) : current;
    if (m?.fields && !m.noAdd) (m.onAdd ? m.onAdd(api) : openForm(m, null, m.preset?.() || {}));
  };
  const api = { go, paint, openForm, renderList, store, fmt, esc, h, toast, sheet, confirmSheet, modules, app,
    mod: (id) => modules.find((m) => m.id === id), openHarvey: (q) => openHarvey(q) };

  // re-pintar en vivo cuando cambian los datos (también si cambian desde otra app o Harvey)
  let raf = 0;
  store.subscribe('*', () => { if (staticHome && current?.id === 'home') return; cancelAnimationFrame(raf); raf = requestAnimationFrame(paint); });

  root.addEventListener('click', async (e) => {
    const n = e.target.closest('[data-nav]'); if (n) { go(n.dataset.nav); haptic(5); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'back') { haptic(5); goBack(); return; }
    if (a === 'settings') settings();
    if (a === 'add') addCurrent();
    if (a === 'harvey') openHarvey();
    if (a === 'more') {
      const body = h(`<div class="list">${navMods.map((m) => `<div class="list-item" data-go="${m.id}"><span style="font-size:20px">${m.icon}</span><div class="li-main"><div class="li-title">${esc(m.title)}</div></div></div>`).join('')}</div>`);
      const s = sheet('Secciones', body);
      body.onclick = (ev) => { const g = ev.target.closest('[data-go]'); if (g) { s.close(); setTimeout(() => go(g.dataset.go), 50); } };
    }
    if (a === 'update') {
      const u = await checkUpdate(appId, prefs.get('ver:' + appId));
      if (u.offline) return toast('Sin internet: no se pudo buscar actualización');
      if (!u.has) return toast(`${app.name} está al día (v${u.latest})`);
      if (await confirmSheet('Actualizar ' + app.name, `Nueva versión ${u.latest}. ${u.notes} Se actualiza esta app y el núcleo compartido; tus datos no cambian.`, { yes: 'Actualizar', no: 'Después' })) doUpdate(appId, u.latest);
    }
  });
  fab.onclick = addCurrent;
  dock.onclick = () => openHarvey();

  // Atajos de teclado (Windows)
  if (isDesktopLike) document.addEventListener('keydown', (e) => {
    if (e.target.closest('input,textarea,select,[contenteditable]')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openHarvey(); }
    else if ((e.ctrlKey || e.metaKey) && /^[1-4]$/.test(e.key) && quick[+e.key - 1]) { e.preventDefault(); quick[+e.key - 1].run(api); }
    else if (e.altKey && (e.key === 'n' || e.key === 'N')) { e.preventDefault(); openNotes(); }
    else if (e.key === 'n' || e.key === 'N') addCurrent();
    else if (/^[1-9]$/.test(e.key) && navMods[+e.key - 1]) go(navMods[+e.key - 1].id);
  });

  // Estado de la nube: punto de color en la barra + aviso para entrar con Google
  const LABEL = { local: 'Solo en este dispositivo', conectando: 'Conectando…', sincronizado: 'Sincronizado', 'sin-internet': 'Sin internet: se sube al volver', error: 'Error al sincronizar' };
  cloud.onStatus((st) => { const d = root.querySelector('.sync-dot'); if (d) { d.dataset.st = st; d.title = LABEL[st] || st; } });
  cloud.onAuth((u) => {
    let b = document.querySelector('.login-banner');
    if (u) { b?.remove(); return; }
    if (b || !cloud.available()) return;
    b = h(`<div class="login-banner"><span>☁️ Entra con Google para tener tus datos en todos tus dispositivos.</span><button class="btn btn-create sm" data-login>Entrar con Google</button></div>`);
    view.before(b);
    b.querySelector('[data-login]').onclick = () => cloud.signIn().catch((e) => toast(e.message || 'No se pudo entrar'));
  });
  // Navegación: atrás (botón ‹, gesto o botón del sistema) lleva a Inicio; desde Inicio, al Hub
  navBack = () => { if (current.id === 'home') return false; if (history.state?.nav) selfBack(); go('home', false); history.replaceState({}, '', '#home'); return true; };
  onNavPop = (id) => go(id, false);
  const first = location.hash.slice(1) || 'home';
  history.replaceState({}, '', '#home');
  current = navMods[0];
  if (first !== 'home' && navMods.some((m) => m.id === first)) go(first); else go('home', false);
  // Los cerebros revisan tus apps y dejan su reporte del día (una vez al día, sin gastar IA)
  setTimeout(() => import('./avisos.js').then((m) => m.dailyReport()).catch(() => {}), 6000);
  checkUpdate(appId, prefs.get('ver:' + appId)).then((u) => { if (u.has) $('[data-a=update] .badge').hidden = false; });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('../../sw.js', { scope: '../../' }).catch(() => {});
  return api;
}

// Harvey en un panel lateral/hoja (se carga solo cuando lo abres)
export async function openHarvey(q = '') {
  const body = h('<div class="harvey-panel"></div>');
  const s = sheet('🟣 Harvey', body);
  s.live = true;
  const { mountChat } = await import('./harvey.js');
  mountChat(body, { appId: ctx?.app.id, initial: q, compact: true });
}

// Crea un módulo a partir del esquema compartido
import { SCHEMA, fieldsOf } from './schema.js';
export function fromSchema(col, o = {}) {
  return { id: o.id || col, collection: col, title: o.title || SCHEMA[col]?.label || col, fields: fieldsOf(col), ...o };
}
export const weekStart = (d = new Date()) => { const x = new Date(d); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); x.setHours(0, 0, 0, 0); return x; };
export const isoDay = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
export const mins = (a, b) => { if (!a || !b) return 0; const [h1, m1] = a.split(':').map(Number); const [h2, m2] = b.split(':').map(Number); return Math.max(0, h2 * 60 + m2 - h1 * 60 - m1); };

// ---------- Burbuja del cronómetro (en todas las apps) ----------
function mountTimerBubble(b) {
  let iv = 0;
  const paint = () => {
    const t = timer.state();
    b.hidden = !t;
    if (!t) { clearInterval(iv); iv = 0; return; }
    b.classList.toggle('paused', !!t.paused);
    b.querySelector('.tb-t').textContent = clock(timer.elapsed(t));
    b.querySelector('.tb-l').textContent = t.label || '';
    if (t.running && !iv) iv = setInterval(paint, 1000);
    if (!t.running && iv) { clearInterval(iv); iv = 0; }
  };
  store.subscribe('timer', paint); paint();
}
export function openTimer({ label = '', kind = 'trabajo', job = '', topic = '', source = '' } = {}) {
  const t = timer.state();
  const body = h(`<div class="form">${t ? `
    <div class="timer-big num">${clock(timer.elapsed(t))}</div><p class="muted" style="margin:0;text-align:center">${esc(t.label || '')}${t.paused ? ' · en pausa' : ''}</p>
    <div class="row end"><button class="btn btn-pending" data-a="${t.paused ? 'resume' : 'pause'}">${t.paused ? '▶ Seguir' : '⏸ Pausa'}</button><button class="btn btn-delete" data-a="stop">■ Terminar y guardar</button></div>` : `
    <div class="field"><label for="tl">¿Qué vas a hacer?</label><input id="tl" value="${esc(label)}" placeholder="Edición reels, estudiar Filmora…"></div>
    <div class="seg" data-g="k">${[['trabajo', '💼 Trabajo'], ['estudio', '⚛️ Estudio'], ['otro', '⏱ Otro']].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${k === kind}">${l}</button>`).join('')}</div>
    <div class="row end"><button class="btn btn-create" data-a="start">▶ Empezar</button></div>`}</div>`);
  const s = sheet('⏱ Cronómetro', body);
  let k = kind;
  body.addEventListener('click', (e) => {
    const sg = e.target.closest('[data-g=k] [data-v]'); if (sg) { k = sg.dataset.v; body.querySelectorAll('[data-g=k] button').forEach((x) => x.setAttribute('aria-pressed', x === sg)); return; }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'start') { timer.start({ label: body.querySelector('#tl').value.trim() || 'Trabajo', kind: k, job, topic, source }); toast('Cronómetro en marcha: lo ves arriba en todas las apps'); }
    if (a === 'pause') timer.pause();
    if (a === 'resume') timer.resume();
    if (a === 'stop') { const l = timer.stop(); if (l) toast(`Guardado: ${fmt.hours(l.minutes)}`); }
    haptic(); s.close();
  });
  return s;
}

// ---------- Notas globales (📝 en todas las apps) ----------
export function openNotes({ link = null } = {}) {
  const appId = ctx?.app.id || 'sueltas';
  const here = FOLDERS.some(([k]) => k === appId) ? appId : 'sueltas';
  let folder = link ? here : '';
  const body = h(`<div class="notes">
    <form class="nq"><input name="q" placeholder="📝 Nota rápida… escribe y Enter" autocomplete="off" enterkeyhint="done"><button class="btn btn-create sm">Guardar</button></form>
    ${link ? `<p class="muted" style="margin:0;font-size:13px">🔗 Se vincula a: <b>${esc(linkLabel(link))}</b></p>` : ''}
    <div class="tabs nf"></div><div class="nl list"></div></div>`);
  let unsub = null;
  const s = sheet('📝 Notas', body, { onClose: () => unsub?.() });
  const paint = () => {
    const all = notes.list();
    body.querySelector('.nf').innerHTML = [['', 'Todas'], ...FOLDERS].map(([k, l]) => { const n = k ? all.filter((x) => x.folder === k).length : all.length; return (k && !n && k !== here) ? '' : `<button type="button" data-f="${k}" aria-pressed="${folder === k}">${l}${n ? ' · ' + n : ''}</button>`; }).join('');
    const items = (link ? notes.forRecord(link.col, link.id) : notes.list(folder || undefined)).slice(0, 80);
    body.querySelector('.nl').innerHTML = items.map((n) => `<div class="list-item" data-n="${n.id}"><div class="li-main"><div class="li-title" style="white-space:normal">${esc(n.text)}</div><div class="li-sub">${esc((FOLDERS.find(([k]) => k === n.folder) || [, ''])[1])}${n.link ? ' · 🔗 ' + esc(linkLabel(n.link)) : ''} · ${fmt.date((n.createdAt || '').slice(0, 10))}</div></div></div>`).join('') || '<div class="empty" style="padding:18px"><b>Sin notas aquí</b>Escribe arriba: una palabra basta.</div>';
  };
  paint();
  unsub = store.subscribe('notas', paint);
  body.querySelector('.nq').addEventListener('submit', (e) => {
    e.preventDefault(); const i = e.target.q; const v = i.value.trim(); if (!v) return;
    notes.quick(v, link ? here : (folder || 'sueltas'), link); i.value = ''; haptic(); toast('Nota guardada');
  });
  body.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]'); if (f) { folder = f.dataset.f; paint(); return; }
    const it = e.target.closest('[data-n]'); if (it) editNote(store.get('notas', it.dataset.n));
  });
  setTimeout(() => body.querySelector('.nq input').focus(), 320);
  return s;
}
function editNote(n) {
  if (!n) return;
  const appId = ctx?.app.id;
  const cand = (LINKABLE[appId] || []).flatMap(([col, f]) => store.list(col).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 12).map((r) => ({ col, id: r.id, label: f(r) })));
  const body = h(`<form class="form">
    <div class="field"><label for="nt">Nota</label><textarea id="nt">${esc(n.text)}</textarea></div>
    <div class="field"><label for="nfo">Carpeta</label><select id="nfo">${FOLDERS.map(([k, l]) => `<option value="${k}" ${n.folder === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label for="nli">🔗 Vincular a</label><select id="nli"><option value="">— Sin vínculo —</option>${n.link && !cand.some((c) => c.col === n.link.col && c.id === n.link.id) ? `<option value="${n.link.col}|${n.link.id}" selected>${esc(linkLabel(n.link))}</option>` : ''}${cand.map((c) => `<option value="${c.col}|${c.id}" ${n.link?.col === c.col && n.link?.id === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>
    <div class="row end"><button type="button" class="btn btn-delete ghost" data-a="del">🗑 Borrar</button><button class="btn btn-edit">✓ Guardar</button></div></form>`);
  const s = sheet('Editar nota', body);
  body.addEventListener('submit', (e) => { e.preventDefault();
    const [col, id] = body.querySelector('#nli').value.split('|');
    store.update('notas', n.id, { text: body.querySelector('#nt').value.trim() || n.text, folder: body.querySelector('#nfo').value, link: col ? { col, id, label: linkLabel({ col, id }) } : null });
    toast('Nota guardada'); s.close(); });
  body.querySelector('[data-a=del]').onclick = () => { store.remove('notas', n.id); toast('Nota borrada'); s.close(); };
}
