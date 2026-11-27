// 📍 Grabar ordenado por lugar: junta los planos de todos los videos que se graban en el mismo sitio.
// Un plano grande a la vez: mapa, cámara, qué dice, en pantalla, tomas; "✅ Grabado · siguiente".
import { store, fmt, esc, h, toast, sheet } from '../../core/shell.js';
import { escenas, lugarName, claq, tipoL, editarArbol, colorCli, cname, tomaBuena, itemsDe, mapaDe } from './datos.js';
import { mapaHtml } from './mapa.js';

const keyLugar = (e) => e.lugar || (e.lugarTxt ? 'txt:' + e.lugarTxt.toLowerCase() : 'sin');
// Grupos por lugar con sus planos pendientes
export function grupos({ soloHoy = false } = {}) {
  const G = new Map(); const hoy = fmt.today();
  for (const v of store.list('videos')) {
    if (['entregar', 'publicado'].includes(v.status)) continue;
    escenas(v).forEach((e, si) => {
      if (soloHoy && e.fecha !== hoy) return;
      const k = keyLugar(e);
      const g = G.get(k) || { key: k, name: lugarName(e) || 'Sin lugar', items: [], fechas: new Set(), horas: new Set(), luz: new Set(), util: new Set(), vids: new Set() };
      e.planos.forEach((p, pi) => g.items.push({ vid: v.id, si, pi, done: !!p.grabado }));
      if (e.fecha) g.fechas.add(e.fecha); if (e.fecha === hoy && e.hora) g.horas.add(e.hora);
      if (e.luz) g.luz.add(e.luz); if (e.utileria) g.util.add(e.utileria); g.vids.add(v.id);
      G.set(k, g);
    });
  }
  const rank = (g) => ([...g.fechas].includes(hoy) ? 0 : g.fechas.size ? 1 : 2);
  return [...G.values()].filter((g) => g.items.length).sort((a, b) => rank(a) - rank(b) || ([...a.fechas].sort()[0] || '9').localeCompare([...b.fechas].sort()[0] || '9'));
}

