// Harvey — asistente IA de la red NEXO, con 5 "cerebros" inspirados en los personajes de Suits.
// Lee TODAS las apps desde NEXO Brain y puede crear/editar/borrar registros,
// pero cada cambio pasa por una tarjeta de confirmación Sí / No.
import { store, prefs, fmt } from './store.js';
import { planInfo, planDay, sendToPlan, PLAN_CATS } from './planlink.js';
import { SCHEMA, schemaForAI } from './schema.js';
import { APPS } from './registry.js';

export const BRAINS = {
  harvey:  { name: 'Harvey',  emoji: '⚖️', color: '#F5B83D', role: 'El jefe. Estrategia y clientes',
             area: 'prioridades, estrategia de negocio, precios, negociación, conseguir y cerrar clientes, propuestas, posicionar NEXO PC',
             voice: 'Seguro, directo, frases cortas. No acepta excusas ni que juegues a no perder. Siempre da la jugada concreta: a quién llamar, qué ofrecer y a qué precio.',
             puede: 'Cotizar con los servicios y combos, redactar mensajes para prospectos, decidir qué cliente atender primero.' },
  donna:   { name: 'Donna',   emoji: '💜', color: '#FF5DA2', role: 'Tu agenda y tu gente',
             area: 'agenda, citas, mover bloques del horario, recordatorios, clientes y personas, hábitos, descanso',
             voice: 'Lo sabe todo antes de que lo digas. Cálida pero firme, práctica: ya tiene el día resuelto y te lo dice sin rodeos.',
             puede: 'Reorganizar el día (reorganizar_dia), crear citas, tareas y recordatorios en NEXO PLAN (tarea_plan), recordarte a quién le debes una respuesta.' },
  louis:   { name: 'Louis',   emoji: '📊', color: '#1CE783', role: 'Tu contabilidad',
             area: 'gastos e ingresos, presupuesto, cobros y cuentas de cobro, flujo de caja, ahorro para NEXO PC, meta de ventas, RUT, DIAN y régimen simple',
             voice: 'Obsesivo con cada peso, dramático cuando algo no cuadra y orgulloso cuando hay disciplina. Siempre con números exactos.',
             puede: 'Registrar gastos e ingresos, revisar presupuesto y cobros pendientes, decir cuánto falta para la meta y cuánto se puede gastar.' },
  mike:    { name: 'Mike',    emoji: '📚', color: '#3D8BFF', role: 'Astuto y analítico',
             area: 'análisis y patrones en tus números, atajos y trucos, aprender rápido, Saber 11, Filmora, código, ideas y guiones',
             voice: 'Rápido, ingenioso, memoria de elefante. Encuentra el patrón o el atajo que nadie vio y lo explica simple.',
             puede: 'Analizar qué te funciona (horas, ventas, videos), armar planes de estudio, tarjetas de repaso, ideas y guiones de video.' },
  jessica: { name: 'Jessica', emoji: '👑', color: '#A77BFF', role: 'Visión y decisiones grandes',
             area: 'plan a 4 años, prioridades entre proyectos, cuándo decir que no, liderazgo, NEXO PC como empresa, revisión semanal y mensual',
             voice: 'Calmada y firme. Ve el tablero completo y piensa como dueña de empresa. Pocas palabras, todas pesan.',
             puede: 'Revisión semanal, decidir qué proyecto va primero, cerrar el consejo con la decisión.' },
};

