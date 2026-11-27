// Harvey · tu asistente — chat y voz, lectura de las 5 apps, resúmenes, alertas, cerebros y conexiones.
import { boot, store, fmt, esc, prefs } from '../../core/shell.js';
import { cloud } from '../../core/sync.js';
import { APPS, LOGOS } from '../../core/registry.js';
import { SCHEMA } from '../../core/schema.js';

const VERSION = '2.1.0';
const initialQ = location.hash.startsWith('#q=') ? decodeURIComponent(location.hash.slice(3)) : '';
if (initialQ) history.replaceState(null, '', '#home');
const harvey = () => import('../../core/harvey.js');

function home(el) {
  el.innerHTML = '<div class="chat-full"></div>';
  harvey().then(({ mountChat }) => {
    mountChat(el.querySelector('.chat-full'), { appId: 'harvey', initial: home.q || '' });
    home.q = '';
    el.querySelector('.hv')?.classList.add('full');
  });
}
home.q = initialQ;


const linkOf = (app) => (APPS.find((a) => a.id === app)?.external ? APPS.find((a) => a.id === app).path : '../../apps/' + app + '/index.html');
const ask = (q) => { home.q = q; document.querySelector('[data-nav=home]').click(); };

const resumen = { id: 'resumen', title: 'Hoy en NEXO', icon: '☀️',
  async render(el) {
    const { snapshot } = await harvey();
    const s = snapshot();
    el.innerHTML = `<p class="muted" style="margin:0 0 12px;text-transform:capitalize">${esc(s.dia)} · ${s.hora} — resumen calculado sin usar IA</p>
      <div class="grid">
        <div class="card"><h3>💜 Donna · tu día</h3>${s.horario_hoy.map((b) => `<div style="padding:2px 0" class="num">${esc(b)}</div>`).join('') || '<p class="muted" style="margin:0">Sin bloques hoy. Arma tu horario base en NEXO Plan.</p>'}
          ${s.eventos_proximos.length ? `<h3 style="margin-top:12px">📅 Próximo</h3>${s.eventos_proximos.slice(0, 4).map((e) => `<div class="muted" style="padding:2px 0">${esc(e)}</div>`).join('')}` : ''}</div>
        <div class="card"><h3>✅ Pendientes (${s.tareas_pendientes.length})</h3>${s.tareas_pendientes.slice(0, 6).map((t) => `<div style="padding:2px 0">${t.p === 'alta' ? '🔴' : t.p === 'baja' ? '🟢' : '🟡'} ${esc(t.t)}</div>`).join('') || '<p class="muted" style="margin:0">Todo al día</p>'}</div>
        <div class="card"><h3>📊 Louis · la plata</h3>${s.saldos.map((a) => `<div class="row" style="justify-content:space-between"><span>${esc(a.cuenta)}</span><b class="num">${a.moneda && a.moneda !== 'COP' ? esc(a.moneda) + ' ' + a.saldo : fmt.money(a.saldo)}</b></div>`).join('') || '<p class="muted" style="margin:0">Sin cuentas</p>'}
          <p class="num" style="margin:8px 0 0"><span class="up">+${fmt.money(s.mes.ingresos)}</span> · <span class="down">−${fmt.money(s.mes.gastos)}</span> este mes</p></div>
        <div class="card"><h3>📚 Mike · estudio</h3>${s.estudio_semana.map((e) => `<div style="padding:2px 0;font-size:14px">${esc(e)}</div>`).join('')}${s.parciales_proximos.map((e) => `<div style="padding:2px 0">📝 ${esc(e)}</div>`).join('') || (s.estudio_semana.length ? '' : '<p class="muted" style="margin:0">Sin temas ni evaluaciones</p>')}</div>
        <div class="card"><h3>⚖️ Harvey · negocio</h3>${s.cobros_pendientes.length ? s.cobros_pendientes.map((c) => `<div>🧾 ${esc(c)}</div>`).join('') : '<p class="muted" style="margin:0">Sin cobros pendientes</p>'}</div>
      </div>
      <div class="row section"><button class="btn btn-ai" data-q="Dame el resumen de hoy: qué tengo, qué está pendiente y qué hago primero.">🟣 Que Donna me lo explique</button>
        <button class="btn btn-ai ghost" data-q="Consejo: haz mi revisión semanal completa (horario, plata, negocio, estudio, contenido) y dame las 3 prioridades de la próxima semana.">🏛 Revisión semanal del bufete</button></div>`;
    el.onclick = (e) => { const q = e.target.closest('[data-q]')?.dataset.q; if (q) ask(q); };
  } };

