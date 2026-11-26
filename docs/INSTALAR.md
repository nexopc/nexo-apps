# Cómo poner a funcionar NEXO (paso a paso)

## 1. Publicarla en internet (gratis) — 5 min
1. En GitHub abre `nexopc/nexo-apps` → **Settings → Pages**.
2. *Source*: **Deploy from a branch** → rama `main` (o la rama de trabajo) → carpeta `/ (root)` → **Save**.
3. En 1-2 minutos queda en `https://nexopc.github.io/nexo-apps/`.

## 2. Instalarla en cada dispositivo
| Sistema | Cómo |
|---|---|
| Android (Chrome) | Abre el enlace → menú ⋮ → **Instalar app**. Instala el Hub y cada app que quieras como ícono aparte. |
| iPhone (Safari) | Abre el enlace → botón **Compartir** → **Agregar a inicio**. |
| Windows (Edge/Chrome) | Abre el enlace → ícono de instalar en la barra de direcciones → **Instalar**. Queda en el menú Inicio. |

## 3. Cuenta de Google + nube (Supabase, gratis) — ya configurado
- Proyecto Supabase `nexo` (región us-east-1). Tablas: `registros` (todas las apps), `perfil` (privado), `uso_ia`, `plantillas`. RLS: cada fila solo la ve su dueño.
- Login con Google: cliente OAuth en Google Cloud + proveedor Google en Supabase. Redirect URLs: `https://nexopc.github.io/nexo-apps/**` y `https://nexopc.github.io/Nexo-plan/**`.
- En cada app: botón verde **Entrar con Google** (una vez por dispositivo; la sesión la comparten todas las apps NEXO y NEXO PLAN).
- Claude lee tus datos desde cualquier chat con el **conector de Supabase** en claude.ai.

## 4. Cerebro de Harvey (API de Claude)
- La clave vive SOLO en Supabase como secreto `ANTHROPIC_API_KEY` de la función `harvey` (nunca en el celular).
- Para ponerla: platform.claude.com → compra créditos (mínimo de la consola) con **límite mensual** → API keys → crea `nexo-harvey` → pídele a Claude que abra el formulario de secreto de Supabase y pégala ahí.
- Tope automático de gasto: US$0,50 al día (variable `HARVEY_LIMITE_DIA_USD`). El gasto se ve en ⚙︎ Ajustes de Harvey.
- Modelo automático: Haiku (registros rápidos) · Sonnet (conversación) · Opus (análisis, planes, bufete).

## 5. Seguridad en el dispositivo
⚙︎ Ajustes → **Poner PIN** (4 dígitos) → **Face ID / huella**. Aplica a todas las apps NEXO de ese dispositivo.

## 6. Actualizar
- Cada app tiene su botón **⟳** arriba. Si hay versión nueva, aparece un punto amarillo. Actualizar una app **no toca** las otras ni tus datos.
- El Hub tiene **⟳ Actualizar núcleo** (diseño, seguridad, Harvey).
- Para publicar una versión nueva de una app: cambia el código en `apps/<app>/`, sube el número en `apps/<app>/version.json` y en `VERSION` de su `app.js`.

## 7. Copias de seguridad
⚙︎ Ajustes → **Exportar copia** descarga todo en un archivo `.json`. **Importar copia** lo restaura.