// Perfil privado del dueño: vive en Supabase (tabla perfil), nunca en el código público.
let PERFIL = prefs.get('perfilResumen', '');
async function loadPerfil() {
  try {
    const { cloud } = await import('./sync.js');
    const sb = cloud.user() ? await cloud.client() : null;
    if (!sb) return PERFIL;
    const { data } = await sb.from('perfil').select('nombre,ciudad,datos').maybeSingle();
    if (data) { PERFIL = [data.nombre && 'Nombre: ' + data.nombre, data.ciudad && 'Ciudad: ' + data.ciudad, data.datos?.resumen].filter(Boolean).join('\n'); prefs.set('perfilResumen', PERFIL); }
  } catch {}
  return PERFIL;
}

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
    const month = today.slice(0, 7);
  const tx = store.list('transactions').filter((t) => (t.date || '').startsWith(month));
  const sum = (arr) => arr.reduce((a, t) => a + (Number(t.amount) || 0), 0);
  const counts = Object.fromEntries(COLS.map((c) => [c, store.list(c).length]).filter(([, n]) => n));
  return {
    hoy: today, dia: fmt.day(), hora: new Date().toTimeString().slice(0, 5),
    nexo_plan: planInfo() ? 'conectado (actualizado ' + planInfo().updatedAt.slice(0, 16).replace('T', ' ') + ')' : 'sin datos: abre NEXO PLAN una vez en este dispositivo',
    horario_hoy: (planDay(today) || []).map((b) => `${b.s}-${b.e} ${b.title} [${b.cat}]${b.estado ? ' (' + b.estado + ')' : ''}${b.ancla ? ' ⚓' : ''}`),
    horario_hoy_es_ajustado: !!planInfo()?.ajustado_hoy,
    horario_manana: (planInfo()?.manana || []).map((b) => `${b.s}-${b.e} ${b.title}`),
    tareas_pendientes: (planInfo()?.tareas || []).slice(0, 20).map((t) => ({ t: t.titulo, tipo: t.tipo, para: t.para })),
    eventos_proximos: (planInfo()?.tareas || []).filter((t) => t.para && t.para.slice(0, 10) >= today).sort((a, b) => a.para.localeCompare(b.para)).slice(0, 8).map((t) => `${t.para.replace('T', ' ')} ${t.titulo}`),
    cumplimiento_semana: planInfo()?.cumplimiento_semana || [],
    parciales_proximos: store.list('exams').filter((e) => e.date >= today).slice(0, 6).map((e) => `${e.date} ${e.title}`),
    saldos: balanceByAccount(),
    mes: { ingresos: sum(tx.filter((t) => t.type === 'ingreso')), gastos: sum(tx.filter((t) => t.type === 'gasto')) },
    ahorro: store.list('savings').map((s) => `${s.name}: ${s.saved || 0}/${s.target}`),
    cobros_pendientes: store.list('invoices').filter((i) => !i.paid).map((i) => `${i.number || ''} ${i.amount}`),
    registros_por_coleccion: counts,
  };
}

