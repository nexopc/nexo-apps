// Meta de ventas (Plan $10M): acumulado, meta del día, semáforo y gráfica.
// Los números vienen de la plantilla en Supabase (colección config, id plan10m); aquí solo se calculan.
import { store, fmt } from './store.js';

export const plan = () => store.get('config', 'plan10m');

const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
const addDays = (s, n) => { const d = new Date(s + 'T12:00'); d.setDate(d.getDate() + n); return iso(d); };
function libre(p, day) {
  if ((p.libres || []).includes(day)) return true;
  return (p.libres || []).includes('domingos') && new Date(day + 'T12:00').getDay() === 0;
}

// Meta acumulada que deberías llevar al final de `day`
export function metaAl(p, day) {
  let acc = 0;
  for (const t of p.tramos || []) {
    for (let d = t.desde; d <= t.hasta && d <= day; d = addDays(d, 1)) if (!libre(p, d)) acc += t.porDia;
    if (day <= t.hasta) break;
    acc = Math.max(acc, t.acumulado); // se ajusta al acumulado oficial de cada tramo
  }
  return Math.min(acc, p.meta);
}

// Plata que de verdad entró desde el inicio del plan (ingresos de Finanzas)
export function acumuladoAl(p, day) {
  return store.list('transactions').filter((t) => t.type === 'ingreso' && t.date >= p.inicio && t.date <= day)
    .reduce((a, t) => a + (Number(t.amount) || 0), 0);
}

export function estado(day = fmt.today()) {
  const p = plan(); if (!p) return null;
  const acc = acumuladoAl(p, day);
  const meta = metaAl(p, day);
  const minimo = Math.round(meta / 2);
  const color = acc >= meta ? 'verde' : acc >= minimo ? 'amarillo' : 'rojo';
  const msg = color === 'verde' ? 'Vas por encima de la línea de $10M. Sostén el ritmo.'
    : color === 'amarillo' ? 'Entre las dos líneas: sube los contactos a 10 hoy.'
      : 'Por debajo de la línea mínima: 12 contactos hoy.';
  const etapa = (p.etapas || []).find((e) => day >= e.desde && day <= e.hasta) || null;
  const t = (p.tramos || []).find((x) => day >= x.desde && day <= x.hasta);
  const metaDia = libre(p, day) ? 0 : (t ? t.porDia : 0);
  const hoyCobrado = acumuladoAl(p, day) - acumuladoAl(p, addDays(day, -1));
  const combo = (p.combosSemana || []).find((c) => day >= c.desde && day <= c.hasta) || null;
  const diasRest = Math.max(0, Math.round((new Date(p.fin + 'T12:00') - new Date(day + 'T12:00')) / 864e5));
  return { p, acc, meta, minimo, color, msg, etapa, metaDia, hoyCobrado, combo, diasRest, falta: Math.max(0, p.meta - acc) };
}

// Gráfica SVG: tu acumulado (línea fuerte) contra la línea de $10M y la mínima (la mitad)
export function grafica(p, hasta = fmt.today()) {
  const days = []; for (let d = p.inicio; d <= p.fin; d = addDays(d, 1)) days.push(d);
  const W = 640, H = 220, L = 52, R = 12, T = 12, B = 26;
  const x = (i) => L + (i / (days.length - 1)) * (W - L - R);
  const y = (v) => T + (1 - v / p.meta) * (H - T - B);
  const line = (vals) => vals.map((v, i) => (v == null ? '' : `${i && vals[i - 1] != null ? 'L' : 'M'}${x(i).toFixed(1)},${y(Math.min(v, p.meta * 1.05)).toFixed(1)}`)).join('');
  const meta = days.map((d) => metaAl(p, d));
  const real = days.map((d) => (d <= hasta ? acumuladoAl(p, d) : null));
  const hoyI = days.indexOf(hasta);
  const ticks = [0, 2500000, 5000000, 7500000, 10000000];
  return `<svg viewBox="0 0 ${W} ${H}" class="p10-chart" role="img" aria-label="Acumulado contra la meta de $10M">
    ${ticks.map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="g"/><text x="${L - 6}" y="${y(v) + 4}" class="t" text-anchor="end">${v ? '$' + v / 1e6 + 'M' : '0'}</text>`).join('')}
    ${[0, Math.floor(days.length / 2), days.length - 1].map((i) => `<text x="${x(i)}" y="${H - 6}" class="t" text-anchor="middle">${fmt.date(days[i])}</text>`).join('')}
    <path d="${line(meta.map((v) => v / 2))}" class="min"/>
    <path d="${line(meta)}" class="meta"/>
    <path d="${line(real)}" class="real"/>
    ${hoyI >= 0 ? `<circle cx="${x(hoyI)}" cy="${y(Math.min(real[hoyI], p.meta * 1.05))}" r="5" class="dot"/>` : ''}
  </svg>
  <div class="p10-leg"><span><i class="real"></i>Tu acumulado</span><span><i class="meta"></i>Línea $10M</span><span><i class="min"></i>Mínimo</span></div>`;
}

export const P10_CSS = `
.p10 { display: grid; gap: 10px; }
.p10 .sema { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; border: 1.5px solid var(--sc); background: color-mix(in srgb, var(--sc) 12%, var(--panel)); }
.p10 .sema b { font-family: var(--display); }
.p10 .luz { width: 22px; height: 22px; border-radius: 50%; background: var(--sc); box-shadow: 0 0 14px var(--sc); flex: none; }
.p10-chart { width: 100%; height: auto; display: block; }
.p10-chart .g { stroke: var(--line); stroke-width: 1; }
.p10-chart .t { fill: var(--muted); font-size: 11px; font-family: var(--font); }
.p10-chart .meta { fill: none; stroke: var(--c-create); stroke-width: 2; stroke-dasharray: 6 5; }
.p10-chart .min { fill: none; stroke: var(--c-pending); stroke-width: 1.5; stroke-dasharray: 3 5; }
.p10-chart .real { fill: none; stroke: var(--fg); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.p10-chart .dot { fill: var(--fg); stroke: var(--bg); stroke-width: 2; }
.p10-leg { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--muted); }
.p10-leg i { display: inline-block; width: 18px; height: 0; border-top: 3px solid var(--fg); vertical-align: middle; margin-right: 5px; }
.p10-leg i.meta { border-top: 2px dashed var(--c-create); } .p10-leg i.min { border-top: 2px dotted var(--c-pending); }
`;
export const SEMA = { verde: 'var(--c-create)', amarillo: 'var(--c-pending)', rojo: 'var(--c-delete)' };
