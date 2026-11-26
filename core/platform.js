// Detecta el sistema operativo y adapta la interfaz.
// html[data-os] = "ios" | "android" | "windows" | "desktop"
const KEY = 'nexo:os-override';

export function detectOS() {
  try {
    const o = localStorage.getItem(KEY);
    if (o) return o;
  } catch {}
  const ua = navigator.userAgent || '';
  const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; // iPad moderno
  if (/iPhone|iPad|iPod/.test(ua) || touchMac) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  return 'desktop';
}

export function setOSOverride(os) {
  try { os ? localStorage.setItem(KEY, os) : localStorage.removeItem(KEY); } catch {}
  location.reload();
}

export const OS = detectOS();
export const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isDesktopLike = OS === 'windows' || OS === 'desktop';

export function applyPlatform() {
  const h = document.documentElement;
  h.dataset.os = OS;
  h.dataset.standalone = String(isStandalone);
  if (isDesktopLike) enableCursorGlow();
  if (OS === 'ios') enableEdgeSwipeBack();
  if (OS === 'android') enableRipple();
}

// Windows: brillo que sigue el cursor sobre botones y tarjetas.
function enableCursorGlow() {
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest?.('.btn, .card, .tile, .nav-item');
    if (!t) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--mx', `${e.clientX - r.left}px`);
    t.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}

// Android: efecto de onda al tocar.
function enableRipple() {
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest?.('.btn, .nav-item, .fab, .list-item');
    if (!t) return;
    const r = t.getBoundingClientRect();
    const s = document.createElement('span');
    s.className = 'ripple';
    const d = Math.max(r.width, r.height) * 2;
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    t.appendChild(s);
    setTimeout(() => s.remove(), 550);
  });
}

// iOS: no hay botón atrás; deslizar desde el borde izquierdo cierra el panel o vuelve.
function enableEdgeSwipeBack() {
  let x0 = null, y0 = 0;
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    x0 = t.clientX < 24 ? t.clientX : null; y0 = t.clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const t = e.changedTouches[0];
    if (t.clientX - x0 > 80 && Math.abs(t.clientY - y0) < 60) history.back();
    x0 = null;
  }, { passive: true });
}

// Vibración corta (Android). iOS Safari la ignora.
export function haptic(ms = 10) { try { navigator.vibrate?.(ms); } catch {} }
