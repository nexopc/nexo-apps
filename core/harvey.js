// Harvey — asistente IA de la red NEXO, con 5 "cerebros" inspirados en los personajes de Suits.
// Lee TODAS las apps desde NEXO Brain y puede crear/editar/borrar registros,
// pero cada cambio pasa por una tarjeta de confirmación Sí / No.
import { store, prefs, fmt } from './store.js';
import { SCHEMA, schemaForAI } from './schema.js';
import { APPS } from './registry.js';

export const BRAINS = {
  harvey:  { name: 'Harvey',  emoji: '⚖️', color: '#E9C46A', area: 'estrategia, negociación, cerrar clientes, confianza, precios',
             voice: 'Seguro, directo, frases cortas. Te reta a jugar en grande, pero con jugadas concretas.' },
  mike:    { name: 'Mike',    emoji: '📚', color: '#4EA8FF', area: 'aprendizaje, estudio, Saber 11, Filmora, código, memoria, investigación rápida',
             voice: 'Curioso y rápido. Explica simple, con trucos para memorizar y pasos claros.' },
  louis:   { name: 'Louis',   emoji: '📊', color: '#18C27A', area: 'dinero, gastos, cobros, presupuesto, detalles, disciplina con los números',
             voice: 'Obsesivo con el detalle y los números exactos. Te regaña con cariño si gastas de más.' },
  donna:   { name: 'Donna',   emoji: '💜', color: '#C77DFF', area: 'agenda, hábitos, personas, clientes, intuición, bienestar, organización del día',
             voice: 'Cálida, intuitiva, sabe lo que necesitas antes de que lo pidas. Te organiza el día.' },
  jessica: { name: 'Jessica', emoji: '👑', color: '#FF8A65', area: 'visión a 4 años, liderazgo, decisiones grandes, NEXO PC como empresa',
             voice: 'Visión de largo plazo, calmada y firme. Piensa como dueña de empresa.' },
};

const MODEL_DEFAULT = 'auto';
export const MODELS = [
  ['auto', 'Automático según el trabajo (recomendado)'],
  ['claude-opus-5-5', 'Claude Opus 5.5 (el más capaz)'],
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 (equilibrado)'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 (el más barato)'],
];

const COLS = Object.keys(SCHEMA);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/^[-•] (.+)$/gm, '<span class="li">• $1</span>')
  .replace(/\n/g, '<br>');

// ---------- Contexto en tiempo real ----------
function balanceByAccount() {
  const acc = store.list('accounts');
  const tx = store.list('transactions');
  return acc.map((a) => {
    let b = Number(a.initial) || 0;
    for (const t of tx) {
      const v = Number(t.amount) || 0;
      if (t.type === 'ingreso' && t.account === a.id) b += v;
      if (t.type === 'gasto' && t.account === a.id) b -= v;
      if (t.type === 'traslado') { if (t.account === a.id) b -= v; if (t.toAccount === a.id) b += v; }
    }
    return { cuenta: a.name, saldo: b };
  });
}
export function snapshot() {
  const today = fmt.today();
  const dow = String(new Date().getDay());
  const month = today.slice(0, 7);
  const tx = store.list('transactions').filter((t) => (t.date || '').startsWith(month));
  const sum = (arr) => arr.reduce((a, t) => a + (Number(t.amount) || 0), 0);
  const counts = Object.fromEntries(COLS.map((c) => [c, store.list(c).length]).filter(([, n]) => n));
  return {
    hoy: today, dia: fmt.day(), hora: new Date().toTimeString().slice(0, 5),
    horario_hoy: store.list('blocks').filter((b) => b.day === dow).sort((a, b) => (a.start || '').localeCompare(b.start || '')).map((b) => `${b.start}-${b.end} ${b.title}`),
    tareas_pendientes: store.list('tasks').filter((t) => !t.done).slice(0, 15).map((t) => ({ id: t.id, t: t.title, p: t.priority, para: t.due })),
    eventos_proximos: store.list('events').filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8).map((e) => `${e.date} ${e.title}`),
    parciales_proximos: store.list('exams').filter((e) => e.date >= today).slice(0, 6).map((e) => `${e.date} ${e.title}`),
    saldos: balanceByAccount(),
    mes: { ingresos: sum(tx.filter((t) => t.type === 'ingreso')), gastos: sum(tx.filter((t) => t.type === 'gasto')) },
    ahorro: store.list('savings').map((s) => `${s.name}: ${s.saved || 0}/${s.target}`),
    cobros_pendientes: store.list('invoices').filter((i) => !i.paid).map((i) => `${i.number || ''} ${i.amount}`),
    registros_por_coleccion: counts,
  };
}

