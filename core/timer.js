// Cronómetro común de la red NEXO: uno solo, sincronizado en todas las apps y dispositivos.
// Se guarda en store('timer', id 'activo') → la burbuja ⏱ aparece arriba en cualquier app mientras corre.
// Al terminar crea un registro en timeLogs (Negocios lo usa para tu costo real; Aprende para horas de estudio).
import { store, fmt } from './store.js';

const ID = 'activo';
const get = () => store.get('timer', ID);
export const timer = {
  state: () => { const t = get(); return t && (t.running || t.paused) ? t : null; },
  elapsed(t = get()) { if (!t) return 0; return (t.accum || 0) + (t.running ? Date.now() - new Date(t.startedAt).getTime() : 0); },
  // label: qué haces · kind: trabajo | estudio | otro · ref: { col, id } (trabajo, tema…)
  start({ label = 'Trabajo', kind = 'trabajo', job = '', topic = '', source = '' } = {}) {
    const cur = this.state(); if (cur) this.stop();
    store.add('timer', { id: ID, running: true, paused: false, startedAt: new Date().toISOString(), accum: 0, label, kind, job, topic, source });
  },
  pause() { const t = get(); if (!t?.running) return; store.update('timer', ID, { running: false, paused: true, accum: this.elapsed(t) }); },
  resume() { const t = get(); if (!t?.paused) return; store.update('timer', ID, { running: true, paused: false, startedAt: new Date().toISOString() }); },
  stop() {
    const t = get(); if (!t || (!t.running && !t.paused)) return null;
    const minutes = Math.max(1, Math.round(this.elapsed(t) / 60000));
    const log = store.add('timeLogs', { minutes, date: fmt.today(), label: t.label, kind: t.kind, job: t.job || '', topic: t.topic || '', source: t.source || '' });
    store.update('timer', ID, { running: false, paused: false, accum: 0 });
    return log;
  },
};
export const clock = (ms) => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s % 60).padStart(2, '0'); };
