// NEXO Studio · tu contenido
import { boot, fromSchema, store, fmt, esc, h, openForm, toast, sheet, openHarvey } from '../../core/shell.js';

const VERSION = '1.0.1';
const ST = [['idea', '💡', 'Idea'], ['guion', '📝', 'Guion'], ['grabado', '🎥', 'Grabado'], ['edicion', '✂️', 'Edición'], ['revision', '👀', 'Revisión'], ['publicado', '✅', 'Publicado']];
const MOLDS = {
  'Gancho-Problema-Solución-CTA': 'GANCHO (0-3 s): \nPROBLEMA (3-10 s): \nSOLUCIÓN (10-40 s): \nCTA (últimos 5 s): ',
  'Antes y después': 'ANTES (cómo era): \nTRANSICIÓN (corte fuerte o efecto): \nDESPUÉS (resultado): \nCTA: ',
  'Top 3': 'GANCHO: "3 ___ que nadie te dice"\n3. \n2. \n1. (el mejor)\nCTA: ',
  'Mito vs realidad': 'MITO: \nPOR QUÉ LA GENTE LO CREE: \nREALIDAD (con dato): \nCTA: ',
  'Unboxing / review': 'GANCHO (resultado o precio): \nQUÉ TRAE: \n3 PUNTOS FUERTES: \n1 PUNTO DÉBIL (honesto): \n¿PARA QUIÉN ES?: \nCTA (dónde comprar): ',
  'Tutorial rápido': 'GANCHO (qué vas a lograr): \nPASO 1: \nPASO 2: \nPASO 3: \nRESULTADO: \nCTA: ',
};
const cname = (id) => store.get('clients', id)?.name || '';

const ideas = fromSchema('ideas', { id: 'ideas', title: 'Ideas', icon: '💡', single: 'idea',
  titleOf: (r) => r.title, subOf: (r) => [r.for, cname(r.client), r.platform].filter(Boolean).map(esc).join(' · '),
  sideOf: (r) => `<button class="btn btn-create sm" data-promote="${r.id}" title="Pasar a video">→ Video</button>`,
  render(el, api) {
    api.renderList(el, { ...ideas, render: null });
    const prev = el.onclick;
    el.onclick = (e) => {
      const p = e.target.closest('[data-promote]');
      if (p) { e.stopPropagation(); const i = store.get('ideas', p.dataset.promote); store.add('videos', { title: i.title, client: i.client, platform: i.platform, status: 'idea' }); store.remove('ideas', i.id); toast('Idea pasó al tablero de videos'); return; }
      prev(e);
    };
  } });

const guiones = fromSchema('scripts', { id: 'guiones', title: 'Guiones', icon: '📝', single: 'guion',
  titleOf: (r) => r.title, subOf: (r) => esc(r.mold || ''),
  onAdd() {
    const body = h(`<div class="list">${Object.keys(MOLDS).map((m) => `<div class="list-item" data-m="${esc(m)}"><span style="font-size:20px">🧩</span><div class="li-main"><div class="li-title">${esc(m)}</div><div class="li-sub">${esc(MOLDS[m].split('\n')[0])}</div></div></div>`).join('')}</div>`);
    const s = sheet('Elige un molde', body);
    body.onclick = (e) => { const it = e.target.closest('[data-m]'); if (!it) return; s.close(); setTimeout(() => openForm(guiones, null, { mold: it.dataset.m, body: MOLDS[it.dataset.m] }), 300); };
  } });