function systemPrompt() {
  return `Eres el asistente personal de Cristóbal (18 años, Quibdó, Colombia): estudia en el colegio, trabaja en una tienda de computadores y está construyendo su tienda de tecnología NEXO PC (hardware y gaming), una agencia de marketing digital, edición de video y una app de catálogo de tiendas locales. Plazo: 4 años. Quiere estudiar Ingeniería en Nanotecnología.

Tienes 5 cerebros, inspirados en los personajes de la serie Suits (no eres los personajes reales; hablas con su estilo y su área):
${Object.values(BRAINS).map((b) => `- ${b.emoji} ${b.name}: ${b.area}. Estilo: ${b.voice}`).join('\n')}

Cómo respondes:
- Español de Colombia, corto y concreto. Máximo ~8 líneas salvo que pida detalle.
- Empieza cada parte con la etiqueta del cerebro que habla, en negrita, por ejemplo **⚖️ Harvey:**.
- Si el modo es "auto", elige el cerebro (o máximo dos) que más sabe del tema.
- Si el modo es "consejo", cada cerebro relevante da una línea y cierra **💜 Donna (resumen):** con la acción a tomar.
- Si el modo nombra un cerebro, habla solo ese.
- Sé realista y da crítica constructiva con números cuando algo no cuadre.
- Termina con UNA acción concreta.

Datos: todo vive en NEXO Brain. Usa la herramienta consultar para leer detalle (el contexto de cada mensaje ya trae un resumen en vivo).
Para crear, actualizar o borrar usa crear / actualizar / borrar: la app le muestra a Cristóbal una tarjeta Sí / No antes de aplicar. No pidas confirmación por texto; llama la herramienta directamente y luego confirma el resultado.
Fechas en formato AAAA-MM-DD, horas HH:MM, dinero en pesos colombianos como número sin puntos.
Nunca leas entradas del diario marcadas como privadas.

Colecciones y campos:
${schemaForAI()}`;
}

// ---------- Herramientas ----------
function clean(rec) {
  const o = {};
  for (const [k, v] of Object.entries(rec)) if (v !== '' && v != null && !['createdAt', '_deleted'].includes(k)) o[k] = v;
  return o;
}
function validCol(c) { if (!COLS.includes(c)) throw new Error(`Colección desconocida: ${c}. Usa una de: ${COLS.join(', ')}`); }
function describeChange(action, col, data, prev) {
  const label = SCHEMA[col]?.label || col;
  const lines = Object.entries(data || {}).map(([k, v]) => {
    const f = SCHEMA[col]?.fields.find((x) => x.k === k);
    let val = v;
    if (f?.type === 'money') val = fmt.money(v);
    if (f?.type === 'ref') val = store.get(f.ref, v)?.name || store.get(f.ref, v)?.title || v;
    return `${f?.label || k}: ${prev && prev[k] !== undefined ? `${prev[k]} → ` : ''}${val}`;
  });
  return { title: `${action} en ${label}`, body: lines.join('\n') };
}

