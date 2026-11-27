// 🗺 Mapa visual: vista desde arriba del lugar. Arrastras 📷 🧍 💡 🪑 📦 🚪 🔤; la cámara muestra hacia dónde mira.
// items: [{ id, k, x, y (0–100 %), r (grados, solo cámara), label, base }]
import { esc } from '../../core/shell.js';
import { uid } from './datos.js';

export const ICON = { cam: '📷', per: '🧍', luz: '💡', silla: '🪑', obj: '📦', puerta: '🚪', mesa: '🟫', txt: '🔤' };
export const NOMBRE = { cam: 'Cámara', per: 'Persona', luz: 'Luz', silla: 'Silla', obj: 'Objeto', puerta: 'Puerta', mesa: 'Mesa / mostrador', txt: 'Nota' };

export function mapaHtml(items = [], { mini = false } = {}) {
  return `<div class="smap ${mini ? 'mini' : ''}"><span class="smap-n">↑ fondo</span>${items.map((it) => `
    <div class="mi ${it.k === 'cam' ? 'cam' : ''} ${it.base ? 'base' : ''}" data-mi="${esc(it.id)}" style="left:${it.x}%;top:${it.y}%">
      ${it.k === 'cam' ? `<i class="cone" style="transform:translate(-50%,-100%) rotate(${Number(it.r) || 0}deg)"></i>` : ''}<span class="mie">${ICON[it.k] || '📦'}</span>${it.label ? `<small>${esc(it.label)}</small>` : ''}</div>`).join('')}</div>`;
}

// Editor: pinta en el, llama onChange(items) al soltar o cambiar
export function mapaEditor(el, items, onChange, { base = null } = {}) {
  let L = (items || []).map((x) => ({ ...x })); let sel = null;
  const save = () => onChange(L.map((x) => ({ ...x })));
  const paint = () => {
    const s = L.find((x) => x.id === sel);
    el.innerHTML = mapaHtml(L) + `
      <div class="mpal">${Object.keys(ICON).map((k) => `<button type="button" data-add="${k}" title="${NOMBRE[k]}" aria-label="Agregar ${NOMBRE[k]}">${ICON[k]}</button>`).join('')}</div>
      ${s ? `<div class="msel"><b>${ICON[s.k]} ${NOMBRE[s.k]}</b><input data-lbl value="${esc(s.label || '')}" placeholder="Nombre (Juan, aro de luz…)">
        ${s.k === 'cam' ? '<button type="button" data-rot="-45" aria-label="Girar a la izquierda">↺</button><button type="button" data-rot="45" aria-label="Girar a la derecha">↻</button>' : ''}<button type="button" data-del aria-label="Quitar">🗑</button></div>`
        : `<p class="muted mhint">Toca un ícono de abajo para ponerlo; arrástralo a su sitio. Toca uno puesto para nombrarlo${L.some((x) => x.k === 'cam') ? ' o girar la cámara' : ''}.${base?.length && !L.some((x) => x.base) ? ' <button type="button" class="linkish" data-base>Usar el mapa base del lugar</button>' : ''}</p>`}`;
    el.querySelector(`[data-mi="${sel}"]`)?.classList.add('sel');
  };
  paint();
  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    const m = e.target.closest('.mi'); if (!m) return;
    const box = el.querySelector('.smap').getBoundingClientRect();
    drag = { id: m.dataset.mi, box, moved: false, x0: e.clientX, y0: e.clientY, node: m };
    m.setPointerCapture?.(e.pointerId); e.preventDefault();
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 4) drag.moved = true;
    if (!drag.moved) return;
    const it = L.find((x) => x.id === drag.id); if (!it) return;
    it.x = Math.max(3, Math.min(97, ((e.clientX - drag.box.left) / drag.box.width) * 100));
    it.y = Math.max(5, Math.min(95, ((e.clientY - drag.box.top) / drag.box.height) * 100));
    drag.node.style.left = it.x + '%'; drag.node.style.top = it.y + '%';
  });
  const end = () => { if (!drag) return; const d = drag; drag = null; if (d.moved) save(); else { sel = sel === d.id ? null : d.id; paint(); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-add]'); if (a) { const it = { id: uid(), k: a.dataset.add, x: 50, y: a.dataset.add === 'cam' ? 80 : 40, r: 0, label: '' }; L.push(it); sel = it.id; save(); paint(); return; }
    const r = e.target.closest('[data-rot]'); if (r) { const it = L.find((x) => x.id === sel); if (it) { it.r = ((Number(it.r) || 0) + Number(r.dataset.rot) + 360) % 360; save(); paint(); } return; }
    if (e.target.closest('[data-del]')) { L = L.filter((x) => x.id !== sel); sel = null; save(); paint(); return; }
    if (e.target.closest('[data-base]')) { L = base.map((x) => ({ ...x, id: uid(), base: true })).concat(L); save(); paint(); }
  });
  el.addEventListener('change', (e) => { if (e.target.matches('[data-lbl]')) { const it = L.find((x) => x.id === sel); if (it) { it.label = e.target.value.trim(); save(); paint(); } } });
}
