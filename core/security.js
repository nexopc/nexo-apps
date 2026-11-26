// Bloqueo con PIN y con Face ID / huella (passkey del dispositivo).
// Nota honesta: esto protege la app en TU dispositivo (si alguien toma tu celular).
// La seguridad real de los datos en la nube la da tu cuenta de Google + las reglas RLS de Supabase.
import { prefs } from './store.js';

const SESSION_KEY = 'nexo:unlocked';
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function hash(pin, salt) {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(salt + ':' + pin));
  return b64(d);
}

export const security = {
  hasPin: () => !!prefs.get('pinHash'),
  hasBio: () => !!prefs.get('passkeyId'),
  bioSupported: async () => !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(() => false)),
  isUnlocked: () => { try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return true; } },
  markUnlocked() { try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {} },
  lockNow() { try { sessionStorage.removeItem(SESSION_KEY); } catch {} location.reload(); },
  async setPin(pin) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(12)));
    prefs.set('pinSalt', salt); prefs.set('pinHash', await hash(pin, salt));
  },
  clearPin() { prefs.set('pinHash', null); prefs.set('pinSalt', null); prefs.set('passkeyId', null); },
  async checkPin(pin) { return (await hash(pin, prefs.get('pinSalt'))) === prefs.get('pinHash'); },
  async enrollBio() {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'NEXO' },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'nexo-owner', displayName: 'Dueño NEXO' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60000,
    } });
    prefs.set('passkeyId', b64(cred.rawId));
  },
  async bioUnlock() {
    const id = prefs.get('passkeyId'); if (!id) return false;
    const a = await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: unb64(id) }],
      userVerification: 'required', timeout: 60000,
    } });
    return !!a;
  },
};

// Pantalla de bloqueo (se muestra si hay PIN y la sesión no está desbloqueada)
export function lockScreen({ title = 'NEXO', logo = '' } = {}) {
  return new Promise((resolve) => {
    if (!security.hasPin() || security.isUnlocked()) return resolve();
    const el = document.createElement('div');
    el.className = 'lock';
    el.innerHTML = `<div class="box">
      <div class="brand" style="justify-content:center"><span class="logo">${logo}</span><b>${title}</b></div>
      <p class="muted" style="margin:0">Ingresa tu PIN</p>
      <div class="dots" id="dots">${'<i></i>'.repeat(4)}</div>
      <div class="keypad">${[1,2,3,4,5,6,7,8,9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
        <button data-k="bio" aria-label="Face ID o huella" ${security.hasBio() ? '' : 'style="visibility:hidden"'}>☝️</button>
        <button data-k="0">0</button><button data-k="del" aria-label="Borrar">⌫</button></div>
    </div>`;
    document.body.appendChild(el);
    let pin = '';
    const dots = el.querySelector('#dots');
    const paint = () => dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i < pin.length));
    const done = () => { security.markUnlocked(); el.remove(); resolve(); };
    const tryBio = async () => { try { if (await security.bioUnlock()) done(); } catch {} };
    el.addEventListener('click', async (e) => {
      const k = e.target.closest('button')?.dataset.k; if (!k) return;
      if (k === 'bio') return tryBio();
      if (k === 'del') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
      paint();
      if (pin.length === 4) {
        if (await security.checkPin(pin)) done();
        else { dots.classList.add('err'); setTimeout(() => { dots.classList.remove('err'); pin = ''; paint(); }, 400); }
      }
    });
    document.addEventListener('keydown', function kd(e) {
      if (!document.body.contains(el)) return document.removeEventListener('keydown', kd);
      const b = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : null;
      if (b) el.querySelector(`[data-k="${b}"]`)?.click();
    });
    if (security.hasBio()) setTimeout(tryBio, 300);
  });
}