export function abrirGrabacion({ vid = null, lugar = null } = {}, after = () => {}) {
  let items;
  if (lugar) items = (grupos().find((g) => g.key === lugar)?.items || []);
  else { const v = store.get('videos', vid); items = []; const byPlace = new Map(); escenas(v).forEach((e, si) => { const k = keyLugar(e); byPlace.set(k, [...(byPlace.get(k) || []), ...e.planos.map((p, pi) => ({ vid, si, pi, done: !!p.grabado }))]); }); for (const l of byPlace.values()) items.push(...l); }
  if (!items.length) return toast('No hay planos para grabar aquí');
  let i = Math.max(0, items.findIndex((x) => !x.done));
  const body = h('<div class="recm"></div>');
  const s = sheet('📍 Grabando', body, { onClose: after });
  s.el.classList.add('full');
  const cur = () => { const it = items[i]; const v = store.get('videos', it.vid); const e = escenas(v)[it.si]; return { it, v, e, p: e?.planos[it.pi] }; };
  const paint = () => {
    const { it, v, e, p } = cur(); if (!p) { s.close(); return; }
    const its = itemsDe(p); const mp = mapaDe(p);
    const hechos = items.filter((x) => escenas(store.get('videos', x.vid))[x.si]?.planos[x.pi]?.grabado).length;
    s.el.querySelector('.sheet-head h2').textContent = '📍 ' + (lugarName(e) || 'Sin lugar');
    body.innerHTML = `<div class="muted" style="font-size:12px">plano ${i + 1} de ${items.length} aquí · ${hechos} grabados</div>
      <div class="bar" style="margin:6px 0 10px"><i style="width:${hechos / items.length * 100}%;background:var(--c-create)"></i></div>
      ${mp.length ? mapaHtml(mp, { mini: true }) : ''}
      <span class="chip" style="margin-top:8px;--k:${esc(colorCli(v.client))};border-left:3px solid var(--k)">${esc(v.title)} · ${claq(it.si, it.pi)} ${esc(tipoL(p.tipo))}${p.seg ? ' · ' + p.seg + ' s' : ''}${p.mov ? ' · ' + esc(p.mov) : ''}</span>
      <div class="bigq">${p.desc ? `<div>🎬 ${esc(p.desc)}</div>` : ''}
        ${its.filter((x) => x.k !== 'mapa').map((x) => x.k === 'persona' ? `<div>🧍 <b>${esc(x.nombre || 'Persona')}</b>${x.donde ? ' (' + esc(x.donde) + ')' : ''}${x.hace ? ', ' + esc(x.hace) : ''}${x.dice ? `: “${esc(x.dice)}”` : ''}</div>`
          : x.k === 'camara' ? ((x.donde || x.mira) ? `<div>📷 ${esc([x.donde, x.mira && 'mirando ' + x.mira].filter(Boolean).join(', '))}${x.altura ? ' · altura ' + esc(x.altura) : ''}${x.zoom ? ' · ' + esc(x.zoom) : ''}</div>` : '')
          : x.texto ? `<div class="${x.k === 'nota' ? 'muted' : ''}" style="font-size:14px">${x.k === 'pantalla' ? '🔤 En pantalla' : '📝'}: “${esc(x.texto)}”</div>` : '').join('')}
        ${!p.desc && !its.some((x) => x.dice || x.donde || x.mira || x.texto) ? '<div class="muted">Plano sin detalles: grábalo a tu criterio.</div>' : ''}</div>
      <div class="sec3">Tomas</div>
      <div class="tks">${(p.tomas || []).map((t) => `<button data-tk="${t.n}" class="${t.buena ? 'ok' : ''}">T${t.n}${t.buena ? ' ✓ buena' : ''}</button>`).join('')}<button data-a="nt">＋ toma</button></div>
      <div class="row recnav"><button class="btn btn-cancel" data-a="prev" ${i === 0 ? 'disabled' : ''}>‹ Anterior</button><button class="btn btn-create" data-a="ok">${p.grabado ? '✓ Grabado · siguiente ›' : '✅ Grabado · siguiente ›'}</button></div>
      ${i < items.length - 1 ? '<button class="linkish" data-a="skip" style="display:block;margin:10px auto 0">Saltar este plano</button>' : ''}`;
  };
  const upd = (fn) => { const { it } = cur(); return editarArbol(it.vid, (x) => fn(x[it.si].planos[it.pi])); };
  paint();
  body.onclick = (e) => {
    const t = e.target.closest('[data-tk]'); if (t) { const n = +t.dataset.tk; upd((p) => { p.tomas = p.tomas.map((x) => ({ ...x, buena: x.n === n ? !x.buena : false })); }); navigator.vibrate?.(8); return paint(); }
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'nt') { upd((p) => { const n = (p.tomas?.length || 0) + 1; p.tomas = [...(p.tomas || []).map((x) => ({ ...x, buena: false })), { n, buena: true }]; }); navigator.vibrate?.(8); return paint(); }
    if (a === 'prev') { i = Math.max(0, i - 1); return paint(); }
    if (a === 'skip') { i = Math.min(items.length - 1, i + 1); return paint(); }
    if (a === 'ok') {
      const { v } = cur();
      const st = upd((p) => { p.grabado = true; if (!(p.tomas || []).length) p.tomas = [{ n: 1, buena: true }]; });
      if (st === 'editar') toast(`✅ ${v.title}: todo grabado → pasa a ✂️ Editar`);
      navigator.vibrate?.(15);
      const next = items.findIndex((x, k) => k > i && !escenas(store.get('videos', x.vid))[x.si]?.planos[x.pi]?.grabado);
      if (next === -1) { toast('🎉 ¡Terminaste de grabar aquí!'); s.close(); return; }
      i = next; paint();
    }
  };
}

// Módulo 📍 Grabar: lugares con planos pendientes (hoy primero)
export const grabarMod = { id: 'grabar', title: 'Grabar', icon: '📍',
  render(el) {
    const gs = grupos(); const hoy = fmt.today();
    el.innerHTML = gs.map((g) => { const pend = g.items.filter((x) => !x.done).length; const esHoy = g.fechas.has(hoy);
      return `<div class="card place" style="--k:${esHoy ? 'var(--accent)' : 'var(--line)'}"><div class="row" style="justify-content:space-between"><b>📍 ${esc(g.name)}</b><span class="muted" style="font-size:12px">${esHoy ? 'HOY' + (g.horas.size ? ' ' + [...g.horas].sort()[0] : '') : g.fechas.size ? fmt.date([...g.fechas].sort()[0]) : 'sin fecha'}</span></div>
        <div class="muted" style="font-size:12px">${pend} planos por grabar · ${[...g.vids].map((id) => esc(store.get('videos', id)?.title || '')).join(', ')}</div>
        ${[...g.luz].slice(0, 1).map((x) => `<div class="muted" style="font-size:12px">💡 ${esc(x)}</div>`).join('')}${[...g.util].slice(0, 1).map((x) => `<div class="muted" style="font-size:12px">🧰 ${esc(x)}</div>`).join('')}
        ${pend ? `<button class="btn btn-create sm" data-l="${esc(g.key)}" style="margin-top:8px">▶ Grabar aquí</button>` : '<span class="gr">✅ todo grabado</span>'}</div>`; }).join('') || '<div class="empty"><b>Nada por grabar</b>Cuando un video tenga escenas con planos, aparecen aquí agrupados por lugar.</div>';
    el.onclick = (e) => { const b = e.target.closest('[data-l]'); if (b) abrirGrabacion({ lugar: b.dataset.l }); };
  } };
export { cname, tomaBuena };