async function makeTools(ui) {
  const { betaTool } = await import('./vendor/anthropic.js');
  return [
    betaTool({
      name: 'consultar',
      description: 'Lee registros de una colección de NEXO Brain. Úsala para buscar detalle (por ejemplo gastos del mes, clientes, tareas). Devuelve JSON.',
      inputSchema: { type: 'object', additionalProperties: false, required: ['coleccion'], properties: {
        coleccion: { type: 'string', description: 'Nombre de la colección' },
        texto: { type: 'string', description: 'Filtro opcional: texto que debe aparecer en el registro' },
        desde: { type: 'string', description: 'Fecha mínima AAAA-MM-DD (filtra por date o due) opcional' },
        limite: { type: 'integer', description: 'Máximo de registros (por defecto 40)' },
      } },
      run: async ({ coleccion, texto, desde, limite }) => {
        validCol(coleccion);
        let rows = store.list(coleccion);
        if (coleccion === 'journal') rows = rows.filter((r) => !r.private);
        if (texto) rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(String(texto).toLowerCase()));
        if (desde) rows = rows.filter((r) => (r.date || r.due || '') >= desde);
        rows = rows.slice(-(Math.min(Number(limite) || 40, 200)));
        ui.note(`🔎 Revisé ${SCHEMA[coleccion].label} (${rows.length})`);
        return JSON.stringify(rows.map(clean));
      },
    }),
    betaTool({
      name: 'crear',
      description: 'Crea un registro nuevo (tarea, gasto, ingreso, bloque de estudio, cliente, etc). La app pide confirmación Sí/No al usuario antes de guardar.',
      inputSchema: { type: 'object', additionalProperties: false, required: ['coleccion', 'datos'], properties: {
        coleccion: { type: 'string' }, datos: { type: 'object', description: 'Campos del registro según el esquema' },
      } },
      run: async ({ coleccion, datos }) => {
        validCol(coleccion);
        if (!datos || typeof datos !== 'object') throw new Error('datos debe ser un objeto');
        const d = describeChange('➕ Crear', coleccion, datos);
        if (!(await ui.confirm(d.title, d.body))) return 'El usuario dijo NO. No se guardó nada.';
        const rec = store.add(coleccion, datos);
        return `Guardado con id ${rec.id}.`;
      },
    }),
    betaTool({
      name: 'actualizar',
      description: 'Cambia campos de un registro existente (por ejemplo marcar tarea como hecha, mover un bloque de agenda). Pide confirmación Sí/No.',
      inputSchema: { type: 'object', additionalProperties: false, required: ['coleccion', 'id', 'cambios'], properties: {
        coleccion: { type: 'string' }, id: { type: 'string' }, cambios: { type: 'object' },
      } },
      run: async ({ coleccion, id, cambios }) => {
        validCol(coleccion);
        const prev = store.get(coleccion, id);
        if (!prev) return `No existe el id ${id} en ${coleccion}. Usa consultar para buscarlo.`;
        const d = describeChange('✏️ Cambiar', coleccion, cambios, prev);
        if (!(await ui.confirm(d.title + ` · ${prev.title || prev.name || ''}`, d.body))) return 'El usuario dijo NO. No se cambió nada.';
        store.update(coleccion, id, cambios);
        return 'Actualizado.';
      },
    }),
    betaTool({
      name: 'borrar',
      description: 'Borra un registro. Pide confirmación Sí/No.',
      inputSchema: { type: 'object', additionalProperties: false, required: ['coleccion', 'id'], properties: { coleccion: { type: 'string' }, id: { type: 'string' } } },
      run: async ({ coleccion, id }) => {
        validCol(coleccion);
        const prev = store.get(coleccion, id);
        if (!prev) return `No existe el id ${id}.`;
        if (!(await ui.confirm(`🗑 Borrar en ${SCHEMA[coleccion].label}`, prev.title || prev.name || JSON.stringify(clean(prev)), true))) return 'El usuario dijo NO.';
        store.remove(coleccion, id);
        return 'Borrado.';
      },
    }),
  ];
}