const avisosMod = { id: 'avisos', title: 'Avisos', icon: '🔔',
  async render(el) {
    const { avisos } = await import('../../core/avisos.js');
    const list = avisos();
    const BR = { harvey: ['⚖️', 'Harvey'], donna: ['💜', 'Donna'], louis: ['📊', 'Louis'], mike: ['📚', 'Mike'], jessica: ['👑', 'Jessica'] };
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    el.innerHTML = `${perm === 'default' ? '<div class="card" style="margin-bottom:12px"><b>🔔 Activa las notificaciones</b><p class="muted" style="margin:4px 0 10px;font-size:13px">Una vez al día, si hay algo importante, te llega un aviso al abrir cualquier app NEXO.</p><button class="btn btn-pending sm" data-a="perm">Activar notificaciones</button></div>' : perm === 'denied' ? '<p class="muted" style="font-size:13px">Las notificaciones están bloqueadas en este dispositivo (actívalas en los ajustes del navegador). Los avisos igual se ven aquí y en el chat.</p>' : ''}
      ${list.length ? `<div class="list">${list.map((a) => `<a class="list-item" href="${linkOf(a.app)}" style="text-decoration:none;color:inherit"><span style="font-size:20px">${a.icon}</span><div class="li-main" style="white-space:normal"><div class="li-title" style="white-space:normal">${esc(a.text)}</div><div class="li-sub">${BR[a.brain][0]} ${BR[a.brain][1]}</div></div><span class="chip ${a.sev === 'alta' ? 's-delete' : 's-pending'}">${a.sev}</span></a>`).join('')}</div>
        <div class="row section"><button class="btn btn-ai" data-a="fix">🏛 Que el bufete me diga por dónde empiezo</button></div>`
      : '<div class="empty"><b>Sin avisos</b>Vas al día en tus apps. Los cerebros revisan todo cada vez que abres una app.</div>'}
      <p class="muted" style="font-size:12px;margin-top:14px">Los avisos se calculan en tu dispositivo, sin gastar IA. Cada día, el primer reporte queda en el chat de Harvey para todos tus dispositivos.</p>`;
    el.onclick = async (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'perm') { const r = await Notification.requestPermission(); if (r === 'granted') { const { notify } = await import('../../core/avisos.js'); notify('NEXO', 'Listo: así te llegarán los avisos de los cerebros.'); } this.render(el); }
      if (a === 'fix') ask('Consejo: revisa mis avisos de hoy y dime en qué orden los resuelvo, con la primera acción concreta.');
    };
  } };

// ---------- Mi vida en números (semana) ----------
let vidaWeek = 0;
const vida = { id: 'vida', title: 'Mi vida', icon: '📈',
  async render(el) {
    const P = await import('../../core/planner.js');
    const mon = P.addDays(P.mondayOf(fmt.today()), vidaWeek * 7), sun = P.addDays(mon, 6);
    const inW = (d) => d && d >= mon && d <= sun;
    const logs = store.list('timeLogs').filter((l) => inW(l.date));
    const mins = (k) => logs.filter((l) => (l.kind || 'trabajo') === k).reduce((a, l) => a + (+l.minutes || 0), 0);
    const tx = store.list('transactions').filter((t) => inW(t.date));
    const sum = (k) => tx.filter((t) => t.type === k).reduce((a, t) => a + (+t.amount || 0), 0);
    let blocks = 0, done = 0;
    for (const w of (store.raw('planBridge')[0]?.cumplimiento_semana || [])) if (inW(w.fecha) && w.fecha <= fmt.today()) { blocks += Number(w.bloques) || 0; done += Number(w.hechos) || 0; } // de NEXO PLAN
    const tareas = store.list('tareas').filter((t) => t.done && inW((t.doneAt || '').slice(0, 10))).length;
    const vids = store.list('videos').filter((v) => v.status === 'publicado' && inW(v.publishDate)).length;
    const regs = store.list('registroDiario').filter((r) => inW(r.date));
    const contactos = regs.reduce((a, r) => a + (+r.contactos || 0), 0);
    const h = (m) => (m / 60).toFixed(1).replace('.0', '') + ' h';
    const k = (v, l, cls = '') => `<div class="card kpi"><div class="v num ${cls}">${v}</div><div class="l">${l}</div></div>`;
    el.innerHTML = `<div class="daynav" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><button class="btn btn-cancel ghost sm" data-w="-1" aria-label="Semana anterior">‹</button><b>${vidaWeek === 0 ? 'Esta semana' : 'Semana del ' + fmt.date(mon)}</b><button class="btn btn-cancel ghost sm" data-w="1" ${vidaWeek >= 0 ? 'disabled' : ''} aria-label="Semana siguiente">›</button></div>
      <div class="grid k">${k(h(mins('trabajo')), '⏱ trabajo medido')}${k(h(mins('estudio')), '📚 estudio medido')}${k(blocks ? Math.round((done / blocks) * 100) + '%' : '—', '🗓 bloques cumplidos')}${k(tareas, '✅ tareas hechas')}</div>
      <div class="grid k section">${k(fmt.money(sum('ingreso')), '💰 entró', 'up')}${k(fmt.money(sum('gasto')), '💸 gastaste', 'down')}${k(vids, '🎬 videos entregados')}${k(contactos, '📞 contactos nuevos')}</div>
      ${mins('trabajo') && sum('ingreso') ? `<p class="muted" style="font-size:13px">Esta semana tu hora de trabajo valió <b style="color:var(--fg)">${fmt.money(Math.round(sum('ingreso') / (mins('trabajo') / 60)))}</b> (lo que entró ÷ horas medidas).</p>` : '<p class="muted" style="font-size:13px">Usa el cronómetro (⏱) al trabajar y estudiar: así Mike puede medir tu semana de verdad.</p>'}
      <div class="row section"><button class="btn btn-ai" data-a="mike">📚 Mike: ¿qué patrón ves en mi semana?</button></div>`;
    el.onclick = (e) => {
      const w = e.target.closest('[data-w]'); if (w) { vidaWeek = Math.min(0, vidaWeek + Number(w.dataset.w)); this.render(el); return; }
      if (e.target.closest('[data-a=mike]')) ask('Mike: analiza mi semana (horas de trabajo y estudio, bloques cumplidos, plata, videos y contactos). Dime el patrón que ves y un cambio concreto para la próxima semana. Si descubres algo estable de cómo trabajo, guárdalo con recordar.');
    };
  } };

