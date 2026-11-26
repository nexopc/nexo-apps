// Esquema ÚNICO de datos de la red NEXO.
// Las apps usan estos campos en sus formularios y Harvey los usa para leer y escribir.
// Para agregar un campo o una colección nueva, hazlo aquí y todas las apps + Harvey lo conocen.


export const SCHEMA = {
  // NEXO Plan (horario, tareas, metas, hábitos, diario) vive en la app NEXO PLAN → ver core/planlink.js

  // ---------- NEXO Finanzas ----------
  accounts: { app: 'finanzas', label: 'Cuentas y bolsillos', fields: [
    { k: 'name', label: 'Nombre', required: true, ph: 'Personal, Nequi, NEXO PC…' },
    { k: 'kind', label: 'Tipo', type: 'select', options: ['Personal', 'Negocio', 'Ahorro', 'Efectivo'] },
    { k: 'initial', label: 'Saldo inicial', type: 'money', default: 0 }, { k: 'color', label: 'Color', type: 'color' },
  ] },
  transactions: { app: 'finanzas', label: 'Ingresos y gastos', fields: [
    { k: 'type', label: 'Tipo', type: 'select', options: [['gasto', '🔴 Gasto'], ['ingreso', '🟢 Ingreso'], ['traslado', '🔵 Traslado entre cuentas']], default: 'gasto' },
    { k: 'amount', label: 'Valor', type: 'money', required: true }, { k: 'title', label: 'Concepto', required: true },
    { k: 'category', label: 'Categoría', type: 'select', options: ['Comida', 'Transporte', 'Estudio', 'Herramientas', 'Equipos', 'Publicidad', 'Servicios', 'Ocio', 'Salud', 'Familia', 'Cliente', 'Salario tienda', 'Otro'] },
    { k: 'account', label: 'Cuenta', type: 'ref', ref: 'accounts' }, { k: 'toAccount', label: 'Hacia (solo traslados)', type: 'ref', ref: 'accounts' },
    { k: 'date', label: 'Fecha', type: 'date', today: true }, { k: 'job', label: 'Trabajo relacionado', type: 'ref', ref: 'jobs', refLabel: 'title' },
  ] },
  budgets: { app: 'finanzas', label: 'Presupuesto mensual por categoría', fields: [
    { k: 'category', label: 'Categoría', required: true }, { k: 'limit', label: 'Límite mensual', type: 'money', required: true },
  ] },
  savings: { app: 'finanzas', label: 'Metas de ahorro', fields: [
    { k: 'name', label: 'Meta', required: true, ph: 'Abrir NEXO PC' }, { k: 'target', label: 'Valor objetivo', type: 'money', required: true },
    { k: 'saved', label: 'Ahorrado', type: 'money', default: 0 }, { k: 'due', label: 'Fecha objetivo', type: 'date' },
    { k: 'account', label: 'Cuenta donde se guarda', type: 'ref', ref: 'accounts' },
  ] },
  subscriptions: { app: 'finanzas', label: 'Suscripciones y pagos fijos', fields: [
    { k: 'name', label: 'Nombre', required: true, ph: 'Filmora, Claude, internet…' }, { k: 'amount', label: 'Valor', type: 'money', required: true },
    { k: 'cycle', label: 'Cada', type: 'select', options: [['mes', 'Mes'], ['año', 'Año'], ['semana', 'Semana']] },
    { k: 'nextDate', label: 'Próximo pago', type: 'date' }, { k: 'account', label: 'Cuenta', type: 'ref', ref: 'accounts' },
  ] },
  alerts: { app: 'finanzas', label: 'Alertas personalizadas', fields: [
    { k: 'title', label: 'Alerta', required: true, ph: 'Avisar si gasto más de $50.000 en ocio' }, { k: 'active', label: 'Activa', type: 'check', default: true },
  ] },

  // ---------- NEXO Negocios ----------
  sources: { app: 'negocios', label: 'Fuentes de ingreso', fields: [
    { k: 'name', label: 'Fuente', required: true, ph: 'Agencia de marketing, Edición de video, Webs…' }, { k: 'color', label: 'Color', type: 'color' },
    { k: 'account', label: 'Cuenta de Finanzas', type: 'ref', ref: 'accounts' },
  ] },
  services: { app: 'negocios', label: 'Catálogo de servicios', fields: [
    { k: 'name', label: 'Servicio', required: true }, { k: 'source', label: 'Fuente', type: 'ref', ref: 'sources' },
    { k: 'price', label: 'Precio', type: 'money', required: true }, { k: 'hours', label: 'Horas estimadas', type: 'number' },
    { k: 'desc', label: 'Qué incluye', type: 'textarea' },
  ] },
  combos: { app: 'negocios', label: 'Combos', fields: [
    { k: 'name', label: 'Combo', required: true }, { k: 'items', label: 'Servicios incluidos (separados por coma)', type: 'textarea' },
    { k: 'price', label: 'Precio del combo', type: 'money', required: true },
  ] },
  clients: { app: 'negocios', label: 'Clientes', fields: [
    { k: 'name', label: 'Cliente / negocio', required: true }, { k: 'contact', label: 'Contacto (WhatsApp)', ph: '300…' },
    { k: 'kind', label: 'Tipo', type: 'select', options: ['Tienda local', 'Emprendedor', 'Empresa', 'Persona'] }, { k: 'note', label: 'Notas', type: 'textarea' },
  ] },
  jobs: { app: 'negocios', label: 'Trabajos y entregas', fields: [
    { k: 'title', label: 'Trabajo', required: true }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'source', label: 'Fuente', type: 'ref', ref: 'sources' }, { k: 'price', label: 'Valor acordado', type: 'money' },
    { k: 'due', label: 'Entrega', type: 'date' },
    { k: 'status', label: 'Estado', type: 'select', options: [['cotizado', 'Cotizado'], ['aprobado', 'Aprobado'], ['en curso', 'En curso'], ['entregado', 'Entregado'], ['pagado', 'Pagado']], default: 'cotizado' },
  ] },
  timeLogs: { app: 'negocios', label: 'Tiempo trabajado (cronómetro)', fields: [
    { k: 'job', label: 'Trabajo', type: 'ref', ref: 'jobs', refLabel: 'title' }, { k: 'minutes', label: 'Minutos', type: 'number', required: true },
    { k: 'date', label: 'Fecha', type: 'date', today: true },
  ] },
  invoices: { app: 'negocios', label: 'Cobros y cuentas de cobro', fields: [
    { k: 'number', label: 'N.º', ph: 'CC-001' }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'job', label: 'Trabajo', type: 'ref', ref: 'jobs', refLabel: 'title' }, { k: 'amount', label: 'Valor', type: 'money', required: true },
    { k: 'date', label: 'Fecha', type: 'date', today: true }, { k: 'due', label: 'Vence', type: 'date' },
    { k: 'paid', label: 'Pagado (crea ingreso en Finanzas)', type: 'check' }, { k: 'account', label: 'Entra a la cuenta', type: 'ref', ref: 'accounts' },
  ] },
  prospects: { app: 'negocios', label: 'Prospectos', fields: [
    { k: 'name', label: 'Negocio', required: true }, { k: 'contact', label: 'Contacto' },
    { k: 'stage', label: 'Etapa', type: 'select', options: [['nuevo', 'Nuevo'], ['contactado', 'Contactado'], ['reunión', 'Reunión'], ['propuesta', 'Propuesta enviada'], ['ganado', 'Ganado ✅'], ['perdido', 'Perdido']], default: 'nuevo' },
    { k: 'next', label: 'Próximo paso', ph: 'Escribirle el jueves' }, { k: 'nextDate', label: 'Fecha próximo paso', type: 'date' },
  ] },

  // ---------- NEXO Studio ----------
  ideas: { app: 'studio', label: 'Banco de ideas', fields: [
    { k: 'title', label: 'Idea', required: true }, { k: 'for', label: 'Para', type: 'select', options: ['NEXO PC', 'Agencia', 'Cliente', 'Personal'] },
    { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' }, { k: 'platform', label: 'Red', type: 'select', options: ['TikTok', 'Instagram Reels', 'YouTube', 'YouTube Shorts', 'Facebook'] },
    { k: 'hook', label: 'Gancho (primeros 3 segundos)', type: 'textarea' },
  ] },
  scripts: { app: 'studio', label: 'Guiones', fields: [
    { k: 'title', label: 'Título', required: true }, { k: 'mold', label: 'Molde', type: 'select', options: ['Gancho-Problema-Solución-CTA', 'Antes y después', 'Top 3', 'Mito vs realidad', 'Unboxing / review', 'Tutorial rápido'] },
    { k: 'body', label: 'Guion', type: 'textarea' }, { k: 'cta', label: 'Llamado a la acción' },
  ] },
  shoots: { app: 'studio', label: 'Horarios de grabación', fields: [
    { k: 'title', label: 'Grabación', required: true }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'date', label: 'Fecha', type: 'date' }, { k: 'time', label: 'Hora', type: 'time' }, { k: 'place', label: 'Lugar' },
    { k: 'checklist', label: 'Checklist (una por línea)', type: 'textarea', default: 'Batería cargada\nMemoria libre\nMicrófono\nLuz\nGuion impreso\nPlanos de apoyo (B-roll)' },
  ] },
  videos: { app: 'studio', label: 'Estado de cada video', fields: [
    { k: 'title', label: 'Video', required: true }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'status', label: 'Estado', type: 'select', options: [['idea', '💡 Idea'], ['guion', '📝 Guion'], ['grabado', '🎥 Grabado'], ['edicion', '✂️ Edición'], ['revision', '👀 Revisión'], ['publicado', '✅ Publicado']], default: 'idea' },
    { k: 'platform', label: 'Red', type: 'select', options: ['TikTok', 'Instagram Reels', 'YouTube', 'YouTube Shorts', 'Facebook'] },
    { k: 'publishDate', label: 'Fecha de publicación', type: 'date' }, { k: 'link', label: 'Enlace', type: 'url' },
  ] },
  references: { app: 'studio', label: 'Referencias guardadas', fields: [
    { k: 'title', label: 'Qué me gustó', required: true }, { k: 'link', label: 'Enlace', type: 'url' }, { k: 'note', label: 'Nota', type: 'textarea' },
  ] },
  metrics: { app: 'studio', label: 'Métricas', fields: [
    { k: 'video', label: 'Video', type: 'ref', ref: 'videos', refLabel: 'title' }, { k: 'date', label: 'Fecha', type: 'date', today: true },
    { k: 'views', label: 'Vistas', type: 'number' }, { k: 'likes', label: 'Me gusta', type: 'number' }, { k: 'shares', label: 'Compartidos', type: 'number' },
    { k: 'followers', label: 'Seguidores ganados', type: 'number' },
  ] },
  portfolio: { app: 'studio', label: 'Portafolio', fields: [
    { k: 'title', label: 'Proyecto', required: true }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'link', label: 'Enlace', type: 'url' }, { k: 'result', label: 'Resultado (números)', ph: '+12.000 vistas, 30 mensajes' }, { k: 'show', label: 'Mostrar a clientes', type: 'check', default: true },
  ] },

  // ---------- NEXO Aprende ----------
  subjects: { app: 'aprende', label: 'Materias del colegio', fields: [
    { k: 'name', label: 'Materia', required: true }, { k: 'teacher', label: 'Profesor(a)' }, { k: 'color', label: 'Color', type: 'color' },
  ] },
  grades: { app: 'aprende', label: 'Notas', fields: [
    { k: 'subject', label: 'Materia', type: 'ref', ref: 'subjects' }, { k: 'title', label: 'Evaluación', required: true },
    { k: 'value', label: 'Nota (1.0 a 5.0)', type: 'number', step: 0.1, required: true }, { k: 'weight', label: 'Porcentaje %', type: 'number', default: 100 },
    { k: 'date', label: 'Fecha', type: 'date', today: true },
  ] },
  exams: { app: 'aprende', label: 'Parciales y evaluaciones', fields: [
    { k: 'title', label: 'Evaluación', required: true }, { k: 'subject', label: 'Materia', type: 'ref', ref: 'subjects' },
    { k: 'date', label: 'Fecha', type: 'date', required: true }, { k: 'topics', label: 'Temas', type: 'textarea' },
  ] },
  routes: { app: 'aprende', label: 'Rutas de aprendizaje', fields: [
    { k: 'title', label: 'Paso / lección', required: true },
    { k: 'route', label: 'Ruta', type: 'select', options: ['Filmora 16', 'Claude Code', 'Marketing digital', 'Saber 11', 'Universidad (Nanotecnología)', 'Hardware y gaming'] },
    { k: 'order', label: 'Orden', type: 'number' }, { k: 'link', label: 'Recurso', type: 'url' }, { k: 'done', label: 'Completado', type: 'check' },
  ] },
  english: { app: 'aprende', label: 'Inglés (vocabulario y práctica)', fields: [
    { k: 'term', label: 'Palabra / frase', required: true }, { k: 'meaning', label: 'Significado' }, { k: 'example', label: 'Ejemplo', type: 'textarea' },
    { k: 'level', label: 'Nivel', type: 'select', options: ['A1', 'A2', 'B1', 'B2'] },
  ] },
  flashcards: { app: 'aprende', label: 'Tarjetas de repaso', fields: [
    { k: 'front', label: 'Pregunta', required: true }, { k: 'back', label: 'Respuesta', required: true },
    { k: 'deck', label: 'Mazo', ph: 'Química, Saber 11, Inglés…' }, { k: 'box', label: 'Caja (1 a 5)', type: 'number', default: 1 }, { k: 'nextDate', label: 'Próximo repaso', type: 'date' },
  ] },
  notes: { app: 'aprende', label: 'Apuntes', fields: [
    { k: 'title', label: 'Título', required: true }, { k: 'subject', label: 'Materia', type: 'ref', ref: 'subjects' }, { k: 'body', label: 'Apunte', type: 'textarea' },
  ] },
};

export const fieldsOf = (col) => SCHEMA[col]?.fields || [];

// Descripción compacta para Harvey
export function schemaForAI() {
  return Object.entries(SCHEMA).map(([col, s]) => {
    const f = s.fields.map((x) => {
      let t = x.type || 'texto';
      if (x.type === 'select') t = 'uno de: ' + x.options.map((o) => (Array.isArray(o) ? o[0] : o)).join('|');
      if (x.type === 'ref') t = `id de ${x.ref}`;
      if (x.type === 'money') t = 'número en COP';
      if (x.type === 'date') t = 'AAAA-MM-DD';
      if (x.type === 'time') t = 'HH:MM';
      if (x.type === 'check') t = 'true/false';
      return `${x.k} (${t})`;
    }).join(', ');
    return `- ${col} [${s.app}] ${s.label}: ${f}`;
  }).join('\n');
}
