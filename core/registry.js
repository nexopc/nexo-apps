// Registro de la red NEXO: cada app con su color, logo y colecciones.
// Para agregar una app nueva: añádela aquí (o desde el Hub con "Agregar app").
import { store } from './store.js';

const svg = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

export const LOGOS = {
  nexo: svg('<path d="M12 2 21 7v10l-9 5-9-5V7z"/><path d="M8 15V9l8 6V9"/>'),
  plan: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/><path d="M19.5 5.5 21 4"/>'),
  finanzas: svg('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.5"/><path d="M7 3h10"/>'),
  negocios: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/><path d="M11 13v2h2v-2"/>'),
  studio: svg('<rect x="3" y="5" width="18" height="15" rx="3"/><path d="m10 9.5 5 3-5 3z"/><path d="M7 2.5 9 5M15 2.5 13 5"/>'),
  aprende: svg('<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>'),
  harvey: svg('<path d="M7 4v16M17 4v16M7 12h10"/><path d="M4 20h6M14 20h6"/>'),
  custom: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>'),
};

export const APPS = [
  { id: 'plan', name: 'NEXO Plan', tagline: 'tu tiempo', accent: '#2D7CFF', path: 'apps/plan/',
    cols: ['blocks', 'events', 'goals', 'habits', 'habitLogs', 'tasks', 'hours', 'journal'], brain: 'Donna' },
  { id: 'finanzas', name: 'NEXO Finanzas', tagline: 'tu plata', accent: '#18C27A', path: 'apps/finanzas/',
    cols: ['accounts', 'transactions', 'budgets', 'savings', 'subscriptions', 'alerts'], brain: 'Louis' },
  { id: 'negocios', name: 'NEXO Negocios', tagline: 'tu trabajo', accent: '#FF8A1F', path: 'apps/negocios/',
    cols: ['sources', 'services', 'combos', 'clients', 'jobs', 'timeLogs', 'invoices', 'prospects'], brain: 'Harvey' },
  { id: 'studio', name: 'NEXO Studio', tagline: 'tu contenido', accent: '#FF4F9A', path: 'apps/studio/',
    cols: ['ideas', 'scripts', 'shoots', 'videos', 'references', 'metrics', 'portfolio'], brain: 'Mike' },
  { id: 'aprende', name: 'NEXO Aprende', tagline: 'tu estudio', accent: '#FFC23D', path: 'apps/aprende/',
    cols: ['subjects', 'grades', 'exams', 'routes', 'english', 'flashcards', 'notes'], brain: 'Mike' },
  { id: 'harvey', name: 'Harvey', tagline: 'tu asistente', accent: '#E9C46A', path: 'apps/harvey/',
    cols: ['chat', 'briefs'], brain: 'Jessica' },
];

// Apps agregadas por ti desde el Hub (enlaces externos o futuras apps)
export function allApps() {
  const extra = store.list('apps').map((a) => ({ ...a, custom: true }));
  return [...APPS, ...extra];
}
export const appById = (id) => allApps().find((a) => a.id === id);
