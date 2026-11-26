// Harvey · tu asistente — chat y voz, lectura de las 5 apps, resúmenes, alertas, cerebros y conexiones.
import { boot, store, fmt, esc, prefs } from '../../core/shell.js';
import { APPS, LOGOS } from '../../core/registry.js';
import { SCHEMA } from '../../core/schema.js';

const VERSION = '1.0.0';
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

let mounted = null; // compatibilidad con los botones que reabren el chat

const resumen = { id: 'resumen', title: 'Hoy en NEXO', icon: '☀️',
  async render(el) {
    const { snapshot, BRAINS } = await harvey();
    const s = snapshot();
    el.innerHTML = `<p class="muted" style="margin:0 0 12px;text-transform:capitalize">${esc(s.dia)} · ${s.hora} — resumen calculado sin usar IA</p>
      <div class="grid">
        <div class="card"><h3>💜 Donna · tu día</h3>${s.horario_hoy.map((b) => `<div style="padding:2px 0" class="num">${esc(b)}</div>`).join('') || '<p class="muted" style="margin:0">Sin bloques hoy</p>'}
          ${s.eventos_proximos.length ? `<h3 style="margin-top:12px">📅 Próximo</h3>${s.eventos_proximos.slice(0, 4).map((e) => `<div class="muted" style="padding:2px 0">${esc(e)}</div>`).join('')}` : ''}</div>
        <div class="card"><h3>✅ Pendientes (${s.tareas_pendientes.length})</h3>${s.tareas_pendientes.slice(0, 6).map((t) => `<div style="padding:2px 0">${t.p === 'alta' ? '🔴' : t.p === 'baja' ? '🟢' : '🟡'} ${esc(t.t)}</div>`).join('') || '<p class="muted" style="margin:0">Todo al día</p>'}</div>
        <div class="card"><h3>📊 Louis · la plata</h3>${s.saldos.map((a) => `<div class="row" style="justify-content:space-between"><span>${esc(a.cuenta)}</span><b class="num">${fmt.money(a.saldo)}</b></div>`).join('') || '<p class="muted" style="margin:0">Sin cuentas</p>'}
          <p class="num" style="margin:8px 0 0"><span class="up">+${fmt.money(s.mes.ingresos)}</span> · <span class="down">−${fmt.money(s.mes.gastos)}</span> este mes</p>
          ${s.ahorro.map((a) => `<div class="muted" style="font-size:13px">🐷 ${esc(a)}</div>`).join('')}</div>
        <div class="card"><h3>📚 Mike · estudio</h3>${s.parciales_proximos.map((e) => `<div style="padding:2px 0">📝 ${esc(e)}</div>`).join('') || '<p class="muted" style="margin:0">Sin evaluaciones próximas</p>'}</div>
        <div class="card"><h3>⚖️ Harvey · negocio</h3>${s.cobros_pendientes.length ? s.cobros_pendientes.map((c) => `<div>🧾 ${esc(c)}</div>`).join('') : '<p class="muted" style="margin:0">Sin cobros pendientes</p>'}</div>
      </div>
      <div class="row section"><button class="btn btn-ai" data-q="Dame el resumen de hoy: qué tengo, qué está pendiente y qué hago primero.">🟣 Que Donna me lo explique</button>
        <button class="btn btn-ai ghost" data-q="Consejo: haz mi revisión semanal completa (horario, hábitos, plata, negocio, estudio) y dame las 3 prioridades de la próxima semana.">🏛 Revisión semanal del consejo</button></div>`;
    el.onclick = (e) => { const q = e.target.closest('[data-q]')?.dataset.q; if (q) { home.q = q; mounted = null; document.querySelector('[data-nav=home]').click(); } };
  } };

