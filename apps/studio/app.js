// NEXO Studio 3 · videos de clientes — diseño acordado en docs/STUDIO_V3.md
// Inicio: 🎙 idea por voz + 📍 lo que se graba hoy (por lugar) + 🎬 videos con su línea de metro.
import { boot, fromSchema, store, fmt, esc, h, toast, sheet, confirmSheet, openForm } from '../../core/shell.js';
import { EST, estIdx, colorCli, cname, iniciales, escenas, lugarName, claq, tipoL, editarArbol, horas, mesDe, TAGS, migrar } from './datos.js';
import { videoPage, abrirVideo, metroHtml, dictar } from './guion.js';
import { grabarMod, grupos, abrirGrabacion } from './grabar.js';
import { compartirPlan } from './pdfs.js';
import { mapaEditor } from './mapa.js';
import { subirFoto, pintarFotos, borrarFoto } from '../../core/fotos.js';

const VERSION = '3.0.0';
let API = null;

// ---------- 🎙 idea por voz ----------
function ideaRapida({ auto = false } = {}) {
  const body = h(`<form class="form"><div class="mic-in big"><textarea id="qi" rows="3" placeholder="Toca 🎙 y habla: antes y después del corte con transición de mano…"></textarea><button type="button" class="mic-b" data-a="mic" aria-label="Dictar">🎙</button></div>
    <div class="picks">${TAGS.map((t) => `<button type="button" class="pick sm" data-tg="${t}">${t}</button>`).join('')}</div>
    <input id="ql" type="url" placeholder="Link de referencia (TikTok, reel…) opcional">
    <div class="row end"><button class="btn btn-create">💡 Guardar idea</button></div></form>`);
  const s = sheet('💡 Idea rápida', body);
  const ta = body.querySelector('#qi'); const mic = body.querySelector('[data-a=mic]');
  body.addEventListener('click', (e) => { const t = e.target.closest('[data-tg]'); if (t) t.classList.toggle('on'); if (e.target.closest('[data-a=mic]')) dictar(mic, ta); });
  body.addEventListener('submit', (e) => { e.preventDefault(); const v = ta.value.trim(); if (!v) return toast('Dicta o escribe la idea'); mic._rec?.stop();
    store.add('ideas', { title: v.length > 120 ? v.slice(0, 120) + '…' : v, hook: v.length > 120 ? v : '', tags: [...body.querySelectorAll('[data-tg].on')].map((x) => x.dataset.tg).join(', '), link: body.querySelector('#ql').value.trim() });
    toast('💡 Idea guardada'); s.close(); });
  if (auto && (window.SpeechRecognition || window.webkitSpeechRecognition)) dictar(mic, ta); else setTimeout(() => ta.focus(), 300);
}
function nuevoVideo({ title = '', idea = null, client = '' } = {}) {
  const cs = store.list('clients');
  const f = h(`<form class="form" novalidate><div class="field"><label for="nv">Nombre del video</label><input id="nv" value="${esc(title)}" placeholder="Reel promo diciembre"></div>
    <div class="field"><label>Cliente</label><div class="picks"><button type="button" class="pick sm ${client ? '' : 'on'}" data-c="">NEXO PC / propio</button>${cs.map((c) => `<button type="button" class="pick sm ${c.id === client ? 'on' : ''}" data-c="${c.id}" style="--k:${esc(colorCli(c.id))}"><i class="cdot" style="background:var(--k)"></i>${esc(c.name)}</button>`).join('')}</div></div>
    <div class="field"><label for="nd">Entrega (opcional)</label><input id="nd" type="date"></div>
    <div class="row end"><button class="btn btn-create">＋ Crear y armar el guion</button></div></form>`);
  const s = sheet('🎬 Nuevo video', f); let cli = client;
  f.addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) { cli = b.dataset.c; f.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('on', x === b)); } });
  f.addEventListener('submit', (e) => { e.preventDefault(); const t = f.querySelector('#nv').value.trim(); if (!t) return toast('Ponle nombre (lo demás es opcional)');
    const v = store.add('videos', { title: t, client: cli, status: 'idea', due: f.querySelector('#nd').value, escenas: [], tags: idea?.tags || '', gancho: idea?.hook ? '' : '', idea: idea?.id || '' });
    if (idea) store.update('ideas', idea.id, { video: v.id });
    s.close(); setTimeout(() => abrirVideo(v.id, API), 280); });
  setTimeout(() => f.querySelector('#nv').focus(), 300);
}

