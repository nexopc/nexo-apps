// Esquema ÚNICO de datos de la red NEXO.
// Las apps usan estos campos en sus formularios y Harvey los usa para leer y escribir.
// Para agregar un campo o una colección nueva, hazlo aquí y todas las apps + Harvey lo conocen.


export const SCHEMA = {
  // ---------- NEXO Plan (nuevo, dentro de la red) ----------
  bloques: { app: 'plan', label: 'Horario base semanal', fields: [
    { k: 'title', label: 'Bloque', required: true, ph: 'Colegio, Calle: buscar clientes, Gimnasio…' },
    { k: 'days', label: 'Días (0=lun … 6=dom)', type: 'days', default: [0, 1, 2, 3, 4] },
    { k: 'start', label: 'Empieza', type: 'time', required: true }, { k: 'end', label: 'Termina', type: 'time', required: true },
    { k: 'fixed', label: '🔒 Fijo (no se mueve: colegio, clases, dormir)', type: 'check' },
    { k: 'cat', label: 'Tipo', type: 'select', options: [['estudio', '📚 Estudio'], ['trabajo', '💼 Trabajo'], ['cliente', '🤝 Cliente'], ['contenido', '🎬 Contenido'], ['salud', '💪 Salud'], ['personal', '🙂 Personal'], ['descanso', '😴 Descanso']], default: 'trabajo' },
  ] },
  agenda: { app: 'plan', label: 'Agenda de un día (bloques sueltos, organizados o de Harvey)', fields: [
    { k: 'title', label: 'Bloque', required: true }, { k: 'date', label: 'Fecha', type: 'date', today: true, required: true },
    { k: 'start', label: 'Empieza', type: 'time', required: true }, { k: 'end', label: 'Termina', type: 'time', required: true },
    { k: 'fixed', label: '🔒 Fijo (cita, cliente, examen)', type: 'check' },
    { k: 'cat', label: 'Tipo', type: 'select', options: [['estudio', '📚 Estudio'], ['trabajo', '💼 Trabajo'], ['cliente', '🤝 Cliente'], ['contenido', '🎬 Contenido'], ['salud', '💪 Salud'], ['personal', '🙂 Personal'], ['descanso', '😴 Descanso']], default: 'trabajo' },
    { k: 'done', label: 'Hecho', type: 'check' },
  ] },
  dias: { app: 'plan', label: 'Días ajustados (id = fecha; blocks reemplaza el horario base de esa fecha)', hidden: true, fields: [{ k: 'reason', label: 'Motivo' }] },
  hechos: { app: 'plan', label: 'Bloques del horario base marcados como hechos (id = fecha)', hidden: true, fields: [{ k: 'keys', label: 'Bloques' }] },
  proyectos: { app: 'plan', label: 'Proyectos', fields: [
    { k: 'name', label: 'Proyecto', required: true, ph: 'App catálogo de Quibdó' },
    { k: 'status', label: 'Estado', type: 'select', options: [['idea', '💡 Idea'], ['activo', '🟢 Activo'], ['pausado', '⏸ Pausado'], ['futuro', '📅 Empieza en una fecha'], ['terminado', '✅ Terminado']], default: 'activo' },
    { k: 'start', label: 'Empieza (si es futuro)', type: 'date' }, { k: 'goal', label: '¿Qué es terminarlo?', type: 'textarea' },
    { k: 'color', label: 'Color', type: 'color' },
  ] },
  tareas: { app: 'plan', label: 'Tareas (prioridad = importancia × urgencia)', fields: [
    { k: 'title', label: 'Tarea', required: true, ph: 'Pequeña: 15 a 45 minutos' }, { k: 'project', label: 'Proyecto', type: 'ref', ref: 'proyectos' },
    { k: 'imp', label: 'Importancia (1 a 5)', type: 'scale', default: 3 }, { k: 'urg', label: 'Urgencia (1 a 5)', type: 'scale', default: 3 },
    { k: 'minutes', label: 'Minutos que toma', type: 'number', default: 30 }, { k: 'due', label: 'Para cuándo', type: 'date' },
    { k: 'done', label: 'Hecha', type: 'check' },
  ] },


  // ---------- NEXO Finanzas ----------
  accounts: { app: 'finanzas', label: 'Cuentas y bolsillos', fields: [
    { k: 'name', label: 'Nombre', required: true, ph: 'Personal, Nequi, NEXO PC…' },
    { k: 'kind', label: 'Tipo', type: 'select', options: ['Personal', 'Negocio', 'Ahorro', 'Efectivo', 'Tarjeta de crédito', 'Tarjeta débito', 'Billetera digital'] },
    { k: 'currency', label: 'Moneda', type: 'select', options: ['COP', 'USD', 'EUR'], default: 'COP' },
    { k: 'initial', label: 'Saldo inicial (en su moneda)', type: 'number', default: 0 }, { k: 'color', label: 'Color', type: 'color' },
  ] },
  transactions: { app: 'finanzas', label: 'Ingresos y gastos', fields: [
    { k: 'type', label: 'Tipo', type: 'select', options: [['gasto', '🔴 Gasto'], ['ingreso', '🟢 Ingreso'], ['traslado', '🔵 Traslado entre cuentas']], default: 'gasto' },
    { k: 'amount', label: 'Valor en pesos', type: 'money', required: true }, { k: 'title', label: 'Concepto', required: true },
    { k: 'currency', label: 'Moneda original', type: 'select', options: ['COP', 'USD', 'EUR'], default: 'COP' },
    { k: 'amountCur', label: 'Valor en la moneda original', type: 'number' },
    { k: 'category', label: 'Categoría', type: 'select', options: ['Comida', 'Transporte', 'Datos', 'Estudio', 'Herramientas', 'Equipos', 'Publicidad', 'Servicios', 'Suscripciones', 'Ocio', 'Salud', 'Familia', 'Cliente', 'Anticipo', 'Venta', 'Salario tienda', 'Regalo', 'Alcancía', 'Otro'] },
    { k: 'account', label: 'Cuenta', type: 'ref', ref: 'accounts' }, { k: 'toAccount', label: 'Hacia (solo traslados)', type: 'ref', ref: 'accounts' },
    { k: 'date', label: 'Fecha', type: 'date', today: true }, { k: 'job', label: 'Trabajo relacionado', type: 'ref', ref: 'jobs', refLabel: 'title' },
  ] },
  budgets: { app: 'finanzas', label: 'Presupuesto mensual por categoría', fields: [
    { k: 'category', label: 'Categoría', required: true }, { k: 'limit', label: 'Límite mensual', type: 'money', required: true },
  ] },
  savings: { app: 'finanzas', label: 'Metas de ahorro', fields: [
    { k: 'name', label: 'Meta', required: true, ph: 'Abrir NEXO PC' }, { k: 'target', label: 'Valor objetivo', type: 'money', required: true },
    { k: 'kind', label: 'Tipo', type: 'select', options: [['meta', '🎯 Meta con fecha'], ['alcancia', '🪙 Alcancía de monedas'], ['bolsillo', '👝 Bolsillo libre']], default: 'meta' },
    { k: 'saved', label: 'Ahorrado', type: 'money', default: 0 }, { k: 'due', label: 'Fecha objetivo', type: 'date' },
    { k: 'account', label: 'Cuenta donde se guarda', type: 'ref', ref: 'accounts' },
  ] },
  subscriptions: { app: 'finanzas', label: 'Suscripciones y pagos fijos', fields: [
    { k: 'name', label: 'Nombre', required: true, ph: 'Filmora, Claude, internet…' }, { k: 'amount', label: 'Valor', type: 'number', required: true },
    { k: 'currency', label: 'Moneda', type: 'select', options: ['COP', 'USD', 'EUR'], default: 'COP' },
    { k: 'cycle', label: 'Cada', type: 'select', options: [['mes', 'Mes'], ['año', 'Año'], ['semana', 'Semana']] },
    { k: 'nextDate', label: 'Próxima renovación', type: 'date' }, { k: 'account', label: 'Se paga con (cuenta o tarjeta)', type: 'ref', ref: 'accounts' },
  ] },
  alerts: { app: 'finanzas', label: 'Alertas personalizadas', fields: [
    { k: 'title', label: 'Alerta', required: true, ph: 'Avisar si gasto más de $50.000 en ocio' }, { k: 'active', label: 'Activa', type: 'check', default: true },
  ] },

  // ---------- NEXO Negocios ----------
  sources: { app: 'negocios', label: 'Empresas / fuentes de ingreso', fields: [
    { k: 'name', label: 'Empresa o marca', required: true, ph: 'NEXO PC, Agencia, Marca personal…' }, { k: 'color', label: 'Color', type: 'color' },
    { k: 'lema', label: 'Lema' }, { k: 'cliente', label: 'Cliente ideal' },
    { k: 'estado', label: 'Estado', type: 'select', options: [['activa', '🟢 Activa'], ['pausada', '⏸ Pausada'], ['futura', '📅 Empieza en una fecha']], default: 'activa' },
    { k: 'inicio', label: 'Empieza (si es futura)', type: 'date' }, { k: 'metaMes', label: 'Meta de ingresos al mes', type: 'money' },
    { k: 'account', label: 'Cuenta de Finanzas', type: 'ref', ref: 'accounts' },
  ] },
  services: { app: 'negocios', label: 'Catálogo de servicios', fields: [
    { k: 'name', label: 'Servicio', required: true, ph: 'Páginas web' }, { k: 'source', label: 'Marca', type: 'ref', ref: 'sources' },
    { k: 'plan', label: 'Plan', type: 'select', options: ['Básico', 'Pro', 'Premium', 'Esencial', 'Completo', 'Élite', 'Único'] },
    { k: 'price', label: 'Precio', type: 'money', required: true }, { k: 'monthly', label: 'Mensualidad (si aplica)', type: 'money' },
    { k: 'mensual', label: 'Es un servicio mensual', type: 'check' }, { k: 'hours', label: 'Horas estimadas', type: 'number' },
    { k: 'videos', label: 'Videos que incluye (Studio los crea solos al aprobar)', type: 'number' },
    { k: 'costos', label: 'Costos por trabajo (datos, transporte, materiales…)', type: 'money' },
    { k: 'anticipo', label: 'Anticipo %', type: 'number', default: 50 }, { k: 'entrega', label: 'Tiempo de entrega', ph: '5 días hábiles' },
    { k: 'desc', label: 'Qué incluye', type: 'textarea' }, { k: 'noIncluye', label: 'No incluye', type: 'textarea' },
  ] },
  combos: { app: 'negocios', label: 'Combos', fields: [
    { k: 'name', label: 'Combo', required: true }, { k: 'source', label: 'Marca', type: 'ref', ref: 'sources' }, { k: 'para', label: 'Para', ph: 'Persona, Negocio…' },
    { k: 'items', label: 'Qué incluye', type: 'textarea' },
    { k: 'separate', label: 'Precio por separado', type: 'money' }, { k: 'price', label: 'Precio del combo', type: 'money', required: true },
  ] },
  registroDiario: { app: 'negocios', label: 'Registro diario de ventas (se llena cada noche)', fields: [
    { k: 'date', label: 'Fecha', type: 'date', today: true },
    { k: 'contactos', label: 'Contactos nuevos', type: 'number' }, { k: 'seguimientos', label: 'Seguimientos', type: 'number' },
    { k: 'cotizaciones', label: 'Cotizaciones', type: 'number' }, { k: 'ventas', label: 'Ventas', type: 'number' },
    { k: 'videos', label: 'Videos publicados', type: 'number' }, { k: 'horasProd', label: 'Horas de producción', type: 'number', step: 0.5 },
    { k: 'cobrado', label: 'Plata cobrada hoy (se suma a Finanzas)', type: 'money' },
    { k: 'funciono', label: '¿Qué funcionó?', type: 'textarea' }, { k: 'nofunciono', label: '¿Qué no funcionó?', type: 'textarea' },
    { k: 'top1', label: 'Lo número 1 de mañana' },
  ] },
  config: { app: 'negocios', label: 'Configuración y metas (Plan $10M)', hidden: true, fields: [{ k: 'nombre', label: 'Nombre' }] },
  clients: { app: 'negocios', label: 'Clientes', fields: [
    { k: 'name', label: 'Cliente / negocio', required: true }, { k: 'contact', label: 'WhatsApp', ph: '300 555 1234' },
    { k: 'source', label: 'Empresa que lo atiende', type: 'ref', ref: 'sources' },
    { k: 'negocio', label: 'Tipo de negocio', ph: 'Barbería, droguería, restaurante…' }, { k: 'address', label: 'Dirección', ph: 'Barrio, calle…' },
    { k: 'color', label: 'Color (Studio)', type: 'color' }, { k: 'ig', label: 'Instagram', ph: '@negocio' }, { k: 'tiktok', label: 'TikTok', ph: '@negocio' }, { k: 'fb', label: 'Facebook' },
    { k: 'email', label: 'Correo', type: 'url', ph: 'cliente@correo.com' }, { k: 'note', label: 'Notas', type: 'textarea' },
  ] },
  jobs: { app: 'negocios', label: 'Trabajos y entregas', fields: [
    { k: 'title', label: 'Trabajo', required: true }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'source', label: 'Empresa', type: 'ref', ref: 'sources' }, { k: 'price', label: 'Valor acordado', type: 'money' },
    { k: 'anticipo', label: 'Anticipo %', type: 'number', default: 50 }, { k: 'due', label: 'Entrega', type: 'date' },
    { k: 'status', label: 'Estado', type: 'select', options: [['aprobado', 'Aprobado'], ['en curso', 'En curso'], ['entregado', 'Entregado'], ['pagado', 'Pagado']], default: 'aprobado' },
  ] },
  timeLogs: { app: 'negocios', label: 'Tiempo trabajado (cronómetro)', fields: [
    { k: 'job', label: 'Trabajo', type: 'ref', ref: 'jobs', refLabel: 'title' }, { k: 'minutes', label: 'Minutos', type: 'number', required: true },
    { k: 'date', label: 'Fecha', type: 'date', today: true }, { k: 'label', label: 'Qué hiciste' },
    { k: 'kind', label: 'Tipo', type: 'select', options: [['trabajo', 'Trabajo'], ['estudio', 'Estudio'], ['otro', 'Otro']], default: 'trabajo' },
  ] },
  invoices: { app: 'negocios', label: 'Cobros y cuentas de cobro', fields: [
    { k: 'number', label: 'N.º', ph: 'CC-001' }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'job', label: 'Trabajo', type: 'ref', ref: 'jobs', refLabel: 'title' }, { k: 'amount', label: 'Valor', type: 'money', required: true },
    { k: 'date', label: 'Fecha', type: 'date', today: true }, { k: 'due', label: 'Vence', type: 'date' },
    { k: 'paid', label: 'Pagado (crea ingreso en Finanzas)', type: 'check' }, { k: 'account', label: 'Entra a la cuenta', type: 'ref', ref: 'accounts' },
  ] },
  cotizaciones: { app: 'negocios', label: 'Cotizaciones (borrador, enviada, aprobada, vencida, rechazada)', hidden: true, fields: [{ k: 'title', label: 'Cotización' }] },
  abonos: { app: 'negocios', label: 'Abonos y pagos de clientes (entran solos a Finanzas)', fields: [
    { k: 'job', label: 'Trabajo', type: 'ref', ref: 'jobs', refLabel: 'title', required: true }, { k: 'amount', label: 'Valor', type: 'money', required: true },
    { k: 'kind', label: 'Tipo', type: 'select', options: [['anticipo', 'Anticipo'], ['abono', 'Abono'], ['saldo', 'Saldo final']], default: 'abono' },
    { k: 'date', label: 'Fecha', type: 'date', today: true }, { k: 'account', label: 'Entra a la cuenta', type: 'ref', ref: 'accounts' },
  ] },
  clientLog: { app: 'negocios', label: 'Notas y mensajes de cada cliente', hidden: true, fields: [{ k: 'text', label: 'Nota' }] },
  misiones: { app: 'negocios', label: 'Misiones del día (automáticas, tuyas o de Claude)', fields: [
    { k: 'title', label: 'Misión', required: true }, { k: 'date', label: 'Día', type: 'date', today: true }, { k: 'minutes', label: 'Minutos', type: 'number', default: 30 },
    { k: 'done', label: 'Cumplida', type: 'check' },
  ] },
  prospects: { app: 'negocios', label: 'Prospectos', fields: [
    { k: 'name', label: 'Negocio', required: true }, { k: 'contact', label: 'WhatsApp' },
    { k: 'temp', label: '¿Qué tan caliente?', type: 'select', options: [['caliente', '🔥 Caliente'], ['tibio', '🌤 Tibio'], ['frio', '❄️ Frío']], default: 'tibio' },
    { k: 'interest', label: 'Qué le interesa', ph: 'Redes, página web, video, PC…' }, { k: 'potential', label: 'Cuánto le podría cobrar', type: 'money' },
    { k: 'origin', label: 'Cómo lo conocí', type: 'select', options: ['Calle', 'Referido', 'Instagram', 'WhatsApp', 'TikTok', 'Otro'] },
    { k: 'next', label: 'Próximo paso', ph: 'Escribirle el jueves' }, { k: 'nextDate', label: 'Fecha del próximo paso', type: 'date' },
    { k: 'stage', label: 'Estado', type: 'select', options: [['nuevo', 'En proceso'], ['ganado', 'Ganado ✅'], ['perdido', 'Perdido']], default: 'nuevo' },
  ] },

  // ---------- NEXO Studio ----------
  ideas: { app: 'studio', label: 'Banco de ideas', fields: [
    { k: 'title', label: 'Idea', required: true }, { k: 'tags', label: 'Etiquetas', ph: 'humor, tutorial, antes/después, testimonio, tendencia' }, { k: 'link', label: 'Link de referencia', type: 'url' }, { k: 'for', label: 'Para', type: 'select', options: ['NEXO PC', 'Agencia', 'Cliente', 'Personal'] },
    { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' }, { k: 'platform', label: 'Red', type: 'select', options: ['TikTok', 'Instagram Reels', 'YouTube', 'YouTube Shorts', 'Facebook'] },
    { k: 'hook', label: 'Gancho (primeros 3 segundos)', type: 'textarea' },
  ] },
  scripts: { app: 'studio', label: 'Guiones', fields: [
    { k: 'title', label: 'Título', required: true }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' }, { k: 'mold', label: 'Molde', type: 'select', options: ['Gancho-Problema-Solución-CTA', 'Antes y después', 'Top 3', 'Mito vs realidad', 'Unboxing / review', 'Tutorial rápido'] },
    { k: 'body', label: 'Guion', type: 'textarea' }, { k: 'cta', label: 'Llamado a la acción' },
  ] },
  shoots: { app: 'studio', label: 'Horarios de grabación', fields: [
    { k: 'title', label: 'Grabación', required: true }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'date', label: 'Fecha', type: 'date' }, { k: 'time', label: 'Hora', type: 'time' }, { k: 'place', label: 'Lugar' },
    { k: 'checklist', label: 'Checklist (una por línea)', type: 'textarea', default: 'Batería cargada\nMemoria libre\nMicrófono\nLuz\nGuion impreso\nPlanos de apoyo (B-roll)' },
  ] },
  videos: { app: 'studio', label: 'Estado de cada video', fields: [
    { k: 'title', label: 'Video', required: true }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'status', label: 'Estado', type: 'select', options: [['idea', '💡 Idea'], ['guion', '📝 Guion'], ['grabar', '🎥 Grabar'], ['editar', '✂️ Editar'], ['entregar', '📤 Entregar'], ['publicado', '✅ Publicado']], default: 'idea' },
    { k: 'due', label: 'Entrega', type: 'date' }, { k: 'tags', label: 'Etiquetas', ph: 'antes/después, tutorial…' },
    { k: 'platform', label: 'Red', type: 'select', options: ['TikTok', 'Instagram Reels', 'YouTube', 'YouTube Shorts', 'Facebook'] },
    { k: 'publishDate', label: 'Fecha de publicación', type: 'date' }, { k: 'link', label: 'Enlace', type: 'url' },
    { k: 'script', label: 'Guion', type: 'ref', ref: 'scripts', refLabel: 'title' }, { k: 'shoot', label: 'Grabación', type: 'ref', ref: 'shoots', refLabel: 'title' },
  ] },
  lugares: { app: 'studio', label: 'Lugares de grabación', fields: [
    { k: 'name', label: 'Lugar', required: true, ph: 'Barbería Flow' }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
    { k: 'address', label: 'Dirección' }, { k: 'luz', label: 'Luz', ph: 'Natural por la tarde, fluorescente adentro…' },
    { k: 'enchufes', label: 'Enchufes', ph: '2 junto al espejo' }, { k: 'horario', label: 'Mejor horario para grabar', ph: 'Lunes 2–5 p. m.' }, { k: 'note', label: 'Notas', type: 'textarea' },
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

  contentPlans: { app: 'studio', label: 'Planes de contenido mensuales por cliente', fields: [
    { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients', required: true }, { k: 'month', label: 'Mes (AAAA-MM)', required: true, ph: '2026-12' },
    { k: 'note', label: 'Nota', type: 'textarea' },
  ] },
  clips: { app: 'studio', label: 'Biblioteca de clips', fields: [
    { k: 'title', label: 'Clip', required: true, ph: 'Toma aérea de Quibdó, manos armando PC…' }, { k: 'link', label: 'Enlace o ubicación', ph: 'Drive, carpeta, celular…' },
    { k: 'tags', label: 'Etiquetas', ph: 'b-roll, tienda, noche' }, { k: 'client', label: 'Cliente', type: 'ref', ref: 'clients' },
  ] },

  // ---------- Harvey ----------
  memoria: { app: 'harvey', label: 'Lo que los cerebros aprendieron de ti', fields: [
    { k: 'text', label: 'Dato', required: true }, { k: 'brain', label: 'Cerebro', type: 'select', options: ['harvey', 'donna', 'louis', 'mike', 'jessica'] },
  ] },

  // ---------- NEXO Aprende ----------
  topics: { app: 'aprende', label: 'Temas de estudio (ficha por tema)', fields: [
    { k: 'name', label: 'Tema', required: true, ph: 'Filmora 16, Matemáticas, Inglés…' },
    { k: 'type', label: 'Tipo', type: 'select', options: [['fija', '🔒 Clase fija (horario del colegio o curso)'], ['obligatoria', '❗ Obligatoria (tiene que estudiarse)'], ['flexible', '↔ Flexible (cuando haya tiempo)']], default: 'flexible' },
    { k: 'hoursWeek', label: 'Horas por semana que necesita (obligatoria o flexible)', type: 'number', step: 0.5, default: 2 },
    { k: 'classDays', label: 'Días de clase (solo clase fija)', type: 'days', default: [] },
    { k: 'classTime', label: 'Hora de la clase', type: 'time' }, { k: 'classMinutes', label: 'Duración de la clase (min)', type: 'number', default: 60 },
    { k: 'imp', label: 'Importancia (1 a 5)', type: 'scale', default: 3 }, { k: 'urg', label: 'Urgencia (1 a 5)', type: 'scale', default: 3 },
    { k: 'color', label: 'Color', type: 'color' }, { k: 'notes', label: 'Notas', type: 'textarea' },
  ] },
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
