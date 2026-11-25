# NEXO Apps — Red de aplicaciones de NEXO PC

> *Excelencia digital, confianza real.*

Todas las apps de NEXO PC en un solo lugar. Cada app es una **PWA**: se abre con un enlace,
se instala en el celular (Android o iPhone) y funciona sin internet.

**Portada de la red:** `https://nexopc.github.io/nexo-apps/`

## Mapa de la red

| # | App | Para quién | Estado | Enlace |
|---|-----|-----------|--------|--------|
| 1 | NEXO Finanzas | Cristóbal (uso propio) | ✅ Publicada (repo `nexo-finanzas`) | `nexopc.github.io/nexo-finanzas/` |
| 2 | App de oro y préstamos | Cliente | ✅ Publicada (repo `nexo-finanzas`, carpeta `oro`) | `nexopc.github.io/nexo-finanzas/oro/` |
| 3 | Catálogo de tiendas Quibdó | Tiendas locales y sus clientes | ⏳ Por empezar | `…/nexo-apps/catalogo/` |
| … | *(más apps de la carpeta del PC)* | | 📝 Por definir | |

## Cómo está organizado

```
nexo-apps/
├── README.md          ← este mapa
├── FORMATO-APPS.md    ← método de 4 fases para cada app de cliente
├── CLAUDE.md          ← reglas para trabajar con Claude en este repo
├── apps/              ← fuente de cada app (una carpeta por app)
└── docs/              ← lo que se publica en GitHub Pages
    ├── index.html     ← portada con el menú de todas las apps
    └── <app>/         ← cada app publicada en su carpeta
```

## Cómo se agrega una app nueva

1. Seguir las 4 fases de `FORMATO-APPS.md` (preguntas → boceto → cuestionario → código).
2. Crear `apps/<nombre>/` con el código y publicar la copia en `docs/<nombre>/`.
3. Agregar la tarjeta en `docs/index.html` y la fila en el mapa de arriba.

## Regla de oro

Los **datos reales** de clientes y de Cristóbal **nunca** se suben aquí: viven solo en el celular de cada usuario.
El repositorio es público (GitHub Pages gratis lo exige), así que aquí va solo código.
