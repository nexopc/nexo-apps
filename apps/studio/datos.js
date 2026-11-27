// NEXO Studio 3 · datos comunes: estaciones, colores por cliente, árbol del guion, plantillas,
// lista de edición con pasos de Filmora 16 y horas por video. Ver docs/STUDIO_V3.md
import { store, fmt } from '../../core/shell.js';

export const EST = [['idea', 'Idea', '💡'], ['guion', 'Guion', '📝'], ['grabar', 'Grabar', '🎥'], ['editar', 'Editar', '✂️'], ['entregar', 'Entregar', '📤'], ['publicado', 'Publicado', '✅']];
export const estIdx = (s) => Math.max(0, EST.findIndex((e) => e[0] === (s || 'idea')));
const OLD = { grabado: 'grabar', edicion: 'editar', revision: 'entregar' };
export function migrar() { for (const v of store.list('videos')) if (OLD[v.status]) store.update('videos', v.id, { status: OLD[v.status] }); }

// ---------- colores por cliente ----------
const PAL = ['#FF4F9A', '#00E5FF', '#FFC23D', '#1CE783', '#9B7BFF', '#FF8A1F', '#5FB7FF', '#FF6A6A'];
export function colorCli(id) {
  if (!id) return '#FF4F9A';
  const c = store.get('clients', id); if (c?.color) return c.color;
  const src = c?.source && store.get('sources', c.source); if (src?.color && store.list('clients').filter((x) => x.source === c.source).length === 1) return src.color;
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PAL[h % PAL.length];
}
export const cname = (id) => store.get('clients', id)?.name || '';
export const iniciales = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const lugarName = (e) => store.get('lugares', e?.lugar)?.name || e?.lugarTxt || '';

// ---------- árbol: Video → Escena → Plano ----------
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const letra = (i) => (i < 26 ? String.fromCharCode(65 + i) : 'Z' + (i - 25));
export const claq = (si, pi, t) => `E${si + 1}` + (pi != null ? '·' + letra(pi) : '') + (t ? '·T' + t : '');
export const escenas = (v) => (Array.isArray(v?.escenas) ? v.escenas : []);
export const nuevaEscena = (o = {}) => ({ id: uid(), titulo: '', lugar: '', lugarTxt: '', ambiente: '', luz: '', fecha: '', hora: '', utileria: '', vestuario: '', sonido: '', prepara: '', planos: [], ...o });
export const PLANT = [
  { k: 'general', l: 'General', e: '🏞', seg: 4, mov: 'paneo lento', cam: { altura: 'ojos', soporte: 'trípode', zoom: '1x' }, d: 'Se ve todo el lugar' },
  { k: 'medio', l: 'Medio', e: '🧍', seg: 5, mov: 'fijo', cam: { altura: 'pecho', soporte: 'trípode', zoom: '1x' }, d: 'Persona de la cintura para arriba' },
  { k: 'primer', l: 'Primer plano', e: '🙂', seg: 3, mov: 'fijo', cam: { altura: 'ojos', soporte: 'mano', zoom: '2x' }, d: 'Cara o producto de cerca' },
  { k: 'detalle', l: 'Detalle', e: '🔍', seg: 2, mov: 'fijo', cam: { altura: 'baja', soporte: 'mano', zoom: '2x' }, d: 'Manos, herramienta, textura' },
  { k: 'pov', l: 'POV', e: '👀', seg: 3, mov: 'en mano', cam: { altura: 'ojos', soporte: 'mano', zoom: '0.5x' }, d: 'Como si fueras tú quien mira' },
  { k: 'cenital', l: 'Desde arriba', e: '⬇️', seg: 3, mov: 'fijo', cam: { altura: 'arriba', soporte: 'trípode', zoom: '1x' }, d: 'Mesa o producto visto desde arriba' },
];
export const MOVS = ['fijo', 'paneo lento', 'acercarse', 'alejarse', 'seguir a la persona', 'en mano', 'cámara lenta'];
export function nuevoPlano(k = 'medio') {
  const p = PLANT.find((x) => x.k === k) || PLANT[1];
  return { id: uid(), tipo: p.k, seg: p.seg, mov: p.mov, desc: '', mapa: [], cam: { donde: '', mira: '', ...p.cam }, personas: [], pantalla: '', tomas: [], grabado: false };
}
export const tipoL = (k) => PLANT.find((x) => x.k === k)?.l || k || 'Plano';
export const copia = (o) => JSON.parse(JSON.stringify(o));
// Cambia el árbol de un video y lo guarda (devuelve el árbol nuevo)
export function editarArbol(vid, fn) {
  const v = store.get('videos', vid); if (!v) return null;
  const esc = copia(escenas(v)); fn(esc);
  const extra = {};
  const nPl = esc.reduce((a, e) => a + e.planos.length, 0);
  if ((v.status || 'idea') === 'idea' && nPl) extra.status = 'guion';
  const todos = esc.flatMap((e) => e.planos);
  if (todos.length && todos.every((p) => p.grabado) && ['guion', 'grabar'].includes(v.status || 'idea')) extra.status = 'editar';
  store.update('videos', vid, { escenas: esc, ...extra });
  return extra.status || null;
}
export const totalSeg = (v) => escenas(v).reduce((a, e) => a + e.planos.reduce((b, p) => b + (Number(p.seg) || 0), 0), 0);
export const tomaBuena = (p) => (p.tomas || []).find((t) => t.buena)?.n || 0;

