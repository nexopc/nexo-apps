# NEXO — guía técnica para Claude
Español de Colombia, directo, con números, por partes y con ejemplos.
Datos personales del dueño (perfil, horario, metas): **no van en este repo público**; viven en Supabase (tabla `perfil`).

## Decisiones técnicas (26 nov 2026)
| Tema | Decisión |
|---|---|
| Apps | Se mantienen las PWA actuales (HTML + JS sin compilar) y se mejoran. Expo queda para V2. |
| Base de datos | Supabase: un proyecto, login con Google, tiempo real entre dispositivos, RLS `user_id = auth.uid()` en todas las tablas. |
| IA | Clave de Claude solo como secreto de Supabase (Edge Function `harvey`), nunca en el navegador. Modelo automático: Haiku · Sonnet · Opus. |
| Claude en el chat | Lee los datos con el conector de Supabase. |
| NEXO Plan | (27 nov 2026) NEXO Plan nuevo dentro de la red (`apps/plan`): horario base fijo/flexible, días ajustados, proyectos, tareas 1–5 importancia × urgencia, organizador automático. NEXO PLAN clásico (repo Nexo-plan) sigue funcionando y sale en el Hub como "clásico" hasta que se retire. |
| Plan de ventas | Servicios, precios, combos, meta diaria y registro diario se cargan como datos en Supabase (no en el código). |
| Colores | Base actual + acentos del documento de diseño; panel de 4 botones en el mismo lugar. |
| Cerebros | Donna agenda · Louis contabilidad · Harvey estrategia y clientes (jefe) · Mike astuto y analítico · Jessica visión. Inspirados en Suits; frases originales. |
| Cambios hechos por Harvey | Siempre con tarjeta Sí / No. |
| Semana base | Claude la arma cada domingo (tarea programada, sin gastar créditos de la API); Harvey y el organizador la ajustan en la semana. |
| Avisos | Notificaciones locales del dispositivo + mensaje en el chat de Harvey (push real con servidor queda para V2). |

## Reglas
- Cambio → prueba en Android, iPhone y Windows → Git → `PROGRESO.md`.
- Nunca claves ni datos personales en el código o en el repo.
- "sigamos" = leer `PROGRESO.md` y continuar. "cambio:" = actualizar docs primero. Ideas → `IDEAS_V2.md`.
