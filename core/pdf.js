// PDF sencillo (texto, líneas y cajas) hecho en el dispositivo, sin internet ni librerías.
// Fuentes estándar Helvetica / Helvetica-Bold con acentos y ñ (WinAnsi). Los emojis se quitan.
const W = 595, H = 842, M = 48; // A4 en puntos
const WIN = { '€': 128, '‚': 130, '„': 132, '…': 133, '–': 150, '—': 151, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '™': 153 };
function enc(s) {
  let o = '';
  for (const ch of String(s ?? '')) {
    const c = ch.codePointAt(0);
    if (WIN[ch]) o += String.fromCharCode(WIN[ch]);
    else if (c < 256 && c >= 32) o += ch;
    else if (c === 10) o += ' ';
  }
  return o.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\s{2,}/g, ' ');
}
const widthOf = (s, size, bold) => String(s).length * size * (bold ? 0.56 : 0.52);
function wrap(text, size, bold, maxW) {
  const out = [];
  for (const para of String(text ?? '').split('\n')) {
    let line = '';
    for (const w of para.split(' ')) { const t = line ? line + ' ' + w : w; if (widthOf(t, size, bold) > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line);
  }
  return out;
}
const rgb = (hex) => { const h = (hex || '#000000').replace('#', ''); return [0, 2, 4].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' '); };

export function crearPDF() {
  const pages = [[]]; let y = H - M;
  const ops = () => pages[pages.length - 1];
  const need = (h) => { if (y - h < M) { pages.push([]); y = H - M; } };
  const doc = {
    text(str, { size = 11, bold = false, color = '#1A1F2A', x = M, maxW = W - 2 * M, gap = 4, align = 'left' } = {}) {
      for (const ln of wrap(str, size, bold, maxW)) {
        need(size + gap);
        y -= size;
        const xx = align === 'right' ? x + maxW - widthOf(ln, size, bold) : x;
        ops().push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${xx.toFixed(1)} ${y.toFixed(1)} Td (${enc(ln)}) Tj ET`);
        y -= gap;
      }
      return doc;
    },
    row(left, right, { size = 11, bold = false, color = '#1A1F2A' } = {}) {
      need(size + 6); y -= size;
      ops().push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${M} ${y.toFixed(1)} Td (${enc(left)}) Tj ET`);
      ops().push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${(W - M - widthOf(right, size, bold)).toFixed(1)} ${y.toFixed(1)} Td (${enc(right)}) Tj ET`);
      y -= 6; return doc;
    },
    hr(color = '#D5DAE3') { need(10); y -= 5; ops().push(`${rgb(color)} RG 0.8 w ${M} ${y.toFixed(1)} m ${W - M} ${y.toFixed(1)} l S`); y -= 7; return doc; },
    band(h, color) { need(h); ops().push(`${rgb(color)} rg ${M - 10} ${(y - h).toFixed(1)} ${W - 2 * M + 20} ${h} re f`); return doc; },
    box(h, color = '#B8C0CC') { need(h); ops().push(`${rgb(color)} RG 0.8 w ${M} ${(y - h).toFixed(1)} ${W - 2 * M} ${h} re S`); return doc; },
    space(n = 8) { y -= n; return doc; },
    get y() { return y; },
    blob() {
      const objs = []; const add = (s) => { objs.push(s); return objs.length; };
      const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
      const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
      const pagesId = objs.length + 1 + pages.length * 2;
      const kids = [];
      for (const p of pages) {
        const stream = p.join('\n');
        const c = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
        kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${c} 0 R >>`));
      }
      add(`<< /Type /Pages /Kids [${kids.map((k) => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`);
      const cat = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
      let out = '%PDF-1.4\n'; const offs = [];
      objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
      const xref = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
      out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
      const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
      return new Blob([bytes], { type: 'application/pdf' });
    },
  };
  return doc;
}
// Compartir (celular: menú con WhatsApp, Gmail…) o descargar + abrir correo (PC)
export async function compartirPDF(blob, filename, { title = '', text = '', email = '' } = {}) {
  const file = new File([blob], filename, { type: 'application/pdf' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title, text }); return 'compartido'; } } catch (e) { if (e && e.name === 'AbortError') return 'cancelado'; }
  const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = filename; a.style.display = "none"; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1500);
  setTimeout(() => URL.revokeObjectURL(u), 60000);
  return 'descargado';
}