const cerebros = { id: 'cerebros', title: 'Cerebros', icon: '🧠',
  async render(el) {
    const { BRAINS } = await harvey();
    const mode = prefs.get('brainMode', 'auto');
    el.innerHTML = `<p class="muted" style="margin:0 0 12px">Cada cerebro está inspirado en un personaje de Suits y sabe de un área. Toca uno para hablar solo con él, o escribe varios nombres en el chat para que respondan juntos.</p>
      <div class="grid">${Object.entries(BRAINS).map(([kk, b]) => `<button class="card brain ${mode === kk ? 'sel' : ''}" data-b="${kk}" style="--k:${b.color}"><span class="av">${b.emoji}</span><b>${b.name}</b><span class="chip" style="color:${b.color}">${esc(b.role)}</span><span class="muted" style="font-size:13px">${esc(b.area)}</span></button>`).join('')}
      <button class="card brain ${mode === 'consejo' ? 'sel' : ''}" data-b="consejo" style="--k:#A77BFF"><span class="av">🏛</span><b>Bufete completo</b><span class="muted" style="font-size:13px">Harvey, Donna, Louis y Mike opinan en una línea cada uno y Jessica decide la acción.</span></button>
      <button class="card brain ${mode === 'auto' ? 'sel' : ''}" data-b="auto" style="--k:#8E99AD"><span class="av">✨</span><b>Automático</b><span class="muted" style="font-size:13px">Harvey elige quién responde según el tema.</span></button></div>
      <div class="card section"><b>🏛 Varios a la vez</b><p class="muted" style="margin:4px 0 10px;font-size:13px">Ejemplo: "Louis, Harvey y Mike: ¿qué pasaría si bajo la página web a $1.200.000?"</p><button class="btn btn-ai sm" data-q="Louis, Harvey y Mike: ¿qué pasaría si ">Probar</button></div>`;
    el.onclick = (e) => {
      const q = e.target.closest('[data-q]'); if (q) { home.q = ''; prefs.set('hvDraft', q.dataset.q); document.querySelector('[data-nav=home]').click(); setTimeout(() => { const ta = document.querySelector('.hv-input textarea'); if (ta) { ta.value = q.dataset.q; ta.focus(); } }, 400); return; }
      const b = e.target.closest('[data-b]'); if (b) { prefs.set('brainMode', b.dataset.b); document.querySelector('[data-nav=home]').click(); }
    };
  } };