// ---------- Modelo automático según el trabajo ----------
// Registros rápidos → Haiku (barato). Conversación normal → Sonnet. Análisis, planes, estrategia o consejo → Opus.
const HEAVY = /(analiz|revis|estrateg|plan de|planea|organiza|semana|mes|consejo|por qu[eé]|c[oó]mo (hago|puedo|mejoro)|ideas?|propuesta|cotiza|negoci|precio|invertir|ahorr|libertad|universidad|saber 11|gui[oó]n|mensaje para)/i;
const QUICK_RE = /^(agrega|agr[eé]game|registra|anota|crea|marca|pon|apunta|gast[eé]|pagu[eé]|recib[ií]|me pagaron|borra|elimina|mueve|cambia)\b/i;
export function pickModel(text, mode) {
  const chosen = prefs.get('model', MODEL_DEFAULT);
  if (chosen !== 'auto') return chosen;
  const t = text.trim();
  if (mode === 'consejo' || HEAVY.test(t) || t.length > 280) return 'claude-opus-5-5';
  if (QUICK_RE.test(t) || t.length < 50) return 'claude-haiku-5-5';
  return 'claude-sonnet-5-5';
}
const MODEL_LABEL = { 'claude-opus-5-5': 'Opus', 'claude-sonnet-5-5': 'Sonnet', 'claude-haiku-5-5': 'Haiku' };

// ---------- Llamada a Claude ----------
async function ask(history, ui, model) {
  const key = prefs.get('anthropicKey');
  if (!key) throw Object.assign(new Error('Falta tu clave de Claude. Ábrela en ⚙︎ Ajustes de Harvey.'), { code: 'nokey' });
  const { Anthropic } = await import('./vendor/anthropic.js');
  // Clave guardada solo en este dispositivo. Para uso compartido usa el proxy (docs/INSTALAR.md).
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, baseURL: prefs.get('proxyURL') || undefined });
  const tools = await makeTools(ui);
  const params = {
    model,
    max_tokens: 16000,
    max_iterations: 8,
    system: systemPrompt(),
    cache_control: { type: 'ephemeral' },
    output_config: { effort: model === 'claude-opus-5-5' ? 'medium' : 'low' },
    tools,
    messages: history,
  };
  // Respaldo automático si el modelo declina (Haiku no lo admite)
  if (model !== 'claude-haiku-5-5') Object.assign(params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  const runner = client.beta.messages.toolRunner(params);
  const final = await runner.runUntilDone();
  if (final.stop_reason === 'refusal') return '⚠️ No puedo ayudar con eso. Intenta preguntarlo de otra forma.';
  return final.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim() || '✓ Listo.';
}

function buildHistory(chat, text, mode, appId) {
  const msgs = [];
  for (const m of chat.slice(-12)) {
    const role = m.role === 'user' ? 'user' : 'assistant';
    if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += '\n' + m.text;
    else msgs.push({ role, content: m.text });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const modeTxt = mode === 'auto' ? 'auto' : mode === 'consejo' ? 'consejo (todos opinan, Donna resume)' : `solo ${BRAINS[mode]?.name}`;
  const content = [
    { type: 'text', text: `[Contexto NEXO en vivo — app abierta: ${appId || 'hub'} — modo de cerebros: ${modeTxt}]\n${JSON.stringify(snapshot())}` },
    { type: 'text', text },
  ];
  if (msgs.length && msgs[msgs.length - 1].role === 'user') msgs.push({ role: 'assistant', content: '(continúo)' });
  msgs.push({ role: 'user', content });
  return msgs;
}

// ---------- Voz ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function speak(text) {
  if (!prefs.get('voiceReply', false) || !window.speechSynthesis) return;
  const clean = text.replace(/\*\*/g, '').replace(/[⚖️📚📊💜👑🟣•]/gu, '').replace(/\n+/g, '. ');
  const u = new SpeechSynthesisUtterance(clean);
  const voices = speechSynthesis.getVoices();
  u.voice = voices.find((v) => v.lang === 'es-CO') || voices.find((v) => v.lang === 'es-US') || voices.find((v) => v.lang?.startsWith('es')) || null;
  u.lang = u.voice?.lang || 'es-CO'; u.rate = 1.05;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}

// ---------- UI del chat ----------
const QUICK = [
  ['☀️ Resumen de hoy', 'Dame el resumen de hoy: qué tengo, qué está pendiente y qué hago primero.'],
  ['⏭ ¿Qué hago ahora?', '¿Qué debería estar haciendo ahora mismo según mi horario y pendientes?'],
  ['💸 Registrar gasto', 'Quiero registrar un gasto: '],
  ['✅ Nueva tarea', 'Agrega una tarea: '],
  ['📅 Bloque de estudio', 'Agéndame un bloque de estudio de '],
  ['📈 Resumen semanal', 'Haz mi revisión semanal: cumplimiento de horario, hábitos, plata y negocio. Qué mejorar.'],
];

