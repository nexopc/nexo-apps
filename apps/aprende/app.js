// NEXO Aprende · tu estudio
import { boot, fromSchema, store, fmt, esc, h, openForm, toast, sheet, openHarvey, prefs } from '../../core/shell.js';

const VERSION = '1.0.0';
const INTERVAL = [1, 2, 4, 8, 16]; // días por caja (sistema Leitner)
const sname = (id) => store.get('subjects', id)?.name || '';
const daysTo = (d) => Math.round((new Date(d + 'T12:00') - new Date(fmt.today() + 'T12:00')) / 864e5);
function avg(subjectId) {
  const gs = store.list('grades').filter((g) => !subjectId || g.subject === subjectId);
  const w = gs.reduce((a, g) => a + (Number(g.weight) || 100), 0);
  return w ? gs.reduce((a, g) => a + (Number(g.value) || 0) * (Number(g.weight) || 100), 0) / w : null;
}
const gradeColor = (v) => (v == null ? 'var(--muted)' : v >= 4 ? 'var(--c-create)' : v >= 3 ? 'var(--c-pending)' : 'var(--c-delete)');
const dueCards = () => store.list('flashcards').filter((c) => !c.nextDate || c.nextDate <= fmt.today());

// Rutas sugeridas (se cargan con un botón; luego las editas)
const SUGGESTED = {
  'Filmora 16': ['Interfaz y atajos básicos', 'Cortes: dividir, recortar, ripple delete', 'Textos y títulos animados', 'Transiciones con criterio', 'Audio: música, voz, ducking', 'Corrección de color básica', 'Subtítulos automáticos (AI)', 'Plantillas y keyframes', 'Exportar para TikTok/Reels 1080×1920', 'Proyecto final: video para un cliente'],
  'Claude Code': ['Qué es y cómo pedirle tareas', 'Git y GitHub básico', 'HTML y CSS: leer una página', 'JavaScript: variables, funciones, eventos', 'Publicar una web en GitHub Pages', 'Firebase: login y base de datos', 'Modificar una app NEXO tú mismo', 'Proyecto: app de catálogo de tiendas'],
  'Marketing digital': ['Buyer persona de una tienda en Quibdó', 'Ganchos y guiones para videos cortos', 'Calendario de contenido', 'Meta Business Suite e Instagram profesional', 'Pauta básica (Meta Ads) con $20.000', 'Métricas que importan', 'Cómo cobrar y armar paquetes', 'Reporte mensual para clientes'],
  'Saber 11': ['Lectura crítica: tipos de texto', 'Matemáticas: proporciones y porcentajes', 'Matemáticas: álgebra y funciones', 'Ciencias naturales: química básica', 'Ciencias naturales: física (movimiento, energía)', 'Sociales y ciudadanas: Constitución', 'Inglés: comprensión lectora', 'Simulacro completo 1', 'Simulacro completo 2'],
};

const materias = fromSchema('subjects', { id: 'materias', title: 'Materias', icon: '🏫', single: 'materia',
  render(el) {
    const ss = store.list('subjects');
    if (!ss.length) { el.innerHTML = '<div class="empty"><b>Agrega tus materias</b>Con tus notas y su porcentaje te calculo el promedio y cuánto necesitas para pasar.</div>'; return; }
    el.innerHTML = `<div class="grid">${ss.map((s) => { const a = avg(s.id); const gs = store.list('grades').filter((g) => g.subject === s.id); const used = gs.reduce((x, g) => x + (Number(g.weight) || 0), 0);
      const need = used < 100 && a != null ? Math.max(0, (3.0 * 100 - a * used) / (100 - used)) : null;
      const next = store.list('exams').filter((e) => e.subject === s.id && e.date >= fmt.today()).sort((x, y) => x.date.localeCompare(y.date))[0];
      return `<button class="card subj" data-id="${s.id}" style="--k:${esc(s.color || 'var(--accent)')}"><div class="row" style="justify-content:space-between"><b>${esc(s.name)}</b><span class="gr num" style="color:${gradeColor(a)}">${a == null ? '—' : a.toFixed(1)}</span></div>
        <span class="muted" style="font-size:13px">${gs.length} notas · ${used}% evaluado${need != null ? ` · necesitas <b style="color:${need > 5 ? 'var(--c-delete)' : 'var(--fg)'}">${need.toFixed(1)}</b> en lo que falta para 3.0` : ''}</span>
        ${next ? `<span class="chip s-pending">📝 ${esc(next.title)} en ${daysTo(next.date)} d</span>` : ''}</button>`; }).join('')}</div>`;
    el.onclick = (e) => { const c = e.target.closest('.subj'); if (c) openForm(materias, store.get('subjects', c.dataset.id)); };
  } });