const grabaciones = fromSchema('shoots', { id: 'grabaciones', title: 'Grabaciones', icon: '🎬', single: 'grabación',
  render(el) {
    const list = store.list('shoots').sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    if (!list.length) { el.innerHTML = '<div class="empty"><b>Sin grabaciones agendadas</b>Agenda la próxima con un cliente; aparece sola en tu agenda de NEXO Plan.</div>'; return; }
    el.innerHTML = `<div class="grid">${list.map((s) => { const items = (s.checklist || '').split('\n').map((x) => x.trim()).filter(Boolean); const done = s.checked || [];
      return `<div class="card shoot ${s.date && s.date < fmt.today() ? 'past' : ''}"><div class="row" style="justify-content:space-between"><b>${esc(s.title)}</b><button class="btn btn-edit ghost sm" data-ed="${s.id}">Editar</button></div>
        <div class="muted" style="font-size:13px">${fmt.date(s.date)} ${esc(s.time || '')} · ${esc(cname(s.client))} ${s.place ? '· 📍 ' + esc(s.place) : ''}</div>
        <div class="bar" style="margin:10px 0"><i style="width:${items.length ? (done.length / items.length) * 100 : 0}%"></i></div>
        <div class="ck">${items.map((it, i) => `<button class="ckb ${done.includes(i) ? 'on' : ''}" data-s="${s.id}" data-i="${i}" aria-pressed="${done.includes(i)}">${done.includes(i) ? '✓' : '○'} ${esc(it)}</button>`).join('')}</div></div>`; }).join('')}</div>`;
    el.onclick = (e) => {
      const ed = e.target.closest('[data-ed]'); if (ed) return openForm(grabaciones, store.get('shoots', ed.dataset.ed));
      const b = e.target.closest('.ckb'); if (!b) return;
      const s = store.get('shoots', b.dataset.s); const i = +b.dataset.i; const c = new Set(s.checked || []);
      c.has(i) ? c.delete(i) : c.add(i); store.update('shoots', s.id, { checked: [...c] }); navigator.vibrate?.(8);
    };
  } });

const videos = fromSchema('videos', { id: 'videos', title: 'Videos', icon: '🎞', single: 'video',
  render(el) {
    const vs = store.list('videos');
    el.innerHTML = `<div class="board">${ST.map(([k, e, l]) => { const list = vs.filter((v) => (v.status || 'idea') === k);
      return `<section class="lane"><header><b>${e} ${l}</b><span class="muted num">${list.length}</span></header>
      ${list.map((v) => `<div class="vcard" data-id="${v.id}"><b>${esc(v.title)}</b><span class="muted">${esc([cname(v.client), v.platform].filter(Boolean).join(' · '))}</span>
        ${v.publishDate ? `<span class="chip">📅 ${fmt.date(v.publishDate)}</span>` : ''}
        <div class="row">${k !== 'idea' ? `<button class="mv" data-mv="-1" data-v="${v.id}" aria-label="Atrás">←</button>` : ''}${k !== 'publicado' ? `<button class="mv fwd" data-mv="1" data-v="${v.id}">Siguiente →</button>` : ''}</div></div>`).join('')}</section>`; }).join('')}</div>`;
    el.onclick = (e) => {
      const m = e.target.closest('[data-mv]');
      if (m) { const v = store.get('videos', m.dataset.v); const i = ST.findIndex((s) => s[0] === (v.status || 'idea')); const n = ST[Math.max(0, Math.min(ST.length - 1, i + +m.dataset.mv))][0];
        store.update('videos', v.id, { status: n, ...(n === 'publicado' && !v.publishDate ? { publishDate: fmt.today() } : {}) }); if (n === 'publicado') toast('¡Publicado! Registra sus métricas en 📊'); return; }
      const c = e.target.closest('.vcard'); if (c) openForm(videos, store.get('videos', c.dataset.id));
    };
  } });