// ---------- horas por video (cronómetro común) ----------
export function horas(vid) {
  const ls = store.list('timeLogs').filter((t) => t.video === vid);
  const by = (f) => ls.filter((t) => (t.fase || 'editar') === f).reduce((a, t) => a + (Number(t.minutes) || 0), 0);
  return { guion: by('guion'), grabar: by('grabar'), editar: by('editar'), total: ls.reduce((a, t) => a + (Number(t.minutes) || 0), 0) };
}

// ---------- pasos de Filmora 16 (guía; los nombres pueden variar un poco según tu versión) ----------
export const FILMORA = {
  proyecto: 'Antes de empezar: Archivo → Configuración del proyecto → Relación de aspecto 9:16 (1080×1920).',
  importar: 'Arrastra los clips a Medios del proyecto. Ordénalos por claqueta (E1·A·T2…) y pon en la línea de tiempo solo las tomas buenas.',
  cortes: 'Pon el cabezal donde quieres cortar y divide con Ctrl+B. Borra lo que sobra con Supr y quita los huecos con clic derecho → Eliminar espacios.',
  gancho: 'Pon el plano más llamativo de primero y recórtalo para que dure 3 segundos o menos.',
  texto: 'Pestaña Títulos → elige un estilo → arrástralo a la pista encima del clip → doble clic para escribir y ajustar fuente y color.',
  subtitulos: 'Selecciona el clip → clic derecho → Voz a texto (STT) → idioma Español. Revisa las palabras mal escritas en la pista de texto.',
  musica: 'Pestaña Audio (o importa tu canción) → arrástrala a la pista de audio. Doble clic → baja el volumen para que la voz se oiga y pon fundido de entrada y salida.',
  zoom: 'Doble clic al clip → Transformar → Escala: pon un fotograma clave (rombo) al inicio y otro al final con más escala.',
  lenta: 'Clic derecho al clip → Velocidad → Velocidad uniforme → 0.5x.',
  transicion: 'Pestaña Transiciones → arrastra una entre los dos clips; que dure 0,3–0,5 s para que no se sienta lenta.',
  color: 'Doble clic al clip → pestaña Color → ajusta Exposición, Contraste y Saturación; copia y pega el ajuste en los demás clips.',
  exportar: 'Exportar (arriba a la derecha) → Local → MP4 → resolución 1080×1920, 30 fps → Exportar.',
};
export function listaEdicion(v) {
  const L = []; const add = (k, t, f, tag) => L.push({ k, t, f, tag });
  const esc = escenas(v);
  const buenas = esc.flatMap((e, si) => e.planos.map((p, pi) => (tomaBuena(p) ? claq(si, pi, tomaBuena(p)) : ''))).filter(Boolean);
  add('proyecto', `Proyecto en ${v.formato || '9:16'}`, 'proyecto');
  add('importar', 'Importar y ordenar las tomas buenas', 'importar', buenas.slice(0, 3).join(' ') + (buenas.length > 3 ? ' …' : ''));
  add('cortes', `Cortes en orden: ${esc.map((e, i) => 'E' + (i + 1)).join(' → ') || 'según el guion'}${v.duracion ? ' (' + v.duracion + ')' : totalSeg(v) ? ' (' + totalSeg(v) + ' s)' : ''}`, 'cortes');
  if (v.gancho) add('gancho', `Gancho en los primeros 3 s: "${v.gancho}"`, 'gancho');
  if (v.musica) add('musica', `Música: ${v.musica}`, 'musica');
  esc.forEach((e, si) => e.planos.forEach((p, pi) => {
    if (p.pantalla) add('txt-' + p.id, `Texto en pantalla: "${p.pantalla}"`, 'texto', claq(si, pi));
    if (/acerc|alej/.test(p.mov || '')) add('zoom-' + p.id, `Zoom suave (${p.mov})`, 'zoom', claq(si, pi));
    if (/lenta/.test(p.mov || '')) add('lenta-' + p.id, 'Cámara lenta', 'lenta', claq(si, pi));
  }));
  if (esc.length > 1) add('transiciones', 'Transiciones cortas entre escenas', 'transicion');
  add('subs', 'Subtítulos automáticos', 'subtitulos');
  if (v.cta) add('cta', `Llamado a la acción al final: "${v.cta}"`, 'texto');
  add('color', 'Color: brillo, contraste y saturación parejos', 'color');
  add('export', `Exportar ${v.formato || '9:16'} · 1080×1920 · MP4`, 'exportar');
  return L;
}
export const mesDe = (d = fmt.today()) => d.slice(0, 7);
export const TAGS = ['humor', 'tutorial', 'antes/después', 'testimonio', 'tendencia', 'producto', 'detrás de cámaras'];
