# NEXO Negocios v3 — ficha de diseño (acordada con Cristóbal, 27 nov 2026)

Estilo: **mezcla** — panel de plata arriba (estilo "panel de ventas") + lista de clientes tipo WhatsApp.
Color naranja, tema oscuro, tamaño como el boceto. Bocetos: pantallas 1–6 (Al abrir, Cliente, Cotizar, ＋ Crear, Nuevo plan, Nuevo combo).

## Navegación
Barra: **Clientes · Prospectos · Cotizar · Mi día · Más** (Más: Planes y combos, Cobros, Cronómetro, Empresas).

## 1 · Al abrir (Clientes)
- Grande: **cobrado del mes** vs meta del mes, semáforo y "por cobrar".
- Lista de clientes, **lo urgente primero** (cobrar / seguimiento hoy), luego por fecha.
- Cada fila: último movimiento · cuánto debe · cuándo hablaron · empresa.
- Filtros: Todos · Por cobrar · Sin respuesta.

## 2 · Ficha del cliente
- Datos: WhatsApp, dirección, tipo de negocio, redes (Instagram/TikTok/Facebook).
- Historia tipo chat: cotizaciones, aprobado, trabajo, abonos, notas.
- Botones: WhatsApp (elige plantilla) · Cotizar · Cobrar · Nota.
- Plantillas: Seguimiento · Recordatorio de pago · Trabajo listo · Saludo / promo.

## Prospectos (lista aparte, simple)
- Datos: próximo paso + fecha, qué le interesa, cómo lo conocí, 🔥/🌤/❄️, **cuánto le podría cobrar**.
- Resumen arriba: calientes · plata posible · seguimientos hoy.
- Ordenados por próximo paso. Al ganar → pasa a Clientes.

## 3 · Cotizar
- Se puede **cotizar sin cliente**: primero el precio, al final a quién va (buscar o crear).
- **Un servicio por cotización** (para varios, existen los combos).
- Descuentos: fundador −10 % (3 cupos) · a mano (% o valor) · por pago completo · cliente que repite.
- Salida: **PDF sin logo** con datos de contacto, cómo pagar, términos (qué no incluye, tiempo de entrega, **válida 3 días**, cambios) y espacio "Acepto" (nombre y fecha).
- Envío: **botón Compartir con el PDF** (WhatsApp, Gmail u otra). En PC: descarga + correo.
- Después: recordar seguir a los 2 días · botón "✅ Aprobó" (crea trabajo + cobro del anticipo) · vence sola a los 3 días y ofrece reenviar.
- "Ver si la abrió": V2 (requiere enlace web).

## Trabajos
Aprobado → En curso → Entregado → Pagado (con fecha de cada paso).

## Cobros
Abonos con saldo (anticipo, abonos, saldo final). Cada abono entra solo a NEXO Finanzas.

## ＋ Crear (en cualquier momento, también desde Cotizar)
- Empresa: nombre, color, meta del mes, estado (activa / pausada / empieza en fecha).
- Servicio.
- Plan con calculadora: hora mínima **$ 35.000**, horas, costos, ganancia % → mínimo y sugerido; tu precio (rojo si va por debajo del mínimo).
  Campos: qué incluye, qué NO incluye, mensual o pago único, anticipo %, tiempo de entrega.
- Combo: elegir planes, descuento %, precio y ahorro del cliente; aviso si queda bajo el mínimo.

## Mi día (cada noche, lo más corto posible)
Contactos y seguimientos (− / ＋) · cotizaciones y ventas (solas) · horas (del cronómetro) · qué funcionó / qué no.

## Cronómetro
Amarrado a un trabajo del cliente **o** libre con nombre.

## Avisos
Cotización sin respuesta (2 días) · cobro vencido · entrega cercana (1 día antes).

## Datos privados
Datos de cobro (Nequi, cuenta, cédula) **no van en el código**: se escriben en Ajustes → Mis datos de cobro y se guardan en Supabase.

## 🎯 Misiones secundarias (para cumplir la meta del día)
- **De dónde salen (3 fuentes):**
  1. **Automáticas** cada mañana, de tus datos: cobrar saldos ("Cobra $ 715.500 a La 24"), seguimientos ("Escríbele a Barbería Flow"), prospectos calientes, contactos que faltan, entregas cercanas.
  2. **Tuyas**: puedes crear tus propias misiones en cualquier momento.
  3. **De Claude**: cuando organizamos tu semana (en el chat con el conector de Supabase, o la tarea del domingo cuando tenga el conector), Claude deja misiones para cada día en la colección `misiones`.
- **Cuántas**: según la meta. Semáforo rojo → más misiones (5), amarillo → 4, verde → 3.
- **Conexión con el horario**: las misiones salen en NEXO PLAN → ⚡ Organizar como propuestas en tus ratos Libre; tú eliges y aplicas. Las que tienen hora (visita, entrega, cita con cliente) van con esa hora.
- **Se marcan solas** cuando haces la acción en la app (registras el cobro, envías la cotización, anotas el seguimiento). También se pueden marcar a mano.
- **Sin premios** (ni puntos ni rachas): solo la lista y su avance.
- Se ven en: NEXO Negocios (arriba de Clientes, en "Mi día") y NEXO PLAN (Mi día / ⚡ Organizar). Harvey las lee.