function systemPrompt() {
  return `Eres Harvey, el asistente personal del dueño de la red de apps NEXO. Lo conoces por su perfil:
${PERFIL || '(Perfil todavía vacío: pregúntale lo básico cuando haga falta.)'}

Tienes 5 cerebros, inspirados en los personajes de la serie Suits (no eres los personajes reales ni copias sus frases: hablas con su estilo, en su área y con consejos reales y concretos):
${Object.values(BRAINS).map((b) => `- ${b.emoji} ${b.name} (${b.role}): sabe de ${b.area}. Estilo: ${b.voice} Puede: ${b.puede}`).join('\n')}

Cómo respondes:
- Español de Colombia, corto y concreto. Máximo ~8 líneas salvo que pida detalle.
- Empieza cada parte con la etiqueta del cerebro que habla, en negrita, por ejemplo **⚖️ Harvey:**.
- Si el modo es "auto", elige el cerebro (o máximo dos) que más sabe del tema.
- Si el modo es "consejo" (el bufete completo), Harvey, Donna, Louis y Mike dan una línea cada uno desde su área y **👑 Jessica (decisión):** cierra con la acción a tomar.
- Si el modo nombra un cerebro, habla solo ese.
- Sé realista y da crítica constructiva con números cuando algo no cuadre.
- Termina con UNA acción concreta.

Datos: todo vive en NEXO Brain. Usa la herramienta consultar para leer detalle (el contexto de cada mensaje ya trae un resumen en vivo).
Para crear, actualizar o borrar usa crear / actualizar / borrar: la app le muestra a Cristóbal una tarjeta Sí / No antes de aplicar. No pidas confirmación por texto; llama la herramienta directamente y luego confirma el resultado.
Fechas en formato AAAA-MM-DD, horas HH:MM, dinero en pesos colombianos como número sin puntos.
Nunca leas entradas del diario marcadas como privadas.

Su horario, tareas, metas, hábitos y ejercicio viven en la app NEXO PLAN (el contexto trae su horario de hoy y mañana y sus tareas).
Tareas, exámenes y entregas: usa tarea_plan (no la colección tasks).
Reorganizar el horario: cuando pida mover, cambiar o reorganizar su día (o "agéndame", "no alcancé", "me salió algo"), usa reorganizar_dia con la lista COMPLETA de bloques de esa fecha. Respeta Colegio, Dormir y los bloques ancla (⚓) salvo que él diga lo contrario. No cambies lo que ya pasó hoy. Mete primero las tareas de prioridad alta y las que vencen pronto, deja descansos cortos y no pases de las 11 pm. El horario base de la semana no se toca: el ajuste vale solo para esa fecha.

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
      name: 'reorganizar_dia',
      description: 'Reemplaza el horario de UNA fecha con una lista nueva de bloques (no cambia el horario base semanal). Úsala para mover, agregar o quitar bloques del día según tareas y prioridades. Pide una sola confirmación Sí/No.',
      inputSchema: { type: 'object', additionalProperties: false, required: ['fecha', 'bloques'], properties: {
        fecha: { type: 'string', description: 'AAAA-MM-DD' },
        motivo: { type: 'string', description: 'Por qué se reorganiza, en pocas palabras' },
        bloques: { type: 'array', description: 'Todos los bloques del día, en orden', items: { type: 'object', additionalProperties: false, required: ['start', 'end', 'title'], properties: {
          start: { type: 'string', description: 'HH:MM' }, end: { type: 'string', description: 'HH:MM' }, title: { type: 'string' },
          cat: { type: 'string', enum: PLAN_CATS, description: 'Categoría de NEXO PLAN' },
        } } },
      } },
      run: async ({ fecha, motivo, bloques }) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) throw new Error('fecha debe ser AAAA-MM-DD');
        if (!Array.isArray(bloques) || !bloques.length) throw new Error('bloques debe ser una lista con al menos un bloque');
        const hm = /^\d{2}:\d{2}$/;
        const clean = bloques.filter((b) => b && hm.test(b.start) && hm.test(b.end) && b.title).map((b) => ({ s: b.start, e: b.end, title: String(b.title), cat: PLAN_CATS.includes(b.cat) ? b.cat : 'rutina' })).sort((a, b) => a.s.localeCompare(b.s));
        if (!clean.length) throw new Error('Ningún bloque tiene start/end HH:MM y title');
        const before = (planDay(fecha) || []).map((b) => `${b.s}-${b.e} ${b.title}`);
        const after = clean.map((b) => `${b.s}-${b.e} ${b.title}`);
        const removed = before.filter((x) => !after.includes(x)).map((x) => '− ' + x);
        const added = after.filter((x) => !before.includes(x)).map((x) => '+ ' + x);
        const body = `${motivo ? motivo + '\n\n' : ''}${[...removed, ...added].join('\n') || 'Sin cambios'}\n\nNUEVO DÍA:\n${after.join('\n')}`;
        if (!(await ui.confirm(`🗓 Reorganizar ${fmt.date(fecha)}`, body))) return 'El usuario dijo NO. El horario no cambió.';
        sendToPlan({ type: 'dayEdit', date: fecha, reason: motivo || '', blocks: clean });
        return `Enviado a NEXO PLAN: el ${fecha} queda con ${clean.length} bloques (se aplica al abrir o volver a NEXO PLAN).`;
      },
    }),
    betaTool({
      name: 'tarea_plan',
      description: 'Crea una tarea, examen, exposición o entrega en NEXO PLAN (con sus recordatorios). Pide confirmación Sí/No.',
      inputSchema: { type: 'object', additionalProperties: false, required: ['titulo'], properties: {
        titulo: { type: 'string' }, tipo: { type: 'string', enum: ['tarea', 'examen', 'expo', 'grupo'] },
        para: { type: 'string', description: 'AAAA-MM-DD o AAAA-MM-DDTHH:MM' }, materia: { type: 'string' }, notas: { type: 'string' },
      } },
      run: async ({ titulo, tipo, para, materia, notas }) => {
        if (!titulo) throw new Error('falta titulo');
        if (para && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(para)) throw new Error('para debe ser AAAA-MM-DD o AAAA-MM-DDTHH:MM');
        const body = [`Tipo: ${tipo || 'tarea'}`, para ? `Para: ${para.replace('T', ' ')}` : 'Para: mañana', materia ? `Materia: ${materia}` : '', notas || ''].filter(Boolean).join('\n');
        if (!(await ui.confirm(`➕ Nueva en NEXO PLAN · ${titulo}`, body))) return 'El usuario dijo NO.';
        sendToPlan({ type: 'task', title: titulo, tipo: tipo || 'tarea', due: para || '', subj: materia || '', notes: notas || '' });
        return 'Enviada a NEXO PLAN.';
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
  // La clave de Claude vive en el servidor (función `harvey` de Supabase). Aquí solo va tu sesión.
  const { cloud } = await import('./sync.js');
  const { HARVEY_URL } = await import('./config.js');
  const token = await cloud.token().catch(() => null);
  if (!token) throw Object.assign(new Error('Entra con Google (botón verde arriba) para hablar con Harvey.'), { code: 'nokey' });
  await loadPerfil();
  const { Anthropic } = await import('./vendor/anthropic.js');
  const client = new Anthropic({ apiKey: 'nexo', baseURL: HARVEY_URL, dangerouslyAllowBrowser: true, defaultHeaders: { Authorization: 'Bearer ' + token } });
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
  ['✅ Nueva tarea', 'Agrega en NEXO PLAN la tarea: '],
  ['🗓 Reorganizar mi día', 'Reorganiza mi día de hoy desde ahora según mis tareas pendientes y prioridades. Mantén el colegio y los compromisos con clientes.'],
  ['📅 Bloque de estudio', 'Agéndame un bloque de estudio de '],
  ['📈 Resumen semanal', 'Haz mi revisión semanal: cumplimiento de horario, hábitos, plata y negocio. Qué mejorar.'],
];

export function mountChat(root, { appId, initial = '', compact = false } = {}) {
  injectCSS();
  root.innerHTML = `<div class="hv ${compact ? 'compact' : ''}">
    <div class="hv-modes" role="group" aria-label="Cerebro">
      ${[['auto', '✨ Auto'], ...Object.entries(BRAINS).map(([k, b]) => [k, `${b.emoji} ${b.name}`]), ['consejo', '🏛 Bufete']].map(([k, l]) => `<button type="button" data-mode="${k}">${l}</button>`).join('')}
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
      const server = err?.error?.error?.message;
      const msg = err.code === 'nokey' ? err.message
        : server ? server
        : status === 401 ? 'Tu sesión venció. Vuelve a entrar con Google.'
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
}