export function mountChat(root, { appId, initial = '', compact = false } = {}) {
  injectCSS();
  root.innerHTML = `<div class="hv ${compact ? 'compact' : ''}">
    <div class="hv-modes" role="group" aria-label="Cerebro">
      ${[['auto', '✨ Auto'], ...Object.entries(BRAINS).map(([k, b]) => [k, `${b.emoji} ${b.name}`]), ['consejo', '🏛 Consejo']].map(([k, l]) => `<button type="button" data-mode="${k}">${l}</button>`).join('')}
    </div>
    <div class="hv-log" id="hvlog" aria-live="polite"></div>
    <div class="hv-quick">${QUICK.map(([l, q]) => `<button type="button" data-q="${esc(q)}">${l}</button>`).join('')}</div>
    <form class="hv-input" autocomplete="off">
      <button type="button" class="hv-mic" aria-label="Hablar" ${SR ? '' : 'hidden'}>🎤</button>
      <textarea rows="1" placeholder="Escríbele o háblale a Harvey…" aria-label="Mensaje"></textarea>
      <button class="btn btn-ai hv-send" aria-label="Enviar">➤</button>
    </form>
    <div class="hv-foot"><button type="button" class="hv-link" data-a="cfg">⚙︎ Ajustes de Harvey</button><button type="button" class="hv-link" data-a="clear">Limpiar chat</button></div>
  </div>`;
  const log = root.querySelector('#hvlog');
  const ta = root.querySelector('textarea');
  const form = root.querySelector('form');
  let mode = prefs.get('brainMode', 'auto');
  let busy = false;
  const paintModes = () => root.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  paintModes();

  const chat = () => store.list('chat').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const bubble = (m) => {
    const d = document.createElement('div');
    d.className = 'hv-msg ' + (m.role === 'user' ? 'me' : 'ai');
    d.innerHTML = m.role === 'user' ? esc(m.text) : md(m.text);
    return d;
  };
  const paintLog = () => {
    log.innerHTML = '';
    const c = chat().slice(-40);
    if (!c.length) log.innerHTML = `<div class="hv-hello"><b>Hola, Cristóbal.</b> Soy Harvey y tengo 4 cerebros más: Mike, Louis, Donna y Jessica. Leo todas tus apps NEXO. Pídeme registrar algo, mover tu agenda o darte un consejo.</div>`;
    c.forEach((m) => log.appendChild(bubble(m)));
    log.scrollTop = log.scrollHeight;
  };
  paintLog();

  const ui = {
    note(t) { const n = document.createElement('div'); n.className = 'hv-note'; n.textContent = t; log.appendChild(n); log.scrollTop = log.scrollHeight; },
    confirm(title, body, danger = false) {
      return new Promise((res) => {
        const c = document.createElement('div');
        c.className = 'confirm-card';
        c.innerHTML = `<b>${esc(title)}</b><pre>${esc(body)}</pre><div class="row end">
          <button class="btn btn-delete ghost sm" data-r="no">✕ No</button><button class="btn ${danger ? 'btn-delete' : 'btn-create'} sm" data-r="yes">✓ Sí</button></div>`;
        log.appendChild(c); log.scrollTop = log.scrollHeight;
        c.addEventListener('click', (e) => {
          const r = e.target.closest('[data-r]')?.dataset.r; if (!r) return;
          c.querySelector('.row').innerHTML = r === 'yes' ? '<span class="chip s-create">✓ Aprobado</span>' : '<span class="chip s-delete">✕ Cancelado</span>';
          res(r === 'yes');
        });
        speak(title);
      });
    },
  };

  async function send(text) {
    text = text.trim(); if (!text || busy) return;
    busy = true; root.querySelector('.hv-send').disabled = true;
    const history = buildHistory(chat(), text, mode, appId);
    store.add('chat', { role: 'user', text });
    paintLog();
    const typing = document.createElement('div'); typing.className = 'hv-msg ai typing'; typing.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    try {
      const model = pickModel(text, mode);
      ui.note(`🧠 ${MODEL_LABEL[model] || model}`);
      const out = await ask(history, ui, model);
      typing.remove();
      store.add('chat', { role: 'assistant', text: out });
      speak(out);
    } catch (err) {
      typing.remove();
      const status = err?.status;
      const msg = err.code === 'nokey' ? err.message
        : status === 401 ? 'Tu clave de Claude no es válida. Revísala en ⚙︎ Ajustes de Harvey.'
        : status === 429 ? 'Demasiadas solicitudes seguidas. Espera un minuto y vuelve a intentar.'
        : status === 529 || status >= 500 ? 'Claude está saturado en este momento. Intenta en un rato.'
        : !navigator.onLine ? 'Sin internet. Tus apps siguen funcionando; Harvey necesita conexión.'
        : 'No pude responder: ' + (err.message || 'error desconocido');
      store.add('chat', { role: 'assistant', text: '⚠️ ' + msg });
    }
    // limita el historial guardado
    const all = chat(); if (all.length > 200) all.slice(0, all.length - 200).forEach((m) => store.remove('chat', m.id));
    busy = false; root.querySelector('.hv-send').disabled = false;
    paintLog();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); const t = ta.value; ta.value = ''; send(t); });
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; });
  root.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]'); if (m) { mode = m.dataset.mode; prefs.set('brainMode', mode); paintModes(); return; }
    const q = e.target.closest('[data-q]'); if (q) { const v = q.dataset.q; if (v.endsWith(': ') || v.endsWith(' de ')) { ta.value = v; ta.focus(); } else send(v); return; }
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'cfg') harveySettings(root);
    if (a === 'clear') { chat().forEach((m) => store.remove('chat', m.id)); paintLog(); }
  });
  // Voz → texto
  const mic = root.querySelector('.hv-mic');
  if (SR) {
    let rec = null;
    mic.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'es-CO'; rec.interimResults = true; rec.continuous = false;
      const base = ta.value;
      rec.onresult = (ev) => { ta.value = base + Array.from(ev.results).map((r) => r[0].transcript).join(' '); };
      rec.onend = () => { mic.classList.remove('on'); rec = null; if (prefs.get('autoSendVoice', true) && ta.value.trim()) form.requestSubmit(); };
      rec.onerror = () => { mic.classList.remove('on'); rec = null; };
      mic.classList.add('on'); rec.start();
    });
  }
  store.subscribe('chat', () => { if (!busy) paintLog(); });
  if (initial) send(initial);
  if (!prefs.get('anthropicKey')) setTimeout(() => harveySettings(root), 300);
}