// ---------- inicio (A + C) ----------
function home(el, api) {
  API = api;
  const vs = store.list('videos'); const hoy = fmt.today();
  const ideasSin = store.list('ideas').filter((i) => !i.video);
  const ult = ideasSin.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  const gHoy = grupos({ soloHoy: true });
  const edit = vs.filter((v) => v.status === 'editar');
  const prod = vs.filter((v) => v.status !== 'publicado').sort((a, b) => (a.due || '9').localeCompare(b.due || '9') || estIdx(b.status) - estIdx(a.status));
  const sig = (v) => { const s = v.status || 'idea'; const es = escenas(v); const pend = es.reduce((a, e) => a + e.planos.filter((p) => !p.grabado).length, 0); const prox = es.filter((e) => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    if (s === 'idea') return '💡 Arma el guion'; if (s === 'guion') return es.length ? `📝 ${es.length} escenas · ${es.reduce((a, e) => a + e.planos.length, 0)} planos` : '📝 Falta el guion';
    if (s === 'grabar') return prox ? `🗓 Graba ${prox.fecha === hoy ? 'hoy' : fmt.date(prox.fecha)}${prox.hora ? ' ' + prox.hora : ''} · ${pend} planos` : `🎥 ${pend} planos por grabar · sin fecha`;
    if (s === 'editar') { const hr = horas(v.id); return `✂️ Editar${hr.editar ? ' · ' + fmt.hours(hr.editar) + ' medidas' : ''}`; } return '📤 Entregar al cliente'; };
  el.innerHTML = `
    <button class="micbar" data-a="idea"><span class="m">🎙</span><span><b>Toca y dicta tu idea</b><small>${ideasSin.length ? `${ideasSin.length} idea(s) sin usar${ult ? ' · la última ' + (ult.createdAt?.slice(0, 10) === hoy ? 'hoy' : fmt.date(ult.createdAt.slice(0, 10))) : ''}` : 'Que no se te escape ninguna'}</small></span></button>
    ${gHoy.length ? `<div class="sec3">📍 Hoy se graba</div>${gHoy.map((g) => `<div class="card place" style="--k:var(--accent)"><div class="row" style="justify-content:space-between"><b>📍 ${esc(g.name)}</b><span class="muted" style="font-size:12px">${[...g.horas].sort()[0] || ''}</span></div>
        ${[...g.luz, ...g.util].slice(0, 2).map((x) => `<div class="muted" style="font-size:12px">💡 ${esc(x)}</div>`).join('')}
        ${g.items.slice(0, 6).map((it) => { const v = store.get('videos', it.vid); const p = escenas(v)[it.si].planos[it.pi]; return `<label class="tk"><input type="checkbox" data-hg="${it.vid}|${it.si}|${it.pi}" ${p.grabado ? 'checked' : ''}><span>${claq(it.si, it.pi)} ${esc(p.desc || tipoL(p.tipo))} <span class="muted">· ${esc(v.title)}</span></span></label>`; }).join('')}
        ${g.items.length > 6 ? `<div class="muted" style="font-size:12px">+${g.items.length - 6} planos más</div>` : ''}
        <button class="btn btn-create sm" data-l="${esc(g.key)}" style="margin-top:6px">▶ Grabar aquí</button></div>`).join('')}` : ''}
    ${edit.length ? `<div class="card ed" data-v="${edit[0].id}" data-t="editar">✂️ <b>Por editar:</b> ${edit.map((v) => esc(v.title)).join(', ')}</div>` : ''}
    <div class="sec3">🎬 En producción · ${prod.length}</div>
    ${prod.map((v) => `<button class="card vcard" data-v="${v.id}" style="--k:${esc(colorCli(v.client))}"><div class="row" style="justify-content:space-between;flex-wrap:nowrap;gap:8px"><b>${esc(v.title)}</b><span class="chip cli"><i class="cdot" style="background:var(--k)"></i>${esc(cname(v.client) || 'NEXO PC')}</span></div>
      <span class="muted" style="font-size:12px">${esc(sig(v))}${v.due ? ` · entrega ${v.due === hoy ? '<b class="down">HOY</b>' : fmt.date(v.due)}` : ''}</span>${metroHtml(v)}</button>`).join('') || `<div class="empty"><b>Sin videos en producción</b>Toca ＋ para crear uno, o pasa una idea a video desde 💡 Ideas.${store.list('services').some((s) => Number(s.videos)) ? '' : ' Tip: en Negocios, ponle "videos que incluye" a tus planes y Studio crea los videos solos al aprobar.'}</div>`}
    ${vs.some((v) => v.status === 'publicado') ? `<button class="linkish" data-a="pub" style="margin-top:8px">✅ Ver publicados (${vs.filter((v) => v.status === 'publicado').length})</button>` : ''}`;
  el.onclick = (e) => {
    const g = (s) => e.target.closest(s); let b;
    if (g('[data-a=idea]')) return ideaRapida({ auto: true });
    if ((b = g('[data-l]'))) return abrirGrabacion({ lugar: b.dataset.l });
    if ((b = g('[data-v]'))) return abrirVideo(b.dataset.v, api, b.dataset.t || (store.get('videos', b.dataset.v).status === 'editar' ? 'editar' : 'guion'));
    if (g('[data-a=pub]')) return publicados();
  };
  el.onchange = (e) => { const b = e.target.closest('[data-hg]'); if (!b) return; const [vid, si, pi] = b.dataset.hg.split('|'); const st = editarArbol(vid, (x) => { x[+si].planos[+pi].grabado = b.checked; }); if (st === 'editar') toast('✅ Todo grabado: pasa a ✂️ Editar'); };
}
function publicados() {
  const vs = store.list('videos').filter((v) => v.status === 'publicado').sort((a, b) => String(b.publishDate).localeCompare(String(a.publishDate)));
  const body = h(`<div class="list">${vs.map((v) => `<button class="list-item" data-v="${v.id}"><i class="cdot" style="background:${esc(colorCli(v.client))}"></i><div class="li-main"><div class="li-title">${esc(v.title)}</div><div class="li-sub">${esc(cname(v.client) || 'NEXO PC')} · ${fmt.date(v.publishDate)}</div></div>${v.results?.views != null ? `<b class="num">${Number(v.results.views).toLocaleString('es-CO')} 👁</b>` : '<span class="chip">sin resultados</span>'}</button>`).join('')}</div>`);
  const s = sheet('✅ Publicados', body);
  body.onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) { s.close(); setTimeout(() => abrirVideo(b.dataset.v, API, 'entregar'), 280); } };
}

