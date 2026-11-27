// Fotos de NEXO (lugares y referencias de Studio). Se comprimen en el dispositivo (~1280 px, JPG)
// y se suben al espacio privado "fotos" de Supabase: carpeta = tu usuario (solo tú las ves).
// Sin sesión o sin internet: se guardan más pequeñas (640 px) dentro del registro, y así igual sincronizan.
import { cloud } from './sync.js';

const MAX = 1280, Q = 0.78;
const cache = new Map(); // ruta → url firmada (válida 1 h)

export function comprimir(file, max = MAX) {
  return new Promise((res, rej) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      c.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo comprimir'))), 'image/jpeg', Q);
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Esa imagen no se pudo abrir')); };
    img.src = u;
  });
}
const toDataUrl = (blob) => new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });

// Devuelve { path } (en la nube) o { data } (en el dispositivo)
export async function subirFoto(file, carpeta = 'studio') {
  const blob = await comprimir(file);
  const u = cloud.user?.();
  if (u && navigator.onLine) {
    try {
      const sb = await cloud.client();
      const path = `${u.id}/${carpeta}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
      const { error } = await sb.storage.from('fotos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (!error) return { path };
    } catch { /* cae al dispositivo */ }
  }
  return { data: await toDataUrl(await comprimir(file, 640)) };
}
// URL para mostrar una foto guardada con subirFoto
export async function urlFoto(f) {
  if (!f) return '';
  if (f.data) return f.data;
  if (!f.path) return '';
  const c = cache.get(f.path); if (c && c.exp > Date.now()) return c.url;
  try {
    const sb = await cloud.client();
    const { data } = await sb.storage.from('fotos').createSignedUrl(f.path, 3600);
    if (data?.signedUrl) { cache.set(f.path, { url: data.signedUrl, exp: Date.now() + 3500e3 }); return data.signedUrl; }
  } catch { /* sin conexión */ }
  return '';
}
export async function borrarFoto(f) {
  if (!f?.path) return;
  try { const sb = await cloud.client(); await sb.storage.from('fotos').remove([f.path]); } catch { /* luego */ }
}
// Pinta las <img data-foto="i"> de un contenedor
export function pintarFotos(el, fotos) {
  el.querySelectorAll('img[data-foto]').forEach(async (img) => { img.src = await urlFoto(fotos[+img.dataset.foto]) || ''; });
}