const notas = fromSchema('grades', { id: 'notas', title: 'Notas', icon: '💯', single: 'nota',
  sort: (a, b) => (b.date || '').localeCompare(a.date || ''),
  titleOf: (r) => r.title, subOf: (r) => `${esc(sname(r.subject))} · ${r.weight || 100}% · ${fmt.date(r.date)}`,
  sideOf: (r) => `<b class="num" style="color:${gradeColor(r.value)}">${Number(r.value || 0).toFixed(1)}</b>` });

const parciales = fromSchema('exams', { id: 'parciales', title: 'Parciales', icon: '📝', single: 'evaluación',
  filter: (r) => r.date >= fmt.today(), sort: (a, b) => a.date.localeCompare(b.date),
  titleOf: (r) => r.title, subOf: (r) => `${esc(sname(r.subject))} · ${fmt.date(r.date)} · se agenda solo en NEXO Plan`,
  sideOf: (r) => { const d = daysTo(r.date); return `<span class="chip ${d <= 2 ? 's-delete' : d <= 7 ? 's-pending' : ''}">${d === 0 ? 'HOY' : d + ' d'}</span>`; },
  emptyTitle: 'Sin evaluaciones próximas', emptyText: 'Agrega tus parciales y quizzes: te recuerdo y te armo un plan de estudio.' });

let routeSel = null;
const rutas = fromSchema('routes', { id: 'rutas', title: 'Rutas', icon: '🧗', single: 'paso',
  render(el) {
    const rs = store.list('routes');
    const names = [...new Set([...Object.keys(SUGGESTED), ...rs.map((r) => r.route).filter(Boolean)])];
    routeSel = routeSel || names[0];
    const steps = rs.filter((r) => r.route === routeSel).sort((a, b) => (a.order || 0) - (b.order || 0));
    const done = steps.filter((s) => s.done).length;
    el.innerHTML = `<div class="tabs">${names.map((n) => { const st = rs.filter((r) => r.route === n); return `<button data-r="${esc(n)}" aria-pressed="${n === routeSel}">${esc(n)} ${st.length ? `<span class="num">${Math.round((st.filter((s) => s.done).length / st.length) * 100)}%</span>` : ''}</button>`; }).join('')}</div>
      ${steps.length ? `<div class="bar" style="margin-bottom:12px"><i style="width:${(done / steps.length) * 100}%"></i></div>
      <ol class="route">${steps.map((s, i) => `<li class="${s.done ? 'ok' : !steps.slice(0, i).some((x) => !x.done) ? 'cur' : ''}"><button class="rc" data-tog="${s.id}" aria-pressed="${!!s.done}">${s.done ? '✓' : i + 1}</button><div class="rt" data-ed="${s.id}"><b>${esc(s.title)}</b>${s.link && /^https:\/\//.test(s.link) ? ` <a href="${esc(s.link)}" target="_blank" rel="noopener">recurso ↗</a>` : ''}</div></li>`).join('')}</ol>`
      : `<div class="empty"><b>Ruta vacía</b>${SUGGESTED[routeSel] ? `<button class="btn btn-create sm" data-load style="margin-top:10px">＋ Cargar ruta sugerida (${SUGGESTED[routeSel].length} pasos)</button>` : 'Agrega pasos con ＋'}</div>`}
      <div class="row section"><button class="btn btn-ai" data-a="mike">🟣 Mike: ¿qué estudio hoy de esta ruta?</button></div>`;
    el.onclick = (e) => {
      const r = e.target.closest('[data-r]'); if (r) { routeSel = r.dataset.r; this.render(el); return; }
      if (e.target.closest('[data-load]')) { SUGGESTED[routeSel].forEach((t, i) => store.add('routes', { title: t, route: routeSel, order: i + 1, done: false })); toast('Ruta cargada'); return; }
      const t = e.target.closest('[data-tog]'); if (t) { const s = store.get('routes', t.dataset.tog); store.update('routes', s.id, { done: !s.done }); navigator.vibrate?.(10); return; }
      const ed = e.target.closest('[data-ed]'); if (ed && !e.target.closest('a')) return openForm(rutas, store.get('routes', ed.dataset.ed));
      if (e.target.closest('[data-a=mike]')) openHarvey(`Mike: en mi ruta "${routeSel}" voy en el paso ${done + 1}. Dame una mini lección de 20 minutos para hoy y agéndame el bloque de estudio.`);
    };
  },
  preset: () => ({ route: routeSel, order: store.list('routes').filter((r) => r.route === routeSel).length + 1 }) });