function harveySettings(root) {
  const wrap = document.createElement('div');
  wrap.className = 'hv-cfg card';
  wrap.innerHTML = `<h3>⚙︎ Ajustes de Harvey</h3><form class="form">
    <p class="muted" style="margin:0">🔒 La clave de Claude vive en el servidor de Supabase, no en este dispositivo. Tope de gasto: US$0,50 al día.</p>
    <p class="muted" id="hvUso" style="margin:0">Gasto de hoy: consultando…</p>
    <div class="field"><label for="hm">Modelo</label><select id="hm">${MODELS.map(([k, l]) => `<option value="${k}" ${prefs.get('model', MODEL_DEFAULT) === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="hv" ${prefs.get('voiceReply', false) ? 'checked' : ''}> Harvey responde en voz alta</label>
    <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="ha" ${prefs.get('autoSendVoice', true) ? 'checked' : ''}> Enviar solo al terminar de hablar</label>
    <div class="row end"><button type="button" class="btn btn-cancel sm" data-x>Cerrar</button><button class="btn btn-create sm">Guardar</button></div></form>`;
  root.querySelector('.hv').prepend(wrap);
  const close = () => wrap.parentNode && wrap.parentNode.removeChild(wrap);
  import('./sync.js').then(async ({ cloud }) => {
    const el = wrap.querySelector('#hvUso');
    if (!cloud.user()) { el.textContent = 'Entra con Google para ver tu gasto.'; return; }
    const sb = await cloud.client();
    const hoy = fmt.today();
    const { data } = await sb.from('uso_ia').select('costo_usd,fecha').gte('fecha', hoy.slice(0, 8) + '01');
    const dia = (data || []).filter((r) => r.fecha === hoy).reduce((a, r) => a + Number(r.costo_usd), 0);
    const mes = (data || []).reduce((a, r) => a + Number(r.costo_usd), 0);
    el.textContent = `Gasto de hoy: US$${dia.toFixed(3)} · este mes: US$${mes.toFixed(2)}`;
  }).catch(() => {});
  wrap.querySelector('[data-x]').onclick = close;
  wrap.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    prefs.set('model', wrap.querySelector('#hm').value);
    prefs.set('voiceReply', wrap.querySelector('#hv').checked);
    prefs.set('autoSendVoice', wrap.querySelector('#ha').checked);
    close();
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