// ---------- 💡 Ideas ----------
let tagF = '';
const ideasMod = { id: 'ideas', title: 'Ideas', icon: '💡', onAdd: () => ideaRapida(),
  render(el, api) {
    const all = store.list('ideas').sort((a, b) => (!!a.video - !!b.video) || String(b.createdAt).localeCompare(String(a.createdAt)));
    const L = tagF ? all.filter((i) => (i.tags || '').includes(tagF)) : all;
    const dias = (i) => Math.round((new Date(fmt.today() + 'T12:00') - new Date((i.createdAt || '').slice(0, 10) + 'T12:00')) / 864e5) || 0;
    el.innerHTML = `<button class="micbar" data-a="idea"><span class="m">🎙</span><span><b>Dictar idea</b><small>${all.filter((i) => !i.video).length} sin usar · ${all.filter((i) => i.video).length} ya son video</small></span></button>
      <div class="picks" style="margin:10px 0">${['', ...TAGS].map((t) => `<button class="pick sm ${tagF === t ? 'on' : ''}" data-f="${t}">${t || 'Todas'}</button>`).join('')}</div>
      <div class="list">${L.map((i) => `<div class="list-item ${i.video ? 'usada' : ''}"><div class="li-main"><div class="li-title">${esc(i.title)}</div><div class="li-sub">${[i.tags, i.video ? '✓ ya es video' : dias(i) >= 7 ? `⚠ ${dias(i)} días sin usar` : dias(i) ? `hace ${dias(i)} d` : 'hoy'].filter(Boolean).map(esc).join(' · ')}${i.link && /^https:\/\//.test(i.link) ? ` · <a href="${esc(i.link)}" target="_blank" rel="noopener">ver referencia</a>` : ''}</div></div>
        ${i.video ? `<button class="btn btn-edit ghost sm" data-ov="${i.video}">Abrir</button>` : `<button class="btn btn-create sm" data-hv="${i.id}">🎬 Hacer video</button>`}<button class="km" data-del="${i.id}" aria-label="Borrar idea">🗑</button></div>`).join('') || '<div class="empty"><b>Sin ideas</b>Toca 🎙 y dila en voz alta apenas se te ocurra.</div>'}</div>`;
    el.onclick = async (e) => { const g = (s) => e.target.closest(s); let b;
      if (g('[data-a=idea]')) return ideaRapida({ auto: true });
      if ((b = g('[data-f]'))) { tagF = b.dataset.f; return api.paint(); }
      if ((b = g('[data-hv]'))) { const i = store.get('ideas', b.dataset.hv); return nuevoVideo({ title: i.title.slice(0, 60), idea: i }); }
      if ((b = g('[data-ov]'))) return abrirVideo(b.dataset.ov, api);
      if ((b = g('[data-del]')) && await confirmSheet('¿Borrar la idea?', store.get('ideas', b.dataset.del)?.title || '', { yes: 'Borrar', danger: true })) store.remove('ideas', b.dataset.del); };
  } };

// ---------- 🗓 Plan del mes (por cliente) ----------
const P = { cli: '', mes: mesDe() };
const planMod = { id: 'plan', title: 'Plan del mes', icon: '🗓',
  render(el, api) {
    const conVid = [...new Set(store.list('videos').map((v) => v.client).filter(Boolean))];
    const cs = store.list('clients').filter((c) => conVid.includes(c.id) || store.list('jobs').some((j) => j.client === c.id && ['aprobado', 'en curso'].includes(j.status)));
    if (!cs.length) { el.innerHTML = '<div class="empty"><b>Aún no hay clientes con videos</b>Crea un video con cliente (＋ en el inicio) o aprueba en Negocios un plan que incluya videos.</div>'; return; }
    if (!cs.some((c) => c.id === P.cli)) P.cli = cs[0].id;
    const [y, m] = P.mes.split('-').map(Number); const first = new Date(y, m - 1, 1); const days = new Date(y, m, 0).getDate(); const pad = (first.getDay() + 6) % 7;
    const vs = store.list('videos').filter((v) => v.client === P.cli);
    const delMes = vs.filter((v) => (v.publishDate || v.due || '').startsWith(P.mes));
    const sinFecha = vs.filter((v) => !v.publishDate && !v.due && v.status !== 'publicado');
    const plan = store.list('contentPlans').find((p) => p.client === P.cli && p.month === P.mes);
    const est = plan?.estado || 'borrador';
    const color = { idea: 'k-gu', guion: 'k-pe', grabar: 'k-gb', editar: 'k-ed', entregar: 'k-ed', publicado: 'k-ok' };
    el.innerHTML = `<div class="picks">${cs.map((c) => `<button class="pick sm ${c.id === P.cli ? 'on' : ''}" data-c="${c.id}"><i class="cdot" style="background:${esc(colorCli(c.id))}"></i>${esc(c.name)}</button>`).join('')}</div>
      <div class="row" style="justify-content:space-between;margin:10px 0"><button class="btn btn-cancel ghost sm" data-m="-1" aria-label="Mes anterior">‹</button><b style="text-transform:capitalize">${first.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</b><button class="btn btn-cancel ghost sm" data-m="1" aria-label="Mes siguiente">›</button></div>
      <div class="card row" style="justify-content:space-between"><span><b style="font-size:20px">${delMes.length}</b> <span class="muted" style="font-size:12px">videos este mes · ${delMes.filter((v) => v.status === 'publicado').length} publicados</span></span><span class="chip ${est === 'aprobado' ? 's-create' : est === 'cambios' ? 's-delete' : 's-pending'}">${{ borrador: '📝 borrador', enviado: '⏳ por aprobar', aprobado: '✅ aprobado', cambios: '✎ pidió cambios' }[est]}</span></div>
      ${est === 'cambios' && plan?.cambios ? `<div class="card" style="font-size:13px">✎ ${esc(plan.cambios)}</div>` : ''}
      <div class="calm">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<div class="h">${d}</div>`).join('')}${'<div></div>'.repeat(pad)}
        ${[...Array(days)].map((_, i) => { const d = `${P.mes}-${String(i + 1).padStart(2, '0')}`; const dv = delMes.filter((v) => (v.publishDate || v.due) === d);
          return `<button class="d ${d === fmt.today() ? 't' : ''}" data-d="${d}"><b>${i + 1}</b>${dv.map((v) => `<span class="v ${color[v.status || 'idea']}" data-v="${v.id}">${esc(v.title)}</span>`).join('')}</button>`; }).join('')}</div>
      <div class="leg"><span><i class="k-ok"></i>Publicado</span><span><i class="k-ed"></i>Editando</span><span><i class="k-gb"></i>Grabar</span><span><i class="k-pe"></i>Guion</span><span><i class="k-gu"></i>Idea</span></div>
      ${sinFecha.length ? `<p class="muted" style="font-size:12.5px">${sinFecha.length} video(s) sin fecha: toca un día para ponerlos.</p>` : ''}
      <button class="btn btn-create" data-a="pdf" style="width:100%;margin-top:6px">📤 Mandar plan por WhatsApp (PDF)</button>
      <div class="row" style="margin-top:8px"><button class="btn btn-cancel" data-a="ok" style="flex:1">✅ Aprobó</button><button class="btn btn-cancel" data-a="cambios" style="flex:1">✎ Pide cambios</button></div>`;
    const savePlan = (o) => { plan ? store.update('contentPlans', plan.id, o) : store.add('contentPlans', { client: P.cli, month: P.mes, ...o }); };
    el.onclick = async (e) => { const g = (s) => e.target.closest(s); let b;
      if ((b = g('[data-c]'))) { P.cli = b.dataset.c; return api.paint(); }
      if ((b = g('[data-m]'))) { const d = new Date(y, m - 1 + +b.dataset.m, 1); P.mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; return api.paint(); }
      if ((b = g('[data-v]'))) { e.stopPropagation(); return abrirVideo(b.dataset.v, api); }
      if ((b = g('[data-d]'))) return asignarDia(b.dataset.d, sinFecha);
      const a = g('[data-a]')?.dataset.a;
      if (a === 'pdf') { const r = await compartirPlan(P.cli, P.mes); if (r && r !== 'cancelado') savePlan({ estado: 'enviado', enviadoAt: fmt.today() }); }
      if (a === 'ok') { savePlan({ estado: 'aprobado', aprobadoAt: fmt.today() }); toast('✅ Plan aprobado'); }
      if (a === 'cambios') { const t = prompt('¿Qué cambios pidió el cliente?', plan?.cambios || ''); if (t != null) { savePlan({ estado: 'cambios', cambios: t.trim() }); toast('✎ Anotado'); } }
    };
  } };
function asignarDia(d, sinFecha) {
  const body = h(`<div class="form"><div class="list">${sinFecha.map((v) => `<button class="list-item" data-v="${v.id}"><span>🎬</span><div class="li-main"><div class="li-title">${esc(v.title)}</div><div class="li-sub">${EST[estIdx(v.status)][1]}</div></div></button>`).join('') || '<p class="muted">Todos los videos de este cliente ya tienen fecha.</p>'}</div>
    <button class="btn btn-create ghost" data-a="new">＋ Video nuevo para este día</button></div>`);
  const s = sheet(`📅 ${fmt.date(d)}`, body);
  body.onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) { store.update('videos', b.dataset.v, { publishDate: d }); s.close(); return; }
    if (e.target.closest('[data-a=new]')) { const t = prompt('Nombre del video'); if (t?.trim()) { store.add('videos', { title: t.trim(), client: P.cli, status: 'idea', publishDate: d, escenas: [] }); s.close(); } } };
}

// ---------- 📍 Lugares guardados (fotos + mapa base) ----------
const lugMod = fromSchema('lugares', { id: 'lugares', title: 'Lugares', icon: '🏠', single: 'lugar',
  render(el) {
    const ls = store.list('lugares');
    el.innerHTML = `<div class="grid">${ls.map((l) => `<button class="card lug" data-l="${l.id}"><b>📍 ${esc(l.name)}</b><span class="muted" style="font-size:12px">${esc([cname(l.client), l.luz, l.horario].filter(Boolean).join(' · '))}</span><span class="muted" style="font-size:12px">${(l.fotos || []).length} fotos · ${(l.mapa || []).length ? 'con mapa base' : 'sin mapa base'}</span></button>`).join('')}</div>
      ${ls.length ? '' : '<div class="empty"><b>Sin lugares</b>Guarda una vez la barbería, la ferretería…: sus fotos, la luz y el mapa base (puerta, mostrador, silla). Así cada plano nuevo tarda segundos.</div>'}`;
    el.onclick = (e) => { const b = e.target.closest('[data-l]'); if (b) lugarFicha(b.dataset.l); };
  }, onAdd: () => { const n = prompt('Nombre del lugar (ej. Barbería Flow)'); if (n?.trim()) lugarFicha(store.add('lugares', { name: n.trim() }).id); } });
function lugarFicha(id) {
  const body = h('<div class="form lugf"></div>');
  const s = sheet('📍 Lugar', body);
  const paint = () => {
    const l = store.get('lugares', id); if (!l) return s.close();
    s.el.querySelector('.sheet-head h2').textContent = '📍 ' + l.name;
    body.innerHTML = `<div class="kv card">${[['Cliente', cname(l.client)], ['Dirección', l.address], ['Luz', l.luz], ['Enchufes', l.enchufes], ['Mejor horario', l.horario]].map(([k, v]) => `<b>${k}</b><span>${esc(v || '—')}</span>`).join('')}</div>
      <button type="button" class="btn btn-edit ghost sm" data-a="ed">✎ Editar datos</button>
      <div class="sec3">📸 Fotos</div><div class="fotos">${(l.fotos || []).map((f, i) => `<div class="ft"><img data-foto="${i}" alt="Foto ${i + 1} de ${esc(l.name)}"><button type="button" data-fd="${i}" aria-label="Quitar foto">✕</button></div>`).join('')}<label class="ft add">＋<input type="file" accept="image/*" multiple hidden data-a="up"></label></div>
      <div class="sec3">🗺 Mapa base del lugar</div><p class="muted" style="font-size:12px;margin:0">Pon lo que no se mueve (puerta, mostrador, silla, espejo). En cada plano usas este mapa y solo mueves cámara y persona.</p><div class="mapb"></div>
      <button type="button" class="btn btn-delete ghost sm" data-a="del" style="margin-top:8px">🗑 Borrar lugar</button>`;
    pintarFotos(body, l.fotos || []);
    mapaEditor(body.querySelector('.mapb'), l.mapa || [], (items) => store.update('lugares', id, { mapa: items }));
  };
  paint();
  body.addEventListener('change', async (e) => {
    if (e.target.dataset.a !== 'up') return; const files = [...e.target.files].slice(0, 6); if (!files.length) return;
    toast('Subiendo ' + files.length + ' foto(s)…');
    const out = []; for (const f of files) { try { out.push(await subirFoto(f, 'lugares')); } catch (err) { toast(err.message); } }
    const l = store.get('lugares', id); store.update('lugares', id, { fotos: [...(l.fotos || []), ...out] }); paint();
    toast(out.some((x) => x.data) ? '📸 Guardadas en el dispositivo (entra con Google para subirlas a tu nube)' : '📸 Fotos guardadas en tu nube');
  });
  body.addEventListener('click', async (e) => { const a = e.target.closest('[data-a]')?.dataset.a; const fd = e.target.closest('[data-fd]');
    if (fd) { const l = store.get('lugares', id); const f = l.fotos[+fd.dataset.fd]; borrarFoto(f); store.update('lugares', id, { fotos: l.fotos.filter((_, i) => i !== +fd.dataset.fd) }); return paint(); }
    if (a === 'ed') { s.close(); setTimeout(() => openForm(lugMod, store.get('lugares', id)), 280); }
    if (a === 'del' && await confirmSheet('¿Borrar el lugar?', 'Las escenas que lo usan quedan sin lugar.', { yes: 'Borrar', danger: true })) { (store.get('lugares', id).fotos || []).forEach(borrarFoto); store.remove('lugares', id); s.close(); } });
}

// ---------- 📊 Números ----------
const numMod = { id: 'numeros', title: 'Números', icon: '📊',
  render(el) {
    const mes = mesDe(); const vs = store.list('videos');
    const ent = vs.filter((v) => ['entregar', 'publicado'].includes(v.status) && (v.publishDate || v.updatedAt || '').startsWith(mes));
    const porCli = {}; ent.forEach((v) => { const k = cname(v.client) || 'NEXO PC'; porCli[k] = (porCli[k] || 0) + 1; });
    const conH = vs.map((v) => ({ v, h: horas(v.id) })).filter((x) => x.h.total > 0);
    const prom = conH.length ? conH.reduce((a, x) => a + x.h.total, 0) / conH.length : 0;
    const pub = vs.filter((v) => v.results?.views != null);
    const all = pub.length ? pub.reduce((a, v) => a + Number(v.results.views), 0) / pub.length : 0;
    const by = {}; pub.forEach((v) => String(v.tags || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => (by[t] = by[t] || []).push(Number(v.results.views))));
    const tags = Object.entries(by).map(([t, a]) => [t, a.reduce((x, y) => x + y, 0) / a.length, a.length]).sort((a, b) => b[1] - a[1]);
    const ideas = store.list('ideas');
    el.innerHTML = `<div class="grid k"><div class="card kpi"><div class="v num">${ent.length}</div><div class="l">entregados este mes</div></div>
      <div class="card kpi"><div class="v num">${prom ? fmt.hours(Math.round(prom)) : '—'}</div><div class="l">horas promedio por video</div></div>
      <div class="card kpi"><div class="v num">${all ? Math.round(all).toLocaleString('es-CO') : '—'}</div><div class="l">vistas promedio</div></div>
      <div class="card kpi"><div class="v num">${ideas.filter((i) => i.video).length}/${ideas.length}</div><div class="l">ideas que pasaron a video</div></div></div>
      <div class="section"><h2>Entregados por cliente · este mes</h2>${Object.entries(porCli).map(([k, n]) => `<div class="take"><span>${esc(k)}</span><b>${n}</b></div>`).join('') || '<p class="muted">Todavía nada este mes.</p>'}</div>
      <div class="section"><h2>Horas por video</h2>${conH.slice(-8).reverse().map(({ v, h: x }) => `<div class="take"><span>${esc(v.title)} <span class="muted">· guion ${fmt.hours(x.guion)} · grabar ${fmt.hours(x.grabar)} · editar ${fmt.hours(x.editar)}</span></span><b>${fmt.hours(x.total)}</b></div>`).join('') || '<p class="muted">Usa el ⏱ en Grabar y Editar para medir.</p>'}</div>
      <div class="section"><h2>Lo que mejor funciona</h2>${tags.map(([t, a, n]) => `<div class="take"><span>${esc(t)} <span class="muted">· ${n} video(s)</span></span><b>${Math.round(a).toLocaleString('es-CO')} 👁</b></div>`).join('') || '<p class="muted">Anota vistas a los 7 días en 📤 Entregar y pon etiquetas a tus videos.</p>'}</div>`;
  } };

// ---------- biblioteca de antes (se conserva) ----------
const clips = fromSchema('clips', { id: 'clips', title: 'Clips', icon: '🎞', single: 'clip' });
const referencias = fromSchema('references', { id: 'referencias', title: 'Referencias', icon: '📌', single: 'referencia' });
const portafolio = fromSchema('portfolio', { id: 'portafolio', title: 'Portafolio', icon: '🏆', single: 'proyecto' });

migrar();
boot({ appId: 'studio', version: VERSION, home, homeLabel: 'Videos', homeIcon: '🎬', homeAdd: () => nuevoVideo(),
  modules: [ideasMod, grabarMod, planMod, lugMod, numMod, videoPage, portafolio, referencias, clips] });
