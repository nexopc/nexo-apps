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

## 3. Cuenta de Google + respaldo (Firebase, gratis) — 15 min
1. Entra a https://console.firebase.google.com → **Agregar proyecto** → nombre `nexo-apps` (sin Analytics).
2. **Authentication → Comenzar → Google → Habilitar**.
   En *Settings → Authorized domains* agrega `nexopc.github.io`.
3. **Firestore Database → Crear base de datos** → modo producción → región `southamerica-east1`.
   En la pestaña **Reglas** pega el contenido de `firestore.rules` y publica.
4. **Configuración del proyecto (⚙︎) → Tus apps → Web (</>)** → registra `nexo-web` → copia los valores
   `apiKey`, `authDomain`, `projectId`, `appId` en `core/config.js`.
5. Sube el cambio a GitHub. En cada app: ⚙︎ Ajustes → **Entrar con Google**.

> La `apiKey` de Firebase NO es secreta (identifica el proyecto). Lo que protege tus datos son las reglas del paso 3.

## 4. Cerebro de Harvey (API de Claude)
1. Crea cuenta en https://platform.claude.com → **Billing**: carga US$5 y pon **límite mensual** (ej. US$10).
2. **API Keys → Create key** → cópiala.
3. Abre Harvey → **⚙︎ Ajustes de Harvey** → pega la clave → Guardar. Se guarda solo en ese dispositivo.
4. Modelo: **Automático** por defecto. Registros rápidos usan Haiku 5.5 (barato), conversación normal Sonnet 5.5 y análisis, planes o el consejo usan Opus 5.5 (el más capaz). Se puede fijar uno en los ajustes.

Costo aproximado con Opus 5.5 y uso diario normal (≈10 mensajes/día): US$5–10/mes (≈ $20.000–40.000 COP).
Con Haiku 5.5: menos de US$1/mes.

## 5. Seguridad en el dispositivo
⚙︎ Ajustes → **Poner PIN** (4 dígitos) → **Face ID / huella**. Aplica a todas las apps NEXO de ese dispositivo.

## 6. Actualizar
- Cada app tiene su botón **⟳** arriba. Si hay versión nueva, aparece un punto amarillo. Actualizar una app **no toca** las otras ni tus datos.
- El Hub tiene **⟳ Actualizar núcleo** (diseño, seguridad, Harvey).
- Para publicar una versión nueva de una app: cambia el código en `apps/<app>/`, sube el número en `apps/<app>/version.json` y en `VERSION` de su `app.js`.

## 7. Copias de seguridad
⚙︎ Ajustes → **Exportar copia** descarga todo en un archivo `.json`. **Importar copia** lo restaura.