const cerebros = { id: 'cerebros', title: 'Cerebros', icon: '🧠',
  async render(el) {
    const { BRAINS } = await harvey();
    const mode = prefs.get('brainMode', 'auto');
    el.innerHTML = `<p class="muted" style="margin:0 0 12px">Cada cerebro está inspirado en un personaje de Suits y sabe de un área. Toca uno para hablar solo con él.</p>
      <div class="grid">${Object.entries(BRAINS).map(([k, b]) => `<button class="card brain ${mode === k ? 'sel' : ''}" data-b="${k}" style="--k:${b.color}"><span class="av">${b.emoji}</span><b>${b.name}</b><span class="muted" style="font-size:13px">${esc(b.area)}</span><i>${esc(b.voice)}</i></button>`).join('')}
      <button class="card brain ${mode === 'consejo' ? 'sel' : ''}" data-b="consejo" style="--k:#9B5CFF"><span class="av">🏛</span><b>El consejo</b><span class="muted" style="font-size:13px">Todos opinan en una línea y Donna resume la acción.</span></button>
      <button class="card brain ${mode === 'auto' ? 'sel' : ''}" data-b="auto" style="--k:#8E99AD"><span class="av">✨</span><b>Automático</b><span class="muted" style="font-size:13px">Harvey elige quién responde según el tema.</span></button></div>`;
    el.onclick = (e) => { const b = e.target.closest('[data-b]'); if (b) { prefs.set('brainMode', b.dataset.b); mounted = null; document.querySelector('[data-nav=home]').click(); } };
  } };

const memoria = { id: 'memoria', title: 'Lo que sé de ti', icon: '🗂',
  render(el) {
    el.innerHTML = `<p class="muted" style="margin:0 0 12px">Todo lo que guardan tus apps vive en un solo lugar (NEXO Brain). Harvey lo lee en tiempo real.</p>
      <div class="grid">${APPS.filter((a) => a.id !== 'harvey').map((a) => `<a class="card appc" href="../../${a.path}" style="--k:${a.accent}"><div class="row"><span class="ic">${LOGOS[a.id]}</span><b>${esc(a.name)}</b></div>
        ${a.cols.filter((c) => SCHEMA[c] && !SCHEMA[c].hidden).map((c) => `<div class="row" style="justify-content:space-between;font-size:13px"><span class="muted">${esc(SCHEMA[c].label)}</span><b class="num">${store.list(c).length}</b></div>`).join('')}</a>`).join('')}</div>`;
  } };