const memoria = { id: 'memoria', title: 'Lo que sé de ti', icon: '🗂',
  render(el) {
    const facts = store.list('memoria').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const BRN = { harvey: '⚖️', donna: '💜', louis: '📊', mike: '📚', jessica: '👑' };
    el.innerHTML = `<div class="section" style="margin-top:0"><h2>🧠 Lo que los cerebros aprendieron</h2>
      <form class="nq" data-add style="margin-bottom:10px"><input name="q" placeholder="Enséñales algo: «rindo más grabando en la tarde»" autocomplete="off"><button class="btn btn-create sm">＋</button></form>
      ${facts.length ? `<div class="list">${facts.map((f) => `<div class="list-item" style="cursor:default"><span style="font-size:18px">${BRN[f.brain] || '🧠'}</span><div class="li-main" style="white-space:normal"><div class="li-title" style="white-space:normal">${esc(f.text)}</div><div class="li-sub">${fmt.date((f.createdAt || '').slice(0, 10))}</div></div><button class="btn btn-delete ghost sm" data-del="${f.id}" aria-label="Olvidar">Olvidar</button></div>`).join('')}</div>`
        : '<p class="muted">Todavía nada. Cuando Harvey descubra algo útil de ti te pedirá permiso para recordarlo (tarjeta Sí / No), o escríbelo arriba.</p>'}</div>
      <div class="section"><h2>📦 Tus datos en NEXO Brain</h2><div class="grid">${APPS.filter((a) => a.id !== 'harvey').map((a) => `<a class="card appc" href="${a.external ? a.path : '../../' + a.path}" style="--k:${a.accent}"><div class="row"><span class="ic">${LOGOS[a.id] || LOGOS.custom}</span><b>${esc(a.name)}</b></div>
        ${a.cols.filter((c) => SCHEMA[c] && !SCHEMA[c].hidden).map((c) => `<div class="row" style="justify-content:space-between;font-size:13px"><span class="muted">${esc(SCHEMA[c].label)}</span><b class="num">${store.list(c).length}</b></div>`).join('') || (a.legacy ? `<div class="muted" style="font-size:13px">${store.raw('planBridge')[0] ? 'Conectada' : 'Sin datos en este dispositivo'}</div>` : '')}</a>`).join('')}</div></div>`;
    el.querySelector('[data-add]').addEventListener('submit', (e) => { e.preventDefault(); const v = e.target.q.value.trim(); if (v.length < 4) return; store.add('memoria', { text: v, brain: 'harvey' }); });
    el.onclick = (e) => { const d = e.target.closest('[data-del]'); if (d) store.remove('memoria', d.dataset.del); };
  } };

const conexiones = { id: 'conexiones', title: 'Conexiones', icon: '🔌',
  render(el) {
    const items = [
      ['🧠', 'Claude (cerebro de Harvey)', 'En el servidor', 's-edit', 'La clave vive en Supabase como secreto. Si falta, Harvey te lo avisa al escribirle. Tope: US$0,50 al día.'],
      ['☁️', 'Supabase + cuenta de Google', cloud.user() ? 'Conectado' : 'Entra con Google', cloud.user() ? 's-create' : 's-pending', 'Tus datos sincronizados en Android, iPhone y PC, en tiempo real.'],
      ['🤖', 'Claude en el chat (claude.ai)', 'Conector de Supabase', 's-create', 'Desde cualquier chat de Claude puedes pedir: “lee mis finanzas” o “¿cómo voy con los clientes?”.'],
      ['📧', 'Gmail', 'Fase 2', 's-pending', 'Harvey leerá correos de clientes y te hará resumen. Se conecta con n8n o con el permiso de Gmail de tu cuenta Google.'],
      ['💬', 'WhatsApp Business', 'Fase 2 · n8n', 's-pending', 'API oficial de Meta con un número de negocio. Mensajes nuevos → NEXO Negocios; Harvey propone respuesta y tú confirmas.'],
      ['📸', 'Instagram profesional', 'Fase 2 · n8n', 's-pending', 'Estadísticas, DMs y comentarios. Las métricas llegan solas a NEXO Studio.'],
      ['📅', 'Google Calendar', 'Fase 2', 's-pending', 'Tus bloques de NEXO Plan aparecerán en Calendar y viceversa.'],
    ];
    el.innerHTML = `<div class="list">${items.map(([i, n, st, c, d]) => `<div class="list-item" style="cursor:default;align-items:flex-start"><span style="font-size:22px">${i}</span><div class="li-main"><div class="li-title">${n}</div><div class="li-sub" style="white-space:normal">${d}</div></div><span class="chip ${c}">${st}</span></div>`).join('')}</div>
      <p class="muted" style="font-size:13px;margin-top:14px">Detalle técnico y pasos: docs/CONEXIONES.md en tu repositorio.</p>`;
  } };

await boot({ appId: 'harvey', version: VERSION, home, staticHome: true, modules: [resumen, avisosMod, vida, cerebros, memoria, conexiones] });