const ingles = fromSchema('english', { id: 'ingles', title: 'Inglés', icon: '🇺🇸', single: 'palabra',
  titleOf: (r) => r.term, subOf: (r) => esc([r.meaning, r.example].filter(Boolean).join(' — ')), sideOf: (r) => (r.level ? `<span class="chip">${esc(r.level)}</span>` : ''),
  render(el, api) {
    el.innerHTML = `<div class="row" style="margin-bottom:12px"><button class="btn btn-create ghost" data-a="cards">🃏 Pasar todo a tarjetas de repaso</button><button class="btn btn-ai ghost" data-a="practice">🟣 Practicar conversación con Mike</button></div><div id="el"></div>`;
    api.renderList(el.querySelector('#el'), { ...ingles, render: null });
    el.querySelector('.row').onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'cards') { let n = 0; for (const w of store.list('english')) { const id = 'en-' + w.id; if (!store.get('flashcards', id)) { store.add('flashcards', { id, front: w.term, back: [w.meaning, w.example].filter(Boolean).join(' — '), deck: 'Inglés', box: 1 }); n++; } } toast(`${n} tarjetas nuevas`); }
      if (a === 'practice') openHarvey('Mike: practiquemos inglés nivel A2-B1. Hazme 1 pregunta a la vez sobre tecnología y computadores, corrígeme con amabilidad y guarda en mi vocabulario las palabras nuevas.');
    };
  } });

// Tarjetas de repaso (Leitner)
let study = null;
const tarjetas = fromSchema('flashcards', { id: 'tarjetas', title: 'Tarjetas', icon: '🃏', single: 'tarjeta',
  render(el, api) {
    if (study) return renderStudy(el, api);
    const due = dueCards();
    const decks = [...new Set(store.list('flashcards').map((c) => c.deck || 'General'))];
    el.innerHTML = `<div class="card studyc"><div><div class="v num" style="font:700 36px var(--display)">${due.length}</div><div class="muted">tarjetas para repasar hoy</div></div>
        <button class="btn btn-create" data-a="go" ${due.length ? '' : 'disabled'}>▶ Repasar</button></div>
      <div class="boxes section">${[1, 2, 3, 4, 5].map((b) => `<div><b class="num">${store.list('flashcards').filter((c) => (c.box || 1) === b).length}</b><span>Caja ${b}</span><small>cada ${INTERVAL[b - 1]} d</small></div>`).join('')}</div>
      <p class="muted" style="font-size:13px">Mazos: ${decks.map(esc).join(', ') || '—'}. Si la sabes, sube de caja y la ves menos; si no, vuelve a la caja 1.</p><div id="fl"></div>`;
    api.renderList(el.querySelector('#fl'), { ...tarjetas, render: null, titleOf: (r) => r.front, subOf: (r) => `${esc(r.deck || 'General')} · caja ${r.box || 1}`, sideOf: (r) => (r.nextDate && r.nextDate > fmt.today() ? fmt.date(r.nextDate) : '<span class="chip s-pending">hoy</span>') });
    el.querySelector('[data-a=go]').onclick = () => { study = { queue: due.map((c) => c.id).sort(() => Math.random() - 0.5), flipped: false, ok: 0, bad: 0 }; api.paint(); };
  } });
function renderStudy(el, api) {
  const id = study.queue[0];
  if (!id) { el.innerHTML = `<div class="card" style="text-align:center"><h2>¡Listo! 🎉</h2><p class="num">✓ ${study.ok} · ✕ ${study.bad}</p><button class="btn btn-cancel" data-a="end">Terminar</button></div>`; el.querySelector('[data-a=end]').onclick = () => { study = null; api.paint(); }; return; }
  const c = store.get('flashcards', id);
  el.innerHTML = `<p class="muted num">${study.queue.length} restantes · ${esc(c.deck || 'General')}</p>
    <button class="flash ${study.flipped ? 'flipped' : ''}" data-a="flip"><span class="front">${esc(c.front)}</span><span class="back">${esc(c.back)}</span></button>
    <div class="row" style="justify-content:center;margin-top:16px">${study.flipped ? '<button class="btn btn-delete" data-a="no">✕ No la sabía</button><button class="btn btn-create" data-a="yes">✓ La sabía</button>' : '<button class="btn btn-edit" data-a="flip">Ver respuesta</button>'}
    <button class="btn btn-cancel ghost" data-a="stop">Salir</button></div>`;
  el.onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'flip') { study.flipped = !study.flipped; renderStudy(el, api); return; }
    if (a === 'stop') { study = null; api.paint(); return; }
    const box = a === 'yes' ? Math.min(5, (c.box || 1) + 1) : 1;
    const next = new Date(); next.setDate(next.getDate() + INTERVAL[box - 1]);
    study.queue.shift(); study.flipped = false; a === 'yes' ? study.ok++ : study.bad++;
    if (a === 'no') study.queue.push(c.id);
    store.update('flashcards', c.id, { box, nextDate: next.toISOString().slice(0, 10) });
    navigator.vibrate?.(a === 'yes' ? 10 : [10, 40, 10]);
  };
}