const alertas = { id: 'alertas', title: 'Alertas', icon: '🔔',
  render(el) {
    const t = fmt.today(); const out = [];
    const d = (x) => Math.round((new Date(x + 'T12:00') - new Date(t + 'T12:00')) / 864e5);
    store.list('tasks').filter((x) => !x.done && x.due && x.due < t).forEach((x) => out.push(['s-delete', '✅', `Tarea vencida: ${x.title}`, 'plan']));
    store.list('tasks').filter((x) => !x.done && x.due === t).forEach((x) => out.push(['s-pending', '✅', `Para hoy: ${x.title}`, 'plan']));
    store.list('exams').filter((x) => x.date >= t && d(x.date) <= 3).forEach((x) => out.push(['s-pending', '📝', `${x.title} en ${d(x.date)} días`, 'aprende']));
    store.list('subscriptions').filter((x) => x.nextDate && d(x.nextDate) <= 3).forEach((x) => out.push([d(x.nextDate) < 0 ? 's-delete' : 's-pending', '🔁', `Pago ${x.name}: ${fmt.money(x.amount)} ${d(x.nextDate) < 0 ? 'vencido' : 'en ' + d(x.nextDate) + ' d'}`, 'finanzas']));
    store.list('invoices').filter((x) => !x.paid && x.due && x.due < t).forEach((x) => out.push(['s-delete', '🧾', `Cobro vencido ${x.number || ''}: ${fmt.money(x.amount)}`, 'negocios']));
    store.list('jobs').filter((x) => x.due && x.due <= t && !['entregado', 'pagado'].includes(x.status)).forEach((x) => out.push(['s-delete', '🛠', `Entrega atrasada: ${x.title}`, 'negocios']));
    store.list('prospects').filter((x) => x.nextDate && x.nextDate <= t && !['ganado', 'perdido'].includes(x.stage)).forEach((x) => out.push(['s-pending', '🎯', `Seguimiento: ${x.name}`, 'negocios']));
    store.list('shoots').filter((x) => x.date === t).forEach((x) => out.push(['s-pending', '🎬', `Grabación hoy: ${x.title}`, 'studio']));
    const cards = store.list('flashcards').filter((c) => !c.nextDate || c.nextDate <= t).length;
    if (cards) out.push(['s-edit', '🃏', `${cards} tarjetas para repasar`, 'aprende']);
    el.innerHTML = out.length ? `<div class="list">${out.map(([c, i, txt, app]) => `<a class="list-item" href="../../apps/${app}/index.html" style="text-decoration:none;color:inherit"><span style="font-size:20px">${i}</span><div class="li-main" style="white-space:normal">${esc(txt)}</div><span class="chip ${c}">${esc(APPS.find((a) => a.id === app).name.replace('NEXO ', ''))}</span></a>`).join('')}</div>`
      : '<div class="empty"><b>Sin alertas</b>Todo está al día en tus 5 apps.</div>';
    if (out.length && 'Notification' in window && Notification.permission === 'granted' && !sessionStorage.getItem('nexo:notified')) {
      sessionStorage.setItem('nexo:notified', '1');
      new Notification('NEXO · ' + out.length + ' alertas', { body: out.slice(0, 3).map((o) => o[2]).join('\n'), icon: '../../core/icons/harvey.svg' });
    }
  },
  headerExtra: () => ('Notification' in window && Notification.permission === 'default' ? '<button class="btn btn-pending sm" onclick="Notification.requestPermission()">🔔 Activar notificaciones</button>' : '') };

const conexiones = { id: 'conexiones', title: 'Conexiones', icon: '🔌',
  render(el) {
    const ok = !!prefs.get('anthropicKey');
    const items = [
      ['🧠', 'Claude (cerebro de Harvey)', ok ? 'Conectado' : 'Falta tu clave', ok ? 's-create' : 's-pending', 'Ajustes en el chat → ⚙︎ Ajustes de Harvey.'],
      ['☁️', 'Cuenta de Google (respaldo)', 'Ver ⚙︎ Ajustes', 's-edit', 'Requiere configurar Firebase una sola vez (docs/INSTALAR.md).'],
      ['📧', 'Gmail', 'Fase 2', 's-pending', 'Harvey leerá correos de clientes y te hará resumen. Se conecta con n8n o con el permiso de Gmail de tu cuenta Google.'],
      ['💬', 'WhatsApp Business', 'Fase 2 · n8n', 's-pending', 'API oficial de Meta con un número de negocio. Mensajes nuevos → NEXO Negocios; Harvey propone respuesta y tú confirmas.'],
      ['📸', 'Instagram profesional', 'Fase 2 · n8n', 's-pending', 'Estadísticas, DMs y comentarios. Las métricas llegan solas a NEXO Studio.'],
      ['📅', 'Google Calendar', 'Fase 2', 's-pending', 'Tus bloques de NEXO Plan aparecerán en Calendar y viceversa.'],
    ];
    el.innerHTML = `<div class="list">${items.map(([i, n, st, c, d]) => `<div class="list-item" style="cursor:default;align-items:flex-start"><span style="font-size:22px">${i}</span><div class="li-main"><div class="li-title">${n}</div><div class="li-sub" style="white-space:normal">${d}</div></div><span class="chip ${c}">${st}</span></div>`).join('')}</div>
      <p class="muted" style="font-size:13px;margin-top:14px">Detalle técnico y pasos: docs/CONEXIONES.md en tu repositorio.</p>`;
  } };

await boot({ appId: 'harvey', version: VERSION, home, staticHome: true, modules: [resumen, alertas, cerebros, memoria, conexiones] });
