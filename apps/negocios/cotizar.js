// NEXO Negocios v3 · 🧮 Cotizar: un servicio (o un combo) por cotización, total en vivo, 4 descuentos,
// PDF (sin logo) con datos de contacto, cómo pagar, términos y "Acepto"; se comparte desde el celular.
import { store, fmt, esc, h, toast, sheet } from '../../core/shell.js';
import { crearPDF, compartirPDF } from '../../core/pdf.js';
import { money, cfgNeg, minHora, cobro, colorOf, nextNumber, derivado, bumpReg } from './datos.js';

export const Q = { tab: 'servicios', marca: '', svc: '', plan: '', combo: '', extras: {}, opc: {}, desc: { fundador: false, manualPct: 0, manualVal: 0, completo: false, repite: false }, client: '', prospect: '' };
export function resetQ(keep = {}) { Object.assign(Q, { svc: '', plan: '', combo: '', extras: {}, opc: {}, desc: { fundador: false, manualPct: 0, manualVal: 0, completo: false, repite: false }, client: '', prospect: '' }, keep); }
const cfg10 = () => store.get('config', 'plan10m') || {};
const fundCupos = () => (cfg10().fundador?.cupos || 3) - store.list('cotizaciones').filter((q) => q.status === 'aprobada' && q.desc?.fundador).length - store.list('jobs').filter((j) => j.fundador && !j.quote).length;
const repite = (cid) => !!cid && store.list('jobs').some((j) => j.client === cid && (j.status === 'pagado' || j.status === 'entregado'));

// ---------- Cálculo ----------
export function calcular() {
  let base = 0, title = '', anticipoPct = 50, mensual = false, monthly = 0, incluye = '', noIncluye = '', entrega = '', svc = null, combo = null, lines = [];
  if (Q.tab === 'combos') {
    combo = store.get('combos', Q.combo); if (!combo) return null;
    base = Number(combo.price) || 0; title = 'Combo ' + combo.name;
    const ps = (combo.plans || []).map((id) => store.get('services', id)).filter(Boolean);
    incluye = ps.length ? ps.map((p) => `${p.name} · ${p.plan}${p.desc ? ': ' + p.desc.replace(/\n/g, ', ') : ''}`).join('\n') : (combo.items || '');
    anticipoPct = 50; lines.push([title, base]);
  } else {
    svc = store.get('services', Q.plan); if (!svc) return null;
    base = Number(svc.price) || 0; title = `${svc.name} · ${svc.plan || 'Único'}`; anticipoPct = Number(svc.anticipo ?? 50);
    mensual = !!svc.mensual; monthly = Number(svc.monthly) || 0; incluye = svc.desc || ''; noIncluye = svc.noIncluye || ''; entrega = svc.entrega || '';
    lines.push([title, base]);
    for (const x of svc.extras || []) if (Q.extras[x.name]) lines.push([`${Q.extras[x.name]} × ${x.name}`, x.price * Q.extras[x.name]]);
  }
  let sub = lines.reduce((a, l) => a + l[1], 0);
  const pct = svc ? (svc.opciones || []).reduce((a, o) => a + (Q.opc[o.name] ? o.pct : 0), 0) : 0;
  if (pct) { const v = Math.round(sub * pct / 100); lines.push([`Opciones (${pct > 0 ? '+' : ''}${pct} %)`, v]); sub += v; }
  const descs = []; const c = cfgNeg();
  if (Q.desc.fundador) descs.push([`Precio fundador −${cfg10().fundador?.pct || 10} %`, Math.round(sub * (cfg10().fundador?.pct || 10) / 100)]);
  if (Q.desc.repite) descs.push([`Cliente que repite −${c.repitePct} %`, Math.round(sub * c.repitePct / 100)]);
  if (Q.desc.completo) descs.push([`Pago completo −${c.pagoCompletoPct} %`, Math.round(sub * c.pagoCompletoPct / 100)]);
  if (Q.desc.manualPct) descs.push([`Descuento −${Q.desc.manualPct} %`, Math.round(sub * Q.desc.manualPct / 100)]);
  if (Q.desc.manualVal) descs.push(['Descuento acordado', Number(Q.desc.manualVal)]);
  const total = Math.max(0, Math.round(sub - descs.reduce((a, d) => a + d[1], 0)));
  const anticipo = Q.desc.completo ? total : Math.round(total * anticipoPct / 100);
  const d = svc ? derivado(svc) : null;
  const costos = svc ? Number(svc.costos) || 0 : 0;
  const porHora = d && d.hours ? Math.round((total - costos) / d.hours) : 0;
  const minimo = d && d.hours ? d.minimo : 0;
  return { svc, combo, title, lines, descs, sub, total, anticipo, saldo: total - anticipo, anticipoPct: Q.desc.completo ? 100 : anticipoPct, mensual, monthly, incluye, noIncluye, entrega, porHora, minimo, bajo: minimo && total < minimo };
}

