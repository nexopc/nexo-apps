# NEXO Apps — Arquitectura base

## Decisiones por defecto (cambiables)
| Tema | Decisión |
|---|---|
| Código | HTML + JavaScript sin compilación (PWA). Un solo código que se adapta a Android, iOS y Windows (`core/platform.js` + `core/nexo.css`). Empaquetado nativo opcional después con Capacitor/Tauri. |
| Datos | Supabase (plan gratis): login con Google, tabla `registros` en tiempo real con RLS, cola sin internet. |
| Seguridad | Google login + PIN; huella/Face ID vía passkeys (fase 2: biometría nativa). |
| IA | API de Claude. 5 cerebros: Harvey, Mike, Louis, Donna, Jessica. |
| Permisos IA | Toda escritura muestra tarjeta de confirmación Sí / No. |
| Estilo | Base oscura NEXO + color de acento propio por app. |
| Actualizaciones | Cada app es un paquete independiente en `apps/`, con su versión y botón "Actualizar". |

## Respuestas del proyecto (25-nov-2026)
| Tema | Decisión de Cristóbal |
|---|---|
| Presupuesto IA/servidores | Hasta $50.000 COP/mes |
| Dispositivos | Android, iPhone y Windows por igual |
| Apple | Solo iPhone, sin Mac → iOS como PWA instalada desde Safari |
| Programación | Nivel cero: Claude programa todo |
| Enfoque | Que funcione primero, aprender después |
| Asistente | Texto y voz en ambos sentidos |
| Qué cerebro responde | Elige la IA, lo elijo yo, o todos opinan y Donna resume |
| Permisos IA | Todo cambio se confirma con un botón Sí / No |
| Uso | Solo personal por ahora; preparado para varios usuarios (posible venta) |
| Sin internet | Sí, con sincronización después |
| Integraciones | Gmail |
| Estilo | Tablero oscuro, colores llamativos sin exceso gamer; cada app con estilo y logo propios |
| Cuestionarios | Siempre en formato tocable (artifact "NEXO Cuestionarios") |

## Estructura del repo
```
nexo-apps/
├─ index.html   # Hub: todas las apps, agregar app, agregar dispositivo
├─ sw.js        # sin internet + una caché por app (actualizaciones independientes)
├─ core/
│  ├─ store.js       # NEXO Brain: datos locales + tiempo real entre apps
│  ├─ sync.js        # login con Google + Supabase en tiempo real
│  ├─ schema.js      # esquema ÚNICO de datos (apps + Harvey)
│  ├─ shell.js       # barra, navegación por SO, formularios, botón ⟳, ajustes
│  ├─ security.js    # PIN + Face ID / huella (passkey)
│  ├─ harvey.js      # IA: 5 cerebros, herramientas con confirmación Sí/No, voz
│  ├─ automations.js # cobro pagado → ingreso; parcial/grabación → agenda
│  ├─ platform.js    # iOS / Android / Windows
│  └─ vendor/        # SDK de Claude y Supabase empaquetados
├─ apps/
│  ├─ finanzas/   # NEXO Finanzas · tu plata      (acento: verde)
│  ├─ negocios/   # NEXO Negocios · tu trabajo    (acento: naranja)
│  ├─ studio/     # NEXO Studio · tu contenido    (acento: rosa)
│  ├─ aprende/    # NEXO Aprende · tu estudio     (acento: amarillo)
│  └─ harvey/     # Harvey · tu asistente         (acento: dorado)
└─ docs/
```

## Cerebros y áreas
| Cerebro | Área | Lee principalmente |
|---|---|---|
| ⚖️ Harvey | Estrategia, negociación, cerrar clientes | Negocios, Plan (metas) |
| 📚 Mike | Aprendizaje, memoria, análisis rápido | Aprende, Studio |
| 📊 Louis | Números, detalle, cobros, disciplina | Finanzas, Negocios (cobros) |
| 💜 Donna | Agenda, personas, hábitos, intuición | Plan, clientes |
| 👑 Jessica | Visión a 4 años, liderazgo, NEXO PC | Todas (resumen semanal) |

## Código de color de botones (igual en todas las apps)
| Color | Acción |
|---|---|
| 🟢 Verde | Crear / agregar / ingreso |
| 🔴 Rojo | Borrar / gasto / alerta |
| 🔵 Azul | Editar / ver detalle |
| 🟡 Amarillo | Pendiente / recordatorio |
| 🟣 Morado | Preguntar a la IA |
| ⚪ Gris | Cancelar / volver |

## Flujo de datos entre apps
- Negocios → cobro pagado → crea ingreso en Finanzas.
- Studio → grabación con cliente → bloque en Plan + trabajo en Negocios.
- Aprende → parcial → fecha en Plan + bloques de estudio.
- Harvey → lee y escribe en todas (con confirmación en dinero).

## Orden de construcción
1. `core` + `ui` + NEXO Plan (MVP: horario, tareas, hábitos)
2. NEXO Finanzas
3. Harvey (con datos reales de 1 y 2)
4. Negocios → Studio → Aprende

## Pendientes / riesgos
- WhatsApp: solo vía WhatsApp Business API (Meta, verificación y costo por conversación). WhatsApp personal no se puede automatizar.
- Instagram: API de Meta solo para cuentas profesionales.
- iOS nativo requiere Mac + cuenta Apple (US$99/año). Mientras tanto: PWA instalada desde Safari.

## NEXO Plan = app NEXO PLAN (repo nexopc/Nexo-plan)
- La app oficial de tiempo es NEXO PLAN (APK + web en nexopc.github.io/Nexo-plan). La Plan nueva de esta red se retiró.
- Puente (`core/planlink.js` ↔ `Nexo-plan/docs/js/nexo-bridge.js`), mismo sitio nexopc.github.io:
  - NEXO PLAN → `nexo:data:planBridge`: horario de hoy y mañana, tareas pendientes, cumplimiento de la semana.
  - Red NEXO → `nexo:plan:inbox`: `dayEdit` (Harvey reorganiza un día) y `task` (tareas, exámenes de Aprende, grabaciones de Studio).
- Harvey usa `reorganizar_dia` y `tarea_plan`, siempre con tarjeta Sí / No.