let calMonth = fmt.today().slice(0, 7);
const calendario = { id: 'calendario', title: 'Calendario', icon: '🗓',
  render(el) {
    const [y, m] = calMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1); const days = new Date(y, m, 0).getDate(); const pad = (first.getDay() + 6) % 7;
    const vs = store.list('videos').filter((v) => (v.publishDate || '').startsWith(calMonth));
    const sh = store.list('shoots').filter((s) => (s.date || '').startsWith(calMonth));
    el.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:10px"><button class="btn btn-cancel ghost sm" data-m="-1">←</button><b style="text-transform:capitalize">${first.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</b><button class="btn btn-cancel ghost sm" data-m="1">→</button></div>
      <div class="cal">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<span class="dh">${d}</span>`).join('')}${'<span></span>'.repeat(pad)}
      ${[...Array(days)].map((_, i) => { const d = `${calMonth}-${String(i + 1).padStart(2, '0')}`; return `<div class="cd ${d === fmt.today() ? 'today' : ''}"><span class="n">${i + 1}</span>${vs.filter((v) => v.publishDate === d).map((v) => `<i class="ev pub" data-v="${v.id}" title="${esc(v.title)}">${esc(v.title)}</i>`).join('')}${sh.filter((s) => s.date === d).map((s) => `<i class="ev rec" title="${esc(s.title)}">🎥 ${esc(s.title)}</i>`).join('')}</div>`; }).join('')}</div>
      <div class="row muted" style="font-size:12px;margin-top:8px"><span><i class="sw" style="background:var(--accent)"></i>publicación</span><span><i class="sw" style="background:var(--c-pending)"></i>grabación</span></div>`;
    el.onclick = (e) => {
      const b = e.target.closest('[data-m]'); if (b) { const d = new Date(y, m - 1 + +b.dataset.m, 1); calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; this.render(el); return; }
      const v = e.target.closest('[data-v]'); if (v) openForm(videos, store.get('videos', v.dataset.v));
    };
  } };

