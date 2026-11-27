// 📄 PDFs para el cliente: guion (escenas + lo que se dice + cuándo se graba y qué preparar) y plan del mes.
import { store, fmt, toast } from '../../core/shell.js';
import { crearPDF, compartirPDF } from '../../core/pdf.js';
import { escenas, lugarName, tipoL, letra, cname, EST, estIdx } from './datos.js';

const ROSA = '#D6337A', GRIS = '#5A6375';
const firma = () => store.get('config', 'cobro')?.nombre || 'NEXO';
const archivo = (s) => String(s || 'video').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').slice(0, 40);

export async function compartirGuion(v) {
  const es = escenas(v); if (!es.length) return toast('Primero agrega escenas al guion');
  const d = crearPDF();
  d.text(firma(), { size: 11, bold: true, color: ROSA });
  d.text('Guion · ' + v.title, { size: 19, bold: true }).space(2);
  d.text([cname(v.client), v.duracion || '', v.formato || '9:16'].filter(Boolean).join('  ·  '), { size: 10, color: GRIS });
  d.hr();
  if (v.objetivo) d.text('Objetivo: ' + v.objetivo, { size: 10.5 });
  if (v.gancho) d.text('Primeros 3 segundos: “' + v.gancho + '”', { size: 10.5 });
  if (v.cta) d.text('Al final: ' + v.cta, { size: 10.5 });
  es.forEach((e, si) => {
    d.space(10).band(20, '#F3E3EA').space(4).text(`ESCENA ${si + 1}${e.titulo ? ' · ' + e.titulo.toUpperCase() : ''}`, { size: 11.5, bold: true, color: ROSA, x: 52 });
    const meta = [lugarName(e) && 'Lugar: ' + lugarName(e), e.fecha && 'Grabación: ' + fmt.date(e.fecha) + (e.hora ? ' ' + e.hora : ''), e.ambiente].filter(Boolean).join('   ·   ');
    if (meta) d.text(meta, { size: 9.5, color: GRIS });
    e.planos.forEach((p, pi) => {
      d.space(3).text(`${letra(pi)}. ${tipoL(p.tipo)}${p.seg ? ' (' + p.seg + ' s)' : ''}${p.desc ? ': ' + p.desc : ''}`, { size: 10.5, bold: true });
      (p.personas || []).filter((q) => q.dice).forEach((q) => d.text(`${q.nombre || 'Persona'} dice: “${q.dice}”`, { size: 10.5, x: 64, maxW: 470 }));
      if (p.pantalla) d.text(`En pantalla: “${p.pantalla}”`, { size: 10, color: GRIS, x: 64, maxW: 470 });
    });
  });
  const graba = es.filter((e) => e.fecha || e.prepara);
  if (graba.length) {
    d.space(12).text('DÍA DE GRABACIÓN Y QUÉ PREPARAR', { size: 10, bold: true, color: GRIS });
    graba.forEach((e) => d.text(`•  ${e.fecha ? fmt.date(e.fecha) + (e.hora ? ' a las ' + e.hora : '') : 'Fecha por definir'}${lugarName(e) ? ' · ' + lugarName(e) : ''}${e.prepara ? ' — Por favor ten listo: ' + e.prepara : ''}`, { size: 10.5 }));
  }
  d.space(14).text('¿Lo apruebas o le cambiamos algo? Respóndeme por WhatsApp.', { size: 10.5, color: GRIS });
  const r = await compartirPDF(d.blob(), `Guion-${archivo(v.title)}.pdf`, { title: 'Guion ' + v.title, text: `Hola 👋 te comparto el guion de "${v.title}" para que lo revises.` });
  if (r === 'descargado') toast('📄 PDF descargado: adjúntalo en WhatsApp');
}

export async function compartirPlan(cid, mes) {
  const vs = store.list('videos').filter((v) => v.client === cid && ((v.publishDate || v.due || '').startsWith(mes))).sort((a, b) => (a.publishDate || a.due).localeCompare(b.publishDate || b.due));
  if (!vs.length) return toast('Pon fecha a los videos de este mes primero');
  const [y, m] = mes.split('-').map(Number);
  const nombreMes = new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const d = crearPDF();
  d.text(firma(), { size: 11, bold: true, color: ROSA });
  d.text(`Plan de contenido · ${nombreMes}`, { size: 19, bold: true });
  d.text(cname(cid) + `  ·  ${vs.length} videos`, { size: 10.5, color: GRIS }).hr();
  vs.forEach((v) => {
    const f = v.publishDate || v.due; const dia = new Date(f + 'T12:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
    d.row(`${dia}   ${v.title}`, EST[estIdx(v.status)][1], { size: 11 });
    if (v.objetivo || v.gancho) d.text(v.gancho ? `Gancho: “${v.gancho}”` : v.objetivo, { size: 9.5, color: GRIS, x: 110, maxW: 430 });
  });
  d.space(14).text('¿Apruebas el plan del mes? Si quieres cambiar algún video o fecha, respóndeme por WhatsApp.', { size: 10.5, color: GRIS });
  const r = await compartirPDF(d.blob(), `Plan-${archivo(cname(cid))}-${mes}.pdf`, { title: 'Plan de contenido', text: `Hola 👋 te comparto el plan de contenido de ${nombreMes} para que lo apruebes.` });
  if (r === 'descargado') toast('📄 PDF descargado: adjúntalo en WhatsApp');
  return r;
}
