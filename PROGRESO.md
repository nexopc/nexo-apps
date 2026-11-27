# PROGRESO — red NEXO

## Hecho
- [x] Hub + 5 apps + Harvey (PWA), diseño por sistema, PIN y huella, botón ⟳ por app
- [x] NEXO PLAN oficial + reorganizar el día con IA + puente con la red
- [x] GitHub Pages activo · cada app se instala por separado

## Fase A · Configurar (antes del "listo")
- [x] A1 Cuenta de Supabase
- [x] A2 Conector de Supabase en claude.ai
- [x] A3 Proyecto `nexo`: tablas, RLS y Realtime (por el conector)
- [x] A4 Login con Google (cliente OAuth)
- [ ] A5 Clave de Claude como secreto de Supabase, con límite de gasto (pendiente: cuando entre el primer pago)
- [x] A6 "listo"

## Fase B · Actualizar (después del "listo")
- [x] B1 NEXO Brain → Supabase (tiempo real, modo sin internet, migrar datos locales)
- [x] B2 Harvey → Edge Function; chat compartido; cerebros con su papel
- [x] B3 NEXO PLAN → Supabase
- [x] B4 Plan de ventas: cotizador, meta con semáforo, registro diario
- [x] B5 Colores mezclados + panel de 4 botones
- [x] B6 Pruebas en los 3 sistemas y publicar

