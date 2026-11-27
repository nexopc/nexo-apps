# NEXO Studio 3 — ficha de diseño (acordada con Cristóbal, 27 nov 2026)

Uso principal: **videos de clientes**. Dolor #1: **se le olvidan las ideas**.
Acento rosa `#FF4F9A`, tema oscuro, mismo tamaño que los bocetos (`studio-estilos.png`, `studio-guion.png`).

## Inicio (mezcla A + C)
1. **🎙 Idea por voz** arriba (un toque, dicta, queda guardada; dice cuántas ideas sin usar).
2. **📍 Hoy se graba**: planos de hoy agrupados por lugar (hora, luz/utilería, ✓ por plano) + "✂️ por editar".
3. **🎬 En producción**: cada video con su **línea de metro** (Idea → Guion → Grabar → Editar → Entregar → Publicado), cliente y siguiente paso.
- Barra: 🎬 Videos · 💡 Ideas · 📍 Grabar · 🗓 Plan · ⋯ Más.

## Guion en árbol
```
🎬 VIDEO   cliente · objetivo · duración · 9:16 · gancho 3 s · llamado a la acción · música
 └ 🏠 ESCENA   lugar · ambiente · luz · hora · utilería · vestuario · sonido
    └ 🎥 PLANO   tipo (general/medio/primer plano/detalle) · segundos · movimiento
       ├ 🗺 Mapa visual   vista desde arriba; arrastrar 📷 🧍 💡 🪑 📦; flecha/cono de lo que mira la cámara
       ├ 📷 Cámara        dónde se ubica · qué mira · altura/ángulo · zoom · trípode/mano
       ├ 🧍 Persona(s)    qué dice · dónde está · qué hace · expresión
       ├ 🔤 En pantalla   texto/subtítulo/efecto de Filmora
       └ ✅ Grabado       tomas (T1, T2…) y cuál es la buena
```
- Abrir/cerrar nodos; ⋮ mover, duplicar, borrar (con deshacer).

## Grabar (ordenado por lugar)
- Junta los planos de todos los videos que se graban en el mismo lugar.
- Un plano grande a la vez: mapa, cámara, qué dice, en pantalla; tomas ＋; "✅ Grabado · siguiente".

## Editar (Filmora 16)
- ⏱ Cronómetro de edición (cronómetro común → Negocios usa las horas para el precio real).
- Lista de edición sacada del guion: cortes, textos en pantalla, música, subtítulos, exportar 9:16.
- Tomas buenas de cada plano.
- Pasos de Filmora 16 para cada efecto del guion.

## Conexiones
- **Negocios**: mismos clientes; un trabajo aprobado (ej. 8 reels) crea sus videos solos.
- **NEXO PLAN**: fecha + lugar de grabación → bloque 🔒 fijo con lugar y lista de planos.
- **Aprobación**: PDF del guion para WhatsApp + plan del mes completo (calendario) para aprobar.

## Detalles (ronda 2 y 3)
- **Ideas**: lista aparte **y** botón para pasarla a video cuando quiera (el video empieza en la estación Idea). Etiquetas (humor, tutorial, antes/después, testimonio, tendencia). Idea con 7 días sin usar → aviso.
- **Plan del mes**: calendario en cuadrícula por cliente, cada día con su video y estado; se comparte por WhatsApp (PDF/imagen) para aprobar.
- **PDF del guion** (para el cliente): escenas con qué se ve y qué se dice + fecha/hora/lugar de grabación y qué debe preparar el cliente. Sin mapas técnicos.
- **Entregar / Publicado**: link del video, texto para publicar (copy + hashtags), plantilla de WhatsApp "Tu video está listo" con el link, resultados (vistas y likes) a los 7 días.
- **Lugares guardados**: dirección, luz, enchufes, horario, fotos de referencia y **mapa base** (puerta, mostrador, silla…); en cada plano solo se mueven cámara y persona sobre ese mapa.
- **Avisos**: día antes de grabar (qué llevar + qué prepara el cliente), entrega cercana sin editar, idea vieja (7 días), anotar resultados a los 7 días.
- **Crear rápido**: plantillas de plano (general, medio, primer plano, detalle, POV… con cámara y movimiento llenos), duplicar plano/escena, dictar el plano (llena qué dice / descripción).
- Solo el plano es obligatorio; mapa, cámara y persona son opcionales.

## Detalles (ronda 4)
- **Editar**: arriba la **lista de edición** (sacada del guion); el cronómetro va en la burbuja ⏱; debajo tomas buenas y pasos de Filmora 16.
- **Color por cliente** (el mismo de Negocios): línea de metro, calendario y Hoy.
- **PC**: árbol a la izquierda + plano abierto a la derecha con el mapa grande para arrastrar con el mouse.
- **Numeración estilo claqueta**: Escena 1 · Plano A · Toma 2 (se reordena sola al mover).

## Detalles (ronda 5, última)
- **Video**: solo el nombre es obligatorio.
- **Fotos** (lugares y referencias): en Supabase Storage, bucket privado por usuario (RLS `auth.uid()`), comprimidas en el dispositivo (~1280 px, JPG).
- **Números**: videos entregados del mes (por cliente y total), horas por video (guion + grabar + editar), lo que mejor funciona (etiquetas/tipos con más vistas), ideas usadas.
- **Misiones de Studio** (mismo motor `core/misiones.js`): terminar guion, editar lo que se entrega pronto, preparar grabación, anotar resultados; entran en ⚡ Organizar.

## Cambios (27 nov 2026, después de usarla)
- **Clientes desde Studio**: ⋯ Más → 👥 Clientes, "＋ Cliente nuevo" al crear un video y en los datos del video (son los mismos de Negocios; nombre, WhatsApp, tipo de negocio y color).
- **Guion = esquema libre**: ＋ Escena, ＋ Plano, ＋ 🧍 Diálogo, 📷 Cámara, 🗺 Mapa, 🔤 Texto, 📝 Nota en el orden que quiera, **sin llenar nada**; todo se escribe ahí mismo (nombre de escena, quién habla, qué dice…) cuando lo sepa. ⋮ en cada cosa: subir, bajar, duplicar, borrar (con deshacer); en plano también tipo/segundos/movimiento; en escena lugar/fecha.
- **Mapa por plano**: cada plano puede tener su mapa (y usar el mapa base del lugar como punto de partida).
- Modelo: el plano guarda sus elementos en `items` en orden (`persona`, `camara`, `mapa`, `pantalla`, `nota`); los planos viejos se convierten solos.