// ---------- Pantalla ----------
export const cotizar = { id: 'cotizar', title: 'Cotizar', icon: '🧮',
  render(el, api) {
    const svcs = store.list('services');
    const sources = store.list('sources').filter((s) => (s.estado || 'activa') !== 'pausada');
    if (!svcs.length && !store.list('combos').length) { el.innerHTML = `<div class="empty"><b>Todavía no tienes planes</b>Crea tu primer plan en <b>Más → Planes y combos → ＋</b>, o entra con Google para cargar los del Plan $10M.<br><br><button class="btn btn-create" data-go="planes">＋ Crear un plan</button></div>`; el.onclick = (e) => { if (e.target.closest('[data-go]')) api.go('planes'); }; return; }
    const marcas = sources.filter((s) => svcs.some((v) => v.source === s.id) || store.list('combos').some((c) => c.source === s.id));
    if (!Q.marca || !marcas.some((m) => m.id === Q.marca)) Q.marca = marcas[0]?.id || '';
    const mySvcs = svcs.filter((v) => !Q.marca || v.source === Q.marca);
    const names = [...new Set(mySvcs.map((v) => v.name))];
    if (Q.tab === 'servicios' && !names.includes(Q.svc)) { Q.svc = names[0] || ''; Q.plan = ''; Q.extras = {}; Q.opc = {}; }
    const plans = mySvcs.filter((v) => v.name === Q.svc).sort((a, b) => a.price - b.price);
    if (Q.tab === 'servicios' && !plans.some((p) => p.id === Q.plan)) Q.plan = (plans.find((p) => /premium|pro/i.test(p.plan || '')) || plans[plans.length - 1] || {}).id || '';
    const combos = store.list('combos').filter((c) => !Q.marca || !c.source || c.source === Q.marca);
    if (Q.tab === 'combos' && !combos.some((c) => c.id === Q.combo)) Q.combo = combos[0]?.id || '';
    if (Q.client && repite(Q.client) && Q.desc.repite === false && !Q._repiteSugerido) { Q.desc.repite = true; Q._repiteSugerido = true; }
    const c = calcular(); const svc = c?.svc; const cup = fundCupos();
    const who = store.get('clients', Q.client)?.name || store.get('prospects', Q.prospect)?.name || '';
    el.innerHTML = `
      ${who ? `<div class="qwho">👤 Para <b>${esc(who)}</b> <button class="linkish" data-a="nowho">quitar</button></div>` : '<p class="muted" style="margin:0 0 8px;font-size:13px">Primero el precio; al final eliges a quién va.</p>'}
      <div class="picks">${marcas.map((m) => `<button class="pick ${m.id === Q.marca ? 'on' : ''}" data-marca="${m.id}" style="${m.id === Q.marca ? `background:${esc(m.color || '#FF8A1F')};border-color:${esc(m.color || '#FF8A1F')}` : ''}">${esc(m.name)}</button>`).join('')}</div>
      <div class="seg" style="margin:10px 0"><button type="button" data-tab="servicios" aria-pressed="${Q.tab === 'servicios'}">🧾 Servicios</button><button type="button" data-tab="combos" aria-pressed="${Q.tab === 'combos'}">🎁 Combos</button></div>
      ${Q.tab === 'servicios' ? `
        <div class="picks">${names.map((n) => `<button class="pick sm ${n === Q.svc ? 'on' : ''}" data-svc="${esc(n)}">${esc(n)}</button>`).join('') || '<span class="muted">Esta empresa no tiene servicios todavía.</span>'}</div>
        <div class="plans">${plans.map((p) => { const d = derivado(p); return `<button class="plan ${p.id === Q.plan ? 'on' : ''}" data-plan="${p.id}"><b>${esc(p.plan || 'Único')}${/premium|pro/i.test(p.plan || '') ? ' ★' : ''}</b>
          <span class="muted" style="font-size:12px">${esc((p.desc || '').split('\n')[0]).slice(0, 60)}</span><b class="num pp">${money(p.price)}${p.mensual ? '<small>/mes</small>' : ''}</b>
          ${d.porHora ? `<span class="num ${d.porHora < minHora() ? 'down' : 'muted'}" style="font-size:11.5px">${money(d.porHora)}/h</span>` : ''}</button>`; }).join('')}</div>
        ${svc && (svc.extras || []).length ? `<div class="card section"><h3>Extras</h3>${svc.extras.map((x) => `<div class="qrow"><span>${esc(x.name)} <span class="muted num">${money(x.price)}</span></span><div class="stp"><button data-ex="${esc(x.name)}" data-d="-1" aria-label="Menos">−</button><b class="num">${Q.extras[x.name] || 0}</b><button data-ex="${esc(x.name)}" data-d="1" aria-label="Más">＋</button></div></div>`).join('')}</div>` : ''}
        ${svc && (svc.opciones || []).length ? `<div class="picks section">${svc.opciones.map((o) => `<button class="pick sm ${Q.opc[o.name] ? 'on' : ''}" data-opc="${esc(o.name)}">${esc(o.name)} ${o.pct > 0 ? '+' : ''}${o.pct} %</button>`).join('')}</div>` : ''}`
      : `<div class="list">${combos.map((cb) => `<button class="list-item cbx ${cb.id === Q.combo ? 'on' : ''}" data-combo="${cb.id}"><span style="font-size:20px">🎁</span><div class="li-main"><div class="li-title">${esc(cb.name)}</div><div class="li-sub">${esc(cb.para || '')}${cb.separate ? ' · por separado ' + money(cb.separate) : ''}</div></div><b class="num">${money(cb.price)}</b></button>`).join('') || '<div class="empty"><b>Sin combos</b>Créalos en Más → Planes y combos.</div>'}</div>`}
      ${c ? `<div class="card section"><h3>Descuentos</h3>
        <div class="qrow"><label class="chkl"><input type="checkbox" data-dsc="fundador" ${Q.desc.fundador ? 'checked' : ''} ${cup <= 0 && !Q.desc.fundador ? 'disabled' : ''}> Precio fundador −${cfg10().fundador?.pct || 10} %</label><span class="chip ${cup > 0 ? 's-create' : ''}">quedan ${Math.max(0, cup)}</span></div>
        <div class="qrow"><label class="chkl"><input type="checkbox" data-dsc="repite" ${Q.desc.repite ? 'checked' : ''}> Cliente que repite −${cfgNeg().repitePct} %</label>${repite(Q.client) ? '<span class="chip">ya te compró</span>' : ''}</div>
        <div class="qrow"><label class="chkl"><input type="checkbox" data-dsc="completo" ${Q.desc.completo ? 'checked' : ''}> Paga todo de una vez −${cfgNeg().pagoCompletoPct} %</label></div>
        <div class="qrow"><span>Descuento a mano</span><div class="row" style="gap:6px;flex-wrap:nowrap"><input class="qin" id="dPct" type="number" inputmode="numeric" min="0" max="50" placeholder="%" value="${Q.desc.manualPct || ''}"><input class="qin wide" id="dVal" type="number" inputmode="numeric" min="0" step="1000" placeholder="$" value="${Q.desc.manualVal || ''}"></div></div>
      </div>
      <div class="qtot ${c.bajo ? 'bajo' : ''}">
        <div><span class="muted" style="font-size:12px">Total${c.mensual ? ' al mes' : ''}</span><div class="num qt">${money(c.total)}</div>${c.descs.length ? `<span class="muted num" style="font-size:12px"><s>${money(c.sub)}</s> · ahorra ${money(c.sub - c.total)}</span>` : ''}</div>
        <div style="text-align:right;font-size:12.5px" class="num">${c.anticipoPct < 100 ? `anticipo ${c.anticipoPct} %: <b>${money(c.anticipo)}</b><br>` : '<b>pago completo</b><br>'}${c.porHora ? `<span class="${c.bajo ? 'down' : 'up'}">${c.bajo ? '⚠ bajo tu mínimo ' + money(c.minimo) : 'ganas ' + money(c.porHora) + '/h'}</span>` : ''}</div>
      </div>
      <div class="row" style="margin-top:10px"><button class="btn btn-create" data-a="pdf" style="flex:1">📄 Compartir PDF</button><button class="btn btn-cancel" data-a="borrador">Guardar</button></div>` : ''}`;
    const onNum = () => { Q.desc.manualPct = Math.min(50, Math.max(0, Number(el.querySelector('#dPct')?.value) || 0)); Q.desc.manualVal = Math.max(0, Number(el.querySelector('#dVal')?.value) || 0); const cc = calcular(); const t = el.querySelector('.qt'); if (t && cc) t.textContent = money(cc.total); };
    el.oninput = (e) => { if (e.target.id === 'dPct' || e.target.id === 'dVal') onNum(); };
    el.onchange = (e) => { if (e.target.id === 'dPct' || e.target.id === 'dVal') { onNum(); this.render(el, api); } const d = e.target.dataset.dsc; if (d) { Q.desc[d] = e.target.checked; this.render(el, api); } };
    el.onclick = (e) => {
      const g = (s) => e.target.closest(s); let b;
      if ((b = g('[data-marca]'))) { Q.marca = b.dataset.marca; Q.svc = ''; Q.combo = ''; return this.render(el, api); }
      if ((b = g('[data-tab]'))) { Q.tab = b.dataset.tab; return this.render(el, api); }
      if ((b = g('[data-svc]'))) { Q.svc = b.dataset.svc; Q.plan = ''; Q.extras = {}; Q.opc = {}; return this.render(el, api); }
      if ((b = g('[data-plan]'))) { Q.plan = b.dataset.plan; Q.extras = {}; Q.opc = {}; return this.render(el, api); }
      if ((b = g('[data-combo]'))) { Q.combo = b.dataset.combo; return this.render(el, api); }
      if ((b = g('[data-ex]'))) { const k = b.dataset.ex; Q.extras[k] = Math.max(0, (Q.extras[k] || 0) + Number(b.dataset.d)); navigator.vibrate?.(6); return this.render(el, api); }
      if ((b = g('[data-opc]'))) { Q.opc[b.dataset.opc] = !Q.opc[b.dataset.opc]; return this.render(el, api); }
      const a = g('[data-a]')?.dataset.a;
      if (a === 'nowho') { Q.client = ''; Q.prospect = ''; Q._repiteSugerido = false; return this.render(el, api); }
      if (a === 'pdf' || a === 'borrador') { onNum(); elegirDestino(a === 'pdf', () => this.render(el, api)); }
    };
  } };