const apuntes = fromSchema('notes', { id: 'apuntes', title: 'Apuntes', icon: '🗒', single: 'apunte',
  titleOf: (r) => r.title, subOf: (r) => `${esc(sname(r.subject))} · ${esc((r.body || '').slice(0, 70))}`,
  sideOf: (r) => `<button class="btn btn-ai ghost sm" data-cards="${r.id}">🃏</button>`,
  render(el, api) {
    api.renderList(el, { ...apuntes, render: null });
    const prev = el.onclick;
    el.onclick = (e) => { const b = e.target.closest('[data-cards]'); if (b) { e.stopPropagation(); const n = store.get('notes', b.dataset.cards); return openHarvey(`Mike: convierte este apunte de ${sname(n.subject) || 'clase'} en 6 tarjetas de repaso y guárdalas (colección flashcards, mazo "${sname(n.subject) || n.title}"):\n\n${n.body || n.title}`); } prev(e); };
  } });

function home(el) {
  const a = avg();
  const exams = store.list('exams').filter((e) => e.date >= fmt.today()).sort((x, y) => x.date.localeCompare(y.date)).slice(0, 4);
  const saber = prefs.get('saberDate', '');
  const rs = store.list('routes');
  const routes = [...new Set(rs.map((r) => r.route))].map((n) => { const st = rs.filter((r) => r.route === n); return { n, p: Math.round((st.filter((s) => s.done).length / st.length) * 100) }; });
  el.innerHTML = `<div class="page-title"><h1>Tu estudio</h1><button class="btn btn-ai sm" data-a="plan">🟣 Mike: plan de estudio</button></div>
    <div class="grid k"><div class="card kpi"><div class="v num" style="color:${gradeColor(a)}">${a == null ? '—' : a.toFixed(2)}</div><div class="l">promedio general</div></div>
      <div class="card kpi"><div class="v num">${dueCards().length}</div><div class="l">tarjetas para hoy</div></div>
      <div class="card kpi" data-a="saber" style="cursor:pointer"><div class="v num">${saber ? daysTo(saber) + ' d' : '＋'}</div><div class="l">${saber ? 'para el Saber 11' : 'poner fecha del Saber 11'}</div></div></div>
    <div class="grid section">
      <div class="card"><h3>📝 Próximas evaluaciones</h3>${exams.map((e) => { const d = daysTo(e.date); return `<div class="row" style="justify-content:space-between;padding:4px 0"><span>${esc(e.title)} <span class="muted">${esc(sname(e.subject))}</span></span><span class="chip ${d <= 2 ? 's-delete' : d <= 7 ? 's-pending' : ''}">${d === 0 ? 'HOY' : d + ' d'}</span></div>`; }).join('') || '<p class="muted" style="margin:0">Nada próximo</p>'}</div>
      <div class="card"><h3>🧗 Rutas</h3>${routes.map((r) => `<div style="padding:4px 0"><div class="row" style="justify-content:space-between"><span>${esc(r.n)}</span><span class="num">${r.p}%</span></div><div class="bar"><i style="width:${r.p}%"></i></div></div>`).join('') || '<p class="muted" style="margin:0">Carga una ruta sugerida en 🧗 Rutas</p>'}</div>
      <div class="card"><h3>🎓 Meta universidad</h3><p style="margin:0">Ingeniería en Nanotecnología</p><p class="muted" style="margin:4px 0 0;font-size:13px">Pídele a Mike qué universidades la ofrecen en Colombia, qué puntaje piden y qué necesitas reforzar.</p></div>
    </div>`;
  el.onclick = (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'plan') openHarvey('Mike: revisa mis próximas evaluaciones, notas y rutas. Arma mi plan de estudio para esta semana y agenda los bloques en mi horario (confirmaré cada uno).');
    if (a === 'saber') { const body = h(`<form class="form"><div class="field"><label for="sd">Fecha del Saber 11</label><input id="sd" type="date" value="${esc(saber)}"></div><div class="row end"><button class="btn btn-create">Guardar</button></div></form>`); const s = sheet('Saber 11', body); body.onsubmit = (ev) => { ev.preventDefault(); prefs.set('saberDate', body.sd.value); s.close(); document.querySelector('[data-nav=home]').click(); }; }
  };
}

boot({ appId: 'aprende', version: VERSION, home, modules: [materias, parciales, notas, rutas, tarjetas, ingles, apuntes] });
