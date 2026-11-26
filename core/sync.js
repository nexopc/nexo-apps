// Sincronización con Firebase: users/{uid}/{coleccion}/{id}
// Cada dispositivo con la misma cuenta de Google ve los mismos datos en tiempo real.
import { store } from './store.js';
import { FIREBASE_CONFIG, hasFirebase } from './config.js';

let fb = null, app = null, auth = null, db = null, user = null;
const unsubs = [];
const authListeners = new Set();

async function load() {
  if (fb || !hasFirebase()) return fb;
  fb = await import('./vendor/firebase.js');
  app = fb.initializeApp(FIREBASE_CONFIG);
  auth = fb.getAuth(app);
  db = fb.initializeFirestore(app, { localCache: fb.persistentLocalCache({ tabManager: fb.persistentMultipleTabManager() }) });
  fb.getRedirectResult(auth).catch(() => {});
  fb.onAuthStateChanged(auth, (u) => { user = u; u ? start() : stop(); authListeners.forEach((f) => f(u)); });
  return fb;
}

function start() {
  stop();
  store.setRemote({
    put: (col, rec) => fb.setDoc(fb.doc(db, 'users', user.uid, col, rec.id), rec).catch((e) => console.warn('sync', e)),
  });
  // Colecciones conocidas + las que existan localmente
  const cols = new Set([...store.collections(), ...KNOWN]);
  for (const col of cols) {
    unsubs.push(fb.onSnapshot(fb.collection(db, 'users', user.uid, col), (snap) => {
      snap.docChanges().forEach((ch) => store.mergeRemote(col, ch.doc.data()));
    }, (e) => console.warn('sync', col, e.code)));
  }
  // Sube lo que solo estaba en este dispositivo
  for (const col of store.collections()) for (const r of store.raw(col)) fb.setDoc(fb.doc(db, 'users', user.uid, col, r.id), r, { merge: true }).catch(() => {});
}
function stop() { unsubs.splice(0).forEach((u) => u()); store.setRemote(null); }

export const KNOWN = ['tasks','blocks','events','habits','habitLogs','goals','journal','hours',
  'accounts','transactions','budgets','savings','subscriptions','alerts',
  'sources','services','combos','clients','jobs','timeLogs','invoices','prospects',
  'ideas','scripts','shoots','videos','references','portfolio','metrics',
  'subjects','grades','exams','routes','english','flashcards','notes','apps','devices'];

export const cloud = {
  available: hasFirebase,
  async init() { await load(); },
  user: () => user,
  onAuth(fn) { authListeners.add(fn); fn(user); return () => authListeners.delete(fn); },
  async signIn() {
    await load(); if (!fb) throw new Error('Falta configurar Firebase en core/config.js');
    const p = new fb.GoogleAuthProvider();
    const standaloneIOS = /iPhone|iPad/.test(navigator.userAgent) && navigator.standalone;
    return standaloneIOS ? fb.signInWithRedirect(auth, p) : fb.signInWithPopup(auth, p);
  },
  async signOut() { await load(); return fb && fb.signOut(auth); },
};