// Al final: ¿a quién va? (cliente, prospecto o nuevo)
function elegirDestino(enviar, after) {
  const go = () => guardar(enviar).then(after);
  if (Q.client || Q.prospect) return go();
  const cs = store.list('clients'); const ps = store.list('prospects').filter((p) => !['ganado', 'perdido'].includes(p.stage));
  const body = h(`<div class="form"><input class="qsearch" placeholder="🔎 Buscar cliente o prospecto…" autocomplete="off">
    <div class="list qlist">${[...cs.map((c) => ['c', c]), ...ps.map((p) => ['p', p])].map(([k, x]) => `<div class="list-item" data-${k}="${x.id}" data-n="${esc(x.name.toLowerCase())}"><span style="font-size:18px">${k === 'c' ? '🤝' : '🎯'}</span><div class="li-main"><div class="li-title">${esc(x.name)}</div><div class="li-sub">${k === 'c' ? 'Cliente' : 'Prospecto'}</div></div></div>`).join('')}</div>
    <div class="card"><b>＋ Nuevo</b><div class="field"><label for="nn">Nombre del negocio</label><input id="nn" placeholder="Barbería Flow"></div><div class="field"><label for="nw">WhatsApp</label><input id="nw" inputmode="tel" placeholder="300 555 1234"></div>
    <div class="row end"><button class="btn btn-create" data-a="new">Crear y ${enviar ? 'enviar' : 'guardar'}</button></div></div></div>`);
  const s = sheet('¿A quién va la cotización?', body);
  body.querySelector('.qsearch').oninput = (e) => { const v = e.target.value.toLowerCase(); body.querySelectorAll('.qlist .list-item').forEach((it) => { it.hidden = v && !it.dataset.n.includes(v); }); };
  body.addEventListener('click', (e) => {
    const c = e.target.closest('[data-c]'); const p = e.target.closest('[data-p]');
    if (c) { Q.client = c.dataset.c; s.close(); setTimeout(go, 280); return; }
    if (p) { Q.prospect = p.dataset.p; s.close(); setTimeout(go, 280); return; }
    if (e.target.closest('[data-a=new]')) {
      const n = body.querySelector('#nn').value.trim(); if (!n) { toast('Escribe el nombre'); return; }
      const cl = store.add('clients', { name: n, contact: body.querySelector('#nw').value.trim(), source: Q.marca });
      Q.client = cl.id; s.close(); setTimeout(go, 280);
    }
  });
}
async function guardar(enviar) {
  const c = calcular(); if (!c) return;
  const now = new Date(); const exp = new Date(); exp.setDate(exp.getDate() + cfgNeg().validez);
  const iso = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 10); };
  const rec = store.add('cotizaciones', {
    number: nextNumber(), client: Q.client || '', prospect: Q.prospect || '', source: Q.marca, service: c.svc?.id || '', combo: c.combo?.id || '', title: c.title,
    lines: c.lines, descs: c.descs, desc: { ...Q.desc }, total: c.total, sub: c.sub, anticipo: c.anticipo, anticipoPct: c.anticipoPct, mensual: c.mensual,
    status: enviar ? 'enviada' : 'borrador', sentAt: enviar ? now.toISOString() : '', expiresAt: enviar ? iso(exp) : '',
  });
  if (!enviar) { toast('Cotización guardada como borrador'); resetQ({ marca: Q.marca, tab: Q.tab }); return; }
  bumpReg('cotizaciones');
  if (Q.prospect) store.update('prospects', Q.prospect, { lastAt: fmt.today() });
  const r = await compartirCotizacion(rec);
  toast(r === 'descargado' ? '📄 PDF descargado: adjúntalo en WhatsApp o en tu correo' : r === 'cancelado' ? 'Quedó guardada como enviada; puedes compartirla desde la ficha' : '📄 Cotización enviada ' + rec.number);
  resetQ({ marca: Q.marca, tab: Q.tab });
}