## Fase C · v2 (orden "Plata primero")
- [x] C1 Global: ‹ Atrás siempre visible en iPhone (no depende del navegador) + deslizar desde el borde; atrás = cierra ventana → Inicio → Hub; ventanas con ✕ y deslizar hacia abajo; notas rápidas 📝 (una línea + Enter, carpetas, vínculo a registros); cronómetro común con burbuja ⏱ en todas las apps
- [x] C2 Finanzas v2: registrar en 3 toques (qué → cuánto con botones que suman → de dónde), moneda por movimiento COP/USD/EUR, ＋ cuenta/tarjeta al instante, saldos en su moneda, bolsillos + alcancía 🪙, suscripciones con la cuenta que paga, tasas automáticas y editables
- [x] C3 Negocios v2: fuentes por empresa (estado, meta del mes), planes con horas reales/costos → ganancia por hora y precio mínimo automáticos, calculadora de costo, cronómetro conectado a la burbuja
- [x] Probado (simulado) en iPhone 14, Pixel 7 y Windows: todas las secciones abren sin errores ni desbordes
- [x] C4 Studio v2: tablero + línea de metro por video, guion 100 % modular (12 tipos de bloque, mover, duplicar, deshacer), orden de grabación por lugar y persona con tomas y cortes, plan de contenido mensual por cliente (enviar por WhatsApp, aprobado / pide cambios), idea rápida con voz, biblioteca con búsqueda y reusar guiones
- [x] C5 NEXO Plan nuevo (`apps/plan`): horario base fijo/flexible, "solo hoy" vs "todos los días", días ajustados, organizador por importancia × urgencia (sin choques, deshacer), semana, proyectos con estado y pasos; Aprende v2: fichas por tema, estudiar con el cronómetro, clases fijas al Plan, agendar lo que falta
- [x] C6 Harvey v2: varios cerebros a la vez (usa Opus), avisos de los 5 cerebros, reporte diario en el chat (uno por día), notificación del dispositivo, Mi vida en números, memoria (recordar con Sí/No), reorganizar_dia y tarea_plan escriben en el Plan nuevo; Hub solo "Mis apps"
- [x] C8 Fusión de NEXO Plan (pedido de Cristóbal, 27 nov): la app oficial es el NEXO PLAN de siempre (diseño, Hoy, Semana, Ejercicio, Progreso). Metas → 🚀 Proyectos (6 áreas + propios con estado; sus metas siguen igual) + ✅ Tareas 1–5 en NEXO Brain; ⚡ Organizar en Mi día con propuesta, "No cupo" y "Probar mañana"; bloques 🔒 fijos / ↔ flexibles; `apps/plan` queda como redirección
- [x] C8b NEXO PLAN 1.9: sin metas en ningún lado (Proyectos, Mi día, Semana, Progreso, asistente); cada proyecto = nombre + notas + tareas
- [x] C8c NEXO PLAN 1.10: ‹ Atrás en iPhone (barra y pantallas completas), ✕ y deslizar en ventanas, borde izquierdo y atrás del navegador
- [x] C9 Actualizaciones sin fallas: service worker "red primero" (con internet siempre carga lo nuevo), versión del núcleo en el botón ⟳, recarga sola al estrenar versión
## Fase D · una app a la vez, a fondo
- [x] D1 NEXO Negocios 3 (según `docs/NEGOCIOS_V3.md`): arriba lo cobrado del mes vs la meta con semáforo y lo que te deben; abajo los clientes como en WhatsApp (lo urgente primero, buscar, filtros). Ficha con historia tipo chat, 4 plantillas de WhatsApp, cotizaciones (✅ Aprobó crea el trabajo y pide el anticipo), trabajos en 4 pasos, abonos con saldo que entran solos a Finanzas, notas. Cotizar sin cliente con descuentos (fundador, repite, pago completo, a mano) y PDF sin logo para compartir (vence a los 3 días). Prospectos aparte (🔥🌤❄️, próximo paso, ganado → cliente). Mi día (contactos/seguimientos ± y lo demás automático). Planes, combos, empresas y servicios con calculadora en cualquier momento. Mis datos de cobro en la cuenta, no en el código.
- [x] D1b 🎯 Misiones secundarias 100 % automáticas (`core/misiones.js`): cobrar, seguimientos, prospectos del día, entregas, contactos y cotizar; cuántas según el semáforo (rojo 5 · amarillo 4 · verde 3); se marcan solas al hacer la acción; NEXO PLAN 1.11 las propone en ⚡ Organizar (naranja) y al hacerlas allá se marcan en Negocios; Harvey las ve
- [x] Arreglo: Harvey "reorganiza mi día" fallaba sin mostrar la tarjeta Sí/No
- [x] D2 NEXO Studio 3 (según `docs/STUDIO_V3.md`): inicio con 🎙 idea por voz, 📍 lo que se graba hoy por lugar y 🎬 videos con línea de metro (color por cliente). Guion en árbol estilo claqueta (E1·A·T2): escena (lugar, luz, fecha, utilería, qué prepara el cliente) → plano (tipo, segundos, movimiento, qué se ve) → 🗺 mapa arrastrable, 📷 cámara, 🧍 personas, 🔤 en pantalla, ✅ tomas; plantillas, duplicar, mover, deshacer, dictar. Modo grabación por lugar (un plano grande, toma buena, siguiente). Editar: lista sacada del guion con pasos de Filmora 16 + ⏱ horas por video. Entregar: link, texto con hashtags, mensaje de WhatsApp, resultados a 7 días. Plan del mes por cliente (calendario, PDF, aprobó / pidió cambios). Lugares con fotos (Supabase Storage privado `fotos`) y mapa base. Números. PDF del guion para el cliente.
- [x] D2b Conexiones: plan de Negocios con "videos que incluye" → al aprobar crea los videos; escena con fecha y hora → cita 🔒 fija en NEXO PLAN 1.12 (se actualiza si cambia); misiones de Studio (guion, editar, preparar, resultados) en ⚡ Organizar; avisos (día antes, entrega cercana, idea vieja, resultados); Harvey ve los videos en producción
- [ ] C7 Semana base: tarea programada creada (domingos 5:43 p. m.), pero **sin el conector de Supabase**: hay que agregárselo desde claude.ai → Tareas programadas. Mientras tanto la semana se arma con ⚡ Organizar.
- [x] Pruebas: 8 baterías con Playwright en iPhone 14, Pixel 7 y Windows (atrás, notas, cronómetro, Finanzas, Negocios, Plan, Aprende, Studio, Harvey, Hub)

## Siguiente
- [ ] Primer inicio de sesión real con Google en Android, iPhone y PC (comprobar A4)
- [ ] Guardar el perfil privado en Supabase (tabla `perfil`) para que Harvey te conozca
- [ ] A5 clave de Claude → probar Harvey real