const referencias = fromSchema('references', { id: 'referencias', title: 'Referencias', icon: '📌', single: 'referencia',
  titleOf: (r) => r.title, subOf: (r) => esc(r.note || r.link || ''), sideOf: (r) => (r.link && /^https:\/\//.test(r.link) ? `<a class="btn btn-edit ghost sm" href="${esc(r.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Abrir ↗</a>` : '') });

const metricas = fromSchema('metrics', { id: 'metricas', title: 'Métricas', icon: '📊', single: 'registro de métricas',
  render(el, api) {
    const ms = store.list('metrics');
    const tot = (k) => ms.reduce((a, x) => a + (Number(x[k]) || 0), 0);
    const best = [...ms].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
    el.innerHTML = `<div class="grid k"><div class="card kpi"><div class="v num">${tot('views').toLocaleString('es-CO')}</div><div class="l">vistas</div></div>
      <div class="card kpi"><div class="v num">${tot('likes').toLocaleString('es-CO')}</div><div class="l">me gusta</div></div>
      <div class="card kpi"><div class="v num">${tot('shares').toLocaleString('es-CO')}</div><div class="l">compartidos</div></div>
      <div class="card kpi"><div class="v num up">+${tot('followers').toLocaleString('es-CO')}</div><div class="l">seguidores</div></div></div>
      <div class="section"><h2>Top videos</h2>${best.map((b, i) => `<div class="list-item" style="cursor:default"><b class="num">${i + 1}</b><div class="li-main"><div class="li-title">${esc(store.get('videos', b.video)?.title || '—')}</div><div class="li-sub">${fmt.date(b.date)}</div></div><div class="li-side">${(b.views || 0).toLocaleString('es-CO')} vistas</div></div>`).join('') || '<p class="muted">Registra las métricas de tus videos publicados.</p>'}</div>
      <div class="section"><h2>Registros</h2><div id="ml"></div></div>
      <p class="muted" style="font-size:13px">🔌 Pronto: estadísticas automáticas de Instagram y TikTok con n8n (ver docs/CONEXIONES.md).</p>`;
    api.renderList(el.querySelector('#ml'), { ...metricas, render: null, titleOf: (r) => store.get('videos', r.video)?.title || 'Video', subOf: (r) => fmt.date(r.date), sideOf: (r) => `${(r.views || 0).toLocaleString('es-CO')} 👁` });
  } });

const portafolio = fromSchema('portfolio', { id: 'portafolio', title: 'Portafolio', icon: '🏆', single: 'proyecto',
  render(el) {
    const ps = store.list('portfolio');
    if (!ps.length) { el.innerHTML = '<div class="empty"><b>Tu portafolio está vacío</b>Agrega tus mejores trabajos con resultados en números. Es lo que convence a un cliente nuevo.</div>'; return; }
    el.innerHTML = `<div class="row" style="margin-bottom:12px"><button class="btn btn-edit" data-a="copy">📋 Copiar portafolio para WhatsApp</button></div>
      <div class="grid">${ps.map((p) => `<div class="card pf ${p.show ? '' : 'hid'}" data-id="${p.id}"><span class="chip">${esc(cname(p.client) || 'Proyecto propio')}</span><b>${esc(p.title)}</b><span class="res">${esc(p.result || '')}</span>${p.show ? '' : '<span class="muted" style="font-size:12px">oculto para clientes</span>'}</div>`).join('')}</div>`;
    el.onclick = async (e) => {
      if (e.target.closest('[data-a=copy]')) {
        const txt = 'Algunos trabajos recientes 👇\n\n' + ps.filter((p) => p.show).map((p) => `▸ ${p.title}${cname(p.client) ? ' (' + cname(p.client) + ')' : ''}${p.result ? ' — ' + p.result : ''}${p.link ? '\n  ' + p.link : ''}`).join('\n') + '\n\n— Cristóbal · NEXO';
        try { await navigator.clipboard.writeText(txt); toast('Copiado'); } catch { toast('No se pudo copiar'); }
        return;
      }
      const c = e.target.closest('.pf'); if (c) openForm(portafolio, store.get('portfolio', c.dataset.id));
    };
  } });

function home(el) {
  const vs = store.list('videos');
  const upcoming = store.list('shoots').filter((s) => s.date >= fmt.today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const wk = new Date(); wk.setDate(wk.getDate() + 7); const wkIso = wk.toISOString().slice(0, 10);
  const pubs = vs.filter((v) => v.publishDate && v.publishDate >= fmt.today() && v.publishDate <= wkIso && v.status !== 'publicado');
  el.innerHTML = `<div class="page-title"><h1>Tu contenido</h1><button class="btn btn-ai sm" data-a="ideas">🟣 Mike: 5 ideas de videos</button></div>
    <div class="pipe">${ST.map(([k, e, l]) => `<button class="pp" data-go="videos"><span>${e}</span><b class="num">${vs.filter((v) => (v.status || 'idea') === k).length}</b><small>${l}</small></button>`).join('')}</div>
    <div class="grid section">
      <div class="card"><h3>🎬 Próximas grabaciones</h3>${upcoming.map((s) => `<div style="padding:4px 0"><b>${fmt.date(s.date)} ${esc(s.time || '')}</b> · ${esc(s.title)} <span class="muted">${esc(cname(s.client))}</span></div>`).join('') || '<p class="muted" style="margin:0">Nada agendado</p>'}</div>
      <div class="card"><h3>📅 Para publicar esta semana</h3>${pubs.map((v) => `<div style="padding:4px 0"><b>${fmt.date(v.publishDate)}</b> · ${esc(v.title)} <span class="chip">${esc(ST.find((s) => s[0] === v.status)?.[2] || '')}</span></div>`).join('') || '<p class="muted" style="margin:0">Sin publicaciones programadas</p>'}</div>
      <div class="card"><h3>💡 Banco de ideas</h3><div class="v num" style="font:700 30px var(--display)">${store.list('ideas').length}</div><p class="muted" style="margin:0">ideas guardadas · ${store.list('references').length} referencias</p></div>
    </div>`;
  el.onclick = (e) => {
    if (e.target.closest('[data-a=ideas]')) return openHarvey('Mike: dame 5 ideas de videos cortos para NEXO PC (hardware y gaming en Quibdó) con gancho de 3 segundos. Si te digo cuáles, guárdalas en mi banco de ideas.');
    const g = e.target.closest('[data-go]'); if (g) document.querySelector(`[data-nav="${g.dataset.go}"]`)?.click();
  };
}

boot({ appId: 'studio', version: VERSION, home, modules: [videos, ideas, guiones, grabaciones, calendario, metricas, portafolio, referencias] });
