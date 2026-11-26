# Conexiones externas (fase 2) — WhatsApp, Instagram, Gmail con n8n

```
WhatsApp Business ─┐
Instagram (pro) ───┼─► Meta webhooks ─► Cloudflare Tunnel ─► n8n (PC viejo o VPS)
Gmail ─────────────┘                                            │
                                                                ▼
                                         Supabase: tabla registros (inbox, metrics)
                                                                │
                                                                ▼
                                    NEXO Negocios / Studio  +  Harvey (lee y propone)
```

| Conexión | Qué hace | Requisito | Costo |
|---|---|---|---|
| WhatsApp | Mensajes nuevos de clientes → `inbox`; Harvey propone respuesta; tú confirmas | WhatsApp Business Platform (Cloud API) + número de negocio | Responder dentro de 24 h: gratis. Plantillas de marketing: centavos de dólar c/u |
| Instagram | Alcance, seguidores, vistas → `metrics` en Studio; DMs y comentarios | Cuenta Creador/Empresa + app de Meta en modo desarrollo | Gratis |
| Gmail | Resumen de correos de clientes | Permiso de Gmail (OAuth) en n8n | Gratis |

## Pasos
1. PC viejo con Ubuntu Server + Docker → `docker run -d --restart unless-stopped -p 5678:5678 -v n8n:/home/node/.n8n n8nio/n8n`.
2. Cloudflare Tunnel con tu dominio (ej. `n8n.nexopc.co`) para que Meta pueda enviar avisos.
3. En n8n: nodo **Webhook** (Meta) → nodo **Supabase** que escribe en `registros` (coleccion inbox).
4. NEXO lee `inbox` igual que cualquier otra colección; Harvey ya la puede consultar si se agrega al esquema (`core/schema.js`).

> WhatsApp personal NO se conecta: las herramientas no oficiales pueden hacer que Meta bloquee tu número.