// ---------- PDF ----------
export function pdfCotizacion(q) {
  const co = cobro(); const src = store.get('sources', q.source); const cl = store.get('clients', q.client) || store.get('prospects', q.prospect) || {};
  const svc = store.get('services', q.service); const combo = store.get('combos', q.combo);
  const d = crearPDF();
  d.text(src?.name || co.nombre || 'NEXO', { size: 20, bold: true, color: '#E0700E' });
  d.text([co.nombre, co.telefono && 'WhatsApp ' + co.telefono, co.correo, co.instagram].filter(Boolean).join('  ·  ') || 'Agrega tus datos en NEXO Negocios → Más → Mis datos de cobro', { size: 9.5, color: '#5A6375' });
  d.space(10).row(`COTIZACIÓN ${q.number}`, `Fecha: ${fmt.date((q.sentAt || q.createdAt || '').slice(0, 10))}`, { size: 13, bold: true });
  d.row(`Para: ${cl.name || '—'}`, q.expiresAt ? `Válida hasta: ${fmt.date(q.expiresAt)} (${cfgNeg().validez} días)` : '', { size: 10.5 });
  d.hr();
  for (const [l, v] of q.lines || []) d.row(l, fmt.money(v), { size: 11.5 });
  for (const [l, v] of q.descs || []) d.row(l, '− ' + fmt.money(v), { size: 11, color: '#1E8F55' });
  d.hr('#1A1F2A').row('TOTAL' + (q.mensual ? ' (al mes)' : ''), fmt.money(q.total), { size: 15, bold: true });
  if (q.anticipoPct < 100) d.row(`Anticipo ${q.anticipoPct} % para empezar`, fmt.money(q.anticipo), { size: 10.5, color: '#5A6375' }).row('Saldo al entregar', fmt.money(q.total - q.anticipo), { size: 10.5, color: '#5A6375' });
  else d.row('Pago completo al aprobar', fmt.money(q.total), { size: 10.5, color: '#5A6375' });
  const incl = svc?.desc || (combo ? (combo.plans || []).map((id) => store.get('services', id)).filter(Boolean).map((p) => `${p.name} · ${p.plan}`).join('\n') || combo.items : '');
  if (incl) d.space(6).text('QUÉ INCLUYE', { size: 10, bold: true, color: '#5A6375' }).text(incl.split('\n').map((x) => '•  ' + x.trim()).join('\n'), { size: 10.5 });
  if (svc?.noIncluye) d.space(4).text('NO INCLUYE', { size: 10, bold: true, color: '#5A6375' }).text(svc.noIncluye, { size: 10.5 });
  d.space(6).text('TÉRMINOS', { size: 10, bold: true, color: '#5A6375' });
  d.text([svc?.entrega ? `•  Tiempo de entrega: ${svc.entrega}, contados desde el anticipo.` : '', `•  Esta cotización es válida por ${cfgNeg().validez} días.`, '•  Lo que no está en "Qué incluye" se cotiza aparte.', q.mensual ? '•  Servicio mensual: se paga al inicio de cada mes.' : ''].filter(Boolean).join('\n'), { size: 10 });
  const pagos = [co.nequi && `Nequi: ${co.nequi}`, co.daviplata && `Daviplata: ${co.daviplata}`, co.banco && co.cuenta && `${co.banco} ${co.tipoCuenta || ''} N.º ${co.cuenta}`, co.titular && `Titular: ${co.titular}${co.cedula ? ' · C.C. ' + co.cedula : ''}`].filter(Boolean);
  d.space(6).text('CÓMO PAGAR', { size: 10, bold: true, color: '#5A6375' }).text(pagos.length ? pagos.join('\n') : 'Escríbeme y te paso los datos de pago.', { size: 10.5 });
  d.space(18).text('ACEPTO ESTA COTIZACIÓN', { size: 10, bold: true, color: '#5A6375' }).space(16);
  d.row('Nombre: ______________________________', 'Fecha: ______________', { size: 10.5 }).space(10).row('Firma: _______________________________', '', { size: 10.5 });
  return d.blob();
}
export async function compartirCotizacion(q) {
  const cl = store.get('clients', q.client) || store.get('prospects', q.prospect) || {};
  const file = `Cotizacion-${q.number}-${(cl.name || 'cliente').replace(/[^\wáéíóúñ]+/gi, '-')}.pdf`;
  return compartirPDF(pdfCotizacion(q), file, { title: `Cotización ${q.number}`, text: `Hola${cl.name ? ' ' + cl.name : ''} 👋 Te comparto la cotización ${q.number} (${q.title}): ${fmt.money(q.total)}. Es válida por ${cfgNeg().validez} días. Cualquier duda me escribes. — ${cobro().nombre || 'Cristóbal'}` });
}
