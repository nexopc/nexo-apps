// Enlace con NEXO PLAN (la app oficial de tiempo: github.com/nexopc/Nexo-plan).
// NEXO PLAN publica su resumen en NEXO Brain (colección planBridge) y lee un buzón con lo que Harvey le manda.
import { store } from './store.js';

export const PLAN_URL = 'https://nexopc.github.io/Nexo-plan/';
export const PLAN_CATS = ['app', 'video', 'creador', 'agencia', 'nexo', 'ingles', 'ejercicio', 'cliente', 'tareas', 'colegio', 'dormir', 'rutina', 'libre'];
const ch = 'BroadcastChannel' in self ? new BroadcastChannel('nexo-brain') : null;

export const planInfo = () => store.raw('planBridge')[0] || null;
export function planDay(date) {
  const p = planInfo(); if (!p) return null;
  if (p.fecha === date) return p.hoy || [];
  const t = new Date(p.fecha + 'T12:00'); t.setDate(t.getDate() + 1);
  return t.toISOString().slice(0, 10) === date ? p.manana || [] : null;
}
export function sendToPlan(msg) {
  // Va por NEXO Brain → Supabase: llega a NEXO PLAN en cualquier dispositivo.
  store.add('planInbox', { ...msg, at: new Date().toISOString() });
  ch?.postMessage({ col: 'planInbox' });
}
// Para no mandar dos veces lo mismo (automatizaciones)
export function sendOnce(key, msg) {
  let s; try { s = JSON.parse(localStorage.getItem('nexo:plan:sent') || '[]'); } catch { s = []; }
  if (s.includes(key)) return false;
  sendToPlan(msg); s.push(key); localStorage.setItem('nexo:plan:sent', JSON.stringify(s.slice(-500)));
  return true;
}
