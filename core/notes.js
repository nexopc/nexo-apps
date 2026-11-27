// Notas globales: panel 📝 en todas las apps.
// - Nota rápida: una línea + Enter. Sin título, sin carpeta (va a "Sueltas" o a la carpeta de la app abierta).
// - Carpetas por app y vínculo opcional a un registro (movimiento, cuenta, cliente, plan, proyecto…).
import { store, fmt } from './store.js';

export const FOLDERS = [
  ['sueltas', '📂 Sueltas'], ['finanzas', '💳 Finanzas'], ['negocios', '💼 Negocios'], ['studio', '🎬 Studio'],
  ['plan', '⏱ Plan'], ['aprende', '⚛️ Aprende'], ['harvey', '🟣 Harvey'],
];
// Qué se puede vincular desde cada app (colección → cómo se llama el registro)
export const LINKABLE = {
  finanzas: [['transactions', (r) => `${r.type === 'ingreso' ? '+' : r.type === 'gasto' ? '−' : '⇄'} ${fmt.money(r.amount)} · ${r.title || ''}`], ['accounts', (r) => '👛 ' + r.name], ['subscriptions', (r) => '🔁 ' + r.name], ['savings', (r) => '🐷 ' + r.name]],
  negocios: [['clients', (r) => '👤 ' + r.name], ['jobs', (r) => '🧰 ' + r.title], ['sources', (r) => '🏷 ' + r.name], ['services', (r) => `📦 ${r.name} ${r.plan || ''}`]],
  studio: [['videos', (r) => '🎬 ' + (r.title || r.name)], ['scripts', (r) => '📄 ' + (r.title || r.name)]],
  aprende: [['topics', (r) => '⚛️ ' + (r.name || r.title)]],
};
export const linkLabel = (link) => {
  if (!link?.col) return '';
  const r = store.get(link.col, link.id); if (!r) return link.label || '';
  for (const list of Object.values(LINKABLE)) for (const [c, f] of list) if (c === link.col) return f(r);
  return link.label || r.title || r.name || '';
};
export const notes = {
  list: (folder) => store.list('notas').filter((n) => !folder || n.folder === folder).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
  forRecord: (col, id) => store.list('notas').filter((n) => n.link?.col === col && n.link?.id === id),
  quick: (text, folder = 'sueltas', link = null) => store.add('notas', { text: text.trim(), folder, link }),
};