function harveySettings(root) {
  const wrap = document.createElement('div');
  wrap.className = 'hv-cfg card';
  wrap.innerHTML = `<h3>⚙︎ Ajustes de Harvey</h3><form class="form">
    <div class="field"><label for="hk">Clave de Claude (API key)</label><input id="hk" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(prefs.get('anthropicKey', ''))}">
      <small class="muted">Se guarda solo en este dispositivo. Créala en platform.claude.com → API keys y ponle un límite de gasto mensual.</small></div>
    <div class="field"><label for="hm">Modelo</label><select id="hm">${MODELS.map(([k, l]) => `<option value="${k}" ${prefs.get('model', MODEL_DEFAULT) === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label for="hp">Proxy (opcional, avanzado)</label><input id="hp" type="url" placeholder="https://tu-proxy.workers.dev" value="${esc(prefs.get('proxyURL', ''))}"></div>
    <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="hv" ${prefs.get('voiceReply', false) ? 'checked' : ''}> Harvey responde en voz alta</label>
    <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="ha" ${prefs.get('autoSendVoice', true) ? 'checked' : ''}> Enviar solo al terminar de hablar</label>
    <div class="row end"><button type="button" class="btn btn-cancel sm" data-x>Cerrar</button><button class="btn btn-create sm">Guardar</button></div></form>`;
  root.querySelector('.hv').prepend(wrap);
  wrap.querySelector('[data-x]').onclick = () => wrap.remove();
  wrap.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    prefs.set('anthropicKey', wrap.querySelector('#hk').value.trim());
    prefs.set('model', wrap.querySelector('#hm').value);
    prefs.set('proxyURL', wrap.querySelector('#hp').value.trim());
    prefs.set('voiceReply', wrap.querySelector('#hv').checked);
    prefs.set('autoSendVoice', wrap.querySelector('#ha').checked);
    wrap.remove();
  });
}

function injectCSS() {
  if (document.getElementById('hv-css')) return;
  const s = document.createElement('style'); s.id = 'hv-css';
  s.textContent = `
  .hv{display:grid;gap:10px;grid-template-rows:auto 1fr auto auto auto;min-height:min(70vh,640px)}
  .hv.full{min-height:calc(100vh - 140px)}
  .hv-modes{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
  .hv-modes button{flex:none;padding:7px 12px;border-radius:99px;border:1px solid var(--line);background:var(--panel);cursor:pointer;font-weight:600;font-size:13px}
  .hv-modes button[aria-pressed=true]{background:var(--c-ai);border-color:var(--c-ai);color:#fff}
  .hv-log{overflow:auto;display:flex;flex-direction:column;gap:10px;padding:4px 2px;max-height:56vh;min-height:200px}
  .hv.full .hv-log{max-height:none}
  .hv-msg{max-width:88%;padding:10px 14px;border-radius:16px;line-height:1.5;word-wrap:break-word;animation:hvin .25s ease-out}
  .hv-msg.me{align-self:flex-end;background:var(--c-ai);color:#fff;border-bottom-right-radius:6px}
  .hv-msg.ai{align-self:flex-start;background:var(--panel);border:1px solid var(--line);border-bottom-left-radius:6px}
  .hv-msg .li{display:block;padding-left:4px}
  .hv-msg.typing{display:flex;gap:5px}.hv-msg.typing i{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:hvdot 1s infinite}
  .hv-msg.typing i:nth-child(2){animation-delay:.15s}.hv-msg.typing i:nth-child(3){animation-delay:.3s}
  @keyframes hvdot{50%{opacity:.25;transform:translateY(-3px)}}@keyframes hvin{from{opacity:0;transform:translateY(6px)}}
  .hv-note{align-self:center;font-size:12px;color:var(--muted)}
  .hv-hello{color:var(--muted);padding:14px;border:1px dashed var(--line);border-radius:14px}.hv-hello b{color:var(--fg)}
  .hv-quick{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
  .hv-quick button{flex:none;padding:7px 11px;border-radius:10px;border:1px solid color-mix(in srgb,var(--c-ai) 40%,var(--line));background:color-mix(in srgb,var(--c-ai) 8%,var(--panel));cursor:pointer;font-size:13px}
  .hv-input{display:flex;gap:8px;align-items:flex-end}
  .hv-input textarea{flex:1;min-width:0;resize:none;min-height:46px;max-height:140px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--panel)}
  .hv-input textarea:focus{outline:none;border-color:var(--c-ai)}
  .hv-mic{width:46px;height:46px;flex:none;border-radius:14px;border:1.5px solid var(--c-ai);background:color-mix(in srgb,var(--c-ai) 14%,var(--panel));font-size:20px;cursor:pointer}
  .hv-mic.on{background:var(--c-ai);animation:hvpulse 1.2s infinite}@keyframes hvpulse{50%{box-shadow:0 0 0 7px color-mix(in srgb,var(--c-ai) 25%,transparent)}}
  .hv-send{width:46px;height:46px;padding:0;flex:none;border-radius:14px;font-size:18px}
  .hv-foot{display:flex;justify-content:space-between}.hv-link{background:none;border:0;color:var(--muted);cursor:pointer;font-size:13px;padding:4px 0}.hv-link:hover{color:var(--fg)}
  .hv-cfg{margin-bottom:6px}`;
  document.head.appendChild(s);
}
