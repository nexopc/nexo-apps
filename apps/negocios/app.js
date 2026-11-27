// NEXO Negocios v3 · tu trabajo — diseño acordado en docs/NEGOCIOS_V3.md
// Arriba la plata del mes; abajo tus clientes como en WhatsApp (lo urgente primero). Misiones automáticas.
import { boot, fromSchema, store, fmt, esc, h, openForm, toast, sheet, confirmSheet, openTimer } from '../../core/shell.js';
import { timer, clock } from '../../core/timer.js';
import { generar, delDia, crearPropia, marcar, cuantas } from '../../core/misiones.js';
import { money, cobradoMes, metaMes, semaforo, porCobrar, trabajosActivos, saldoTrabajo, historia, resumen, bumpReg, regHoy, waLink, cuando, iniciales, colorOf, cobro, daysAgo, minHora } from './datos.js';
import { cotizar, Q, resetQ, compartirCotizacion } from './cotizar.js';
import { planes, empresas, crearMenu } from './catalogo.js';

const VERSION = '3.0.0';
const clientesMod = fromSchema('clients', { id: 'clientes-f', title: 'Cliente', single: 'cliente' });
const prospMod = fromSchema('prospects', { id: 'prospectos', title: 'Prospectos', icon: '🎯', single: 'prospecto', preset: () => ({ temp: 'tibio', stage: 'nuevo', nextDate: fmt.today() }) });
const jobMod = fromSchema('jobs', { id: 'trabajo-f', title: 'Trabajo', single: 'trabajo' });
let filtro = 'todos', buscar = '';

// ---------- Misiones (se usan en Clientes y en Mi día) ----------
function misionesHtml(compact = false) {
  generar(fmt.today());
  const ms = delDia(); const done = ms.filter((m) => m.done).length; const sem = semaforo();
  return `<div class="card mis"><div class="row" style="justify-content:space-between"><b>🎯 Misiones de hoy <span class="muted num">${done}/${ms.length}</span></b>
      <span class="muted" style="font-size:11.5px">${sem ? { rojo: '🔴', amarillo: '🟡', verde: '🟢' }[sem.color] + ' ' + sem.txt.toLowerCase() + ' → ' + cuantas() + ' automáticas' : ''}</span></div>
    <div class="bar" style="margin:6px 0 4px"><i style="width:${ms.length ? done / ms.length * 100 : 0}%"></i></div>
    ${(compact ? ms.filter((m) => !m.done).slice(0, 3) : ms).map((m) => `<div class="mrow ${m.done ? 'done' : ''}"><button class="check" data-mis="${m.id}" aria-pressed="${!!m.done}" aria-label="Marcar">✓</button><span class="mt" data-mgo="${m.id}">${esc(m.title)}</span>${m.sola ? '<span class="chip s-create">sola</span>' : ''}</div>`).join('') || '<p class="muted" style="margin:4px 0">Sin misiones: vas al día.</p>'}
    ${compact && ms.filter((m) => !m.done).length > 3 ? `<button class="linkish" data-go="midia">Ver las ${ms.filter((m) => !m.done).length}</button>` : ''}
    ${compact ? '' : '<form class="nq" data-misnew style="margin-top:8px"><input name="q" placeholder="＋ Tu propia misión… Enter" autocomplete="off" enterkeyhint="done"><button class="btn btn-create sm">＋</button></form><p class="muted" style="font-size:12px;margin:6px 0 0">Se marcan solas cuando cobras, cotizas o registras el seguimiento. En NEXO PLAN, ⚡ Organizar las pone en tus ratos libres.</p>'}
  </div>`;
}
function misionesClick(e, api) {
  const c = e.target.closest('[data-mis]'); if (c) { const m = store.get('misiones', c.dataset.mis); marcar(m.id, !m.done); navigator.vibrate?.(10); if (!m.done) toast('🎯 ¡Misión cumplida!'); return true; }
  const g = e.target.closest('[data-mgo]');
  if (g) { const m = store.get('misiones', g.dataset.mgo); const r = m?.ref || {};
    if (m.client) { fichaCliente(m.client); return true; }
    if (m.prospect || r.col === 'prospects') { fichaProspecto(m.prospect || r.id); return true; }
    if (m.type === 'contactos') { api.go('midia'); return true; } return true; }
  if (e.target.closest('[data-go=midia]')) { api.go('midia'); return true; }
  return false;
}

// ---------- 💬 Clientes (inicio) ----------
function home(el, api) {
  const cob = cobradoMes(), meta = metaMes(), sem = semaforo(), debe = porCobrar();
  const cs = store.list('clients').map((c) => ({ c, r: resumen(c) }));
  let list = cs;
  if (filtro === 'cobrar') list = cs.filter((x) => x.r.debe > 0);
  if (filtro === 'sinresp') list = cs.filter((x) => x.r.sinResp);
  if (buscar) list = list.filter((x) => (x.c.name + ' ' + (x.c.negocio || '')).toLowerCase().includes(buscar.toLowerCase()));
  list.sort((a, b) => b.r.urg - a.r.urg || String(b.r.at || '').localeCompare(String(a.r.at || '')));
  el.innerHTML = `
    <button class="card money" data-go="cobros">
      <div class="row" style="justify-content:space-between;align-items:flex-end"><div><span class="muted" style="font-size:12px">Cobrado en ${new Date().toLocaleDateString('es-CO', { month: 'long' })}</span><div class="num big">${money(cob)}</div></div>${meta ? `<div style="text-align:right;font-size:12px"><span class="muted">meta</span><br><b class="num">${money(meta)}</b></div>` : ''}</div>
      ${meta ? `<div class="bar" style="margin:8px 0"><i style="width:${Math.min(100, cob / meta * 100)}%"></i></div>` : ''}
      <div class="row" style="justify-content:space-between;font-size:12.5px">${sem ? `<span><i class="luz ${sem.color}"></i> <b>${sem.txt}</b>${sem.dia ? ' · ' + money(sem.dia) + '/día' : ''}</span>` : '<span class="muted">Ponle meta a tus empresas en Más → Empresas</span>'}<span>💵 <b class="num">${money(debe)}</b> por cobrar</span></div>
    </button>
    ${misionesHtml(true)}
    <input class="search" type="search" placeholder="🔎 Buscar cliente…" value="${esc(buscar)}" aria-label="Buscar cliente">
    <div class="picks" style="margin:8px 0">${[['todos', 'Todos'], ['cobrar', '💵 Por cobrar ' + cs.filter((x) => x.r.debe > 0).length], ['sinresp', '⏳ Sin respuesta ' + cs.filter((x) => x.r.sinResp).length]].map(([k, l]) => `<button class="pick sm ${filtro === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
    <div class="clist">${list.map(({ c, r }) => `<button class="cli" data-c="${c.id}"><span class="av" style="--k:${esc(colorOf(r.source))}">${esc(iniciales(c.name))}</span>
      <span class="cm"><b>${esc(c.name)}</b><small>${r.last ? esc(r.last.ic + ' ' + r.last.t) : esc(c.negocio || 'Sin movimientos todavía')}</small>${r.source ? `<em style="--k:${esc(colorOf(r.source))}">${esc(store.get('sources', r.source)?.name || '')}</em>` : ''}</span>
      <span class="cr"><small>${r.at ? cuando(r.at) : ''}</small>${r.debe > 0 ? `<span class="badge">cobrar ${money(r.debe)}</span>` : r.sinResp ? '<span class="chip s-pending">⏳ seguir</span>' : ''}</span></button>`).join('') || `<div class="empty"><b>${buscar || filtro !== 'todos' ? 'Nadie con ese filtro' : 'Todavía no tienes clientes'}</b>${buscar || filtro !== 'todos' ? '' : 'Cuando cotices o ganes un prospecto aparecen aquí. También puedes agregar uno: <button class="linkish" data-a="newc">＋ Cliente</button>'}</div>`}</div>`;
  const s = el.querySelector('.search'); s.oninput = () => { buscar = s.value; const pos = s.selectionStart; api.paint(); const n = document.querySelector('.search'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } };
  el.onclick = (e) => {
    if (misionesClick(e, api)) return;
    const g = (x) => e.target.closest(x); let b;
    if ((b = g('[data-go]'))) return api.go(b.dataset.go);
    if ((b = g('[data-f]'))) { filtro = b.dataset.f; return api.paint(); }
    if ((b = g('[data-c]'))) return fichaCliente(b.dataset.c, api);
    if (g('[data-a=newc]')) openForm(clientesMod);
  };
}

// ---------- Ficha del cliente (historia tipo chat) ----------
export function fichaCliente(cid, api) {
  const body = h('<div class="ficha"></div>');
  let un = null;
  const s = sheet('Cliente', body, { onClose: () => un?.() });
  const paint = () => {
    const c = store.get('clients', cid); if (!c) return s.close();
    const r = resumen(c); const hs = historia(cid).slice(-40);
    const jobs = store.list('jobs').filter((j) => j.client === cid && j.status !== 'cotizado');
    const qs = store.list('cotizaciones').filter((q) => q.client === cid && ['enviada', 'vencida', 'borrador'].includes(q.status));
    const pagado = store.list('abonos').filter((a) => store.get('jobs', a.job)?.client === cid).reduce((x, a) => x + (Number(a.amount) || 0), 0);
    body.innerHTML = `<div class="fhead"><span class="av big" style="--k:${esc(colorOf(r.source))}">${esc(iniciales(c.name))}</span><div><b class="fn">${esc(c.name)}</b>
        <div class="muted" style="font-size:12.5px">${[store.get('sources', r.source)?.name, c.negocio, c.createdAt ? 'cliente desde ' + fmt.date(c.createdAt.slice(0, 10)) : ''].filter(Boolean).map(esc).join(' · ')}</div>
        <div class="muted" style="font-size:12.5px">${[c.contact && '📱 ' + c.contact, c.address && '📍 ' + c.address, c.ig && '📸 ' + c.ig, c.tiktok && '🎵 ' + c.tiktok].filter(Boolean).map(esc).join(' · ')}</div></div></div>
      <div class="acts"><button data-a="wa"><i>💬</i>WhatsApp</button><button data-a="cot"><i>🧮</i>Cotizar</button><button data-a="cobrar"><i>💵</i>Cobrar</button><button data-a="nota"><i>📝</i>Nota</button></div>
      ${qs.map((q) => `<div class="card qcard"><div class="row" style="justify-content:space-between"><b>🧮 ${esc(q.number || '')} · ${esc(q.title)}</b><b class="num">${money(q.total)}</b></div>
        <span class="muted" style="font-size:12px">${q.status === 'enviada' ? `Enviada ${cuando(q.sentAt)} · vence ${fmt.date(q.expiresAt)}` : q.status === 'vencida' ? '⌛ Vencida' : 'Borrador'}</span>
        <div class="row" style="margin-top:6px">${q.status !== 'borrador' ? `<button class="btn btn-create sm" data-ok="${q.id}">✅ Aprobó</button>` : ''}${q.status === 'enviada' ? `<button class="btn btn-edit ghost sm" data-seg="${q.id}">🔁 Ya le hice seguimiento</button>` : `<button class="btn btn-edit ghost sm" data-re="${q.id}">📄 ${q.status === 'borrador' ? 'Enviar' : 'Reenviar'}</button>`}<button class="btn btn-delete ghost sm" data-no="${q.id}">✕ No aceptó</button></div></div>`).join('')}
      ${jobs.filter((j) => j.status !== 'pagado').map((j) => { const sd = saldoTrabajo(j); return `<div class="card qcard"><div class="row" style="justify-content:space-between"><b>🛠 ${esc(j.title)}</b><span class="chip">${esc(j.status)}</span></div>
        <div class="bar" style="margin:6px 0"><i style="width:${j.price ? (j.price - sd) / j.price * 100 : 0}%;background:var(--c-create)"></i></div><span class="muted num" style="font-size:12px">Pagado ${money(j.price - sd)} de ${money(j.price)}${j.due ? ' · entrega ' + fmt.date(j.due) : ''}</span>
        <div class="row" style="margin-top:6px">${j.status === 'aprobado' ? `<button class="btn btn-edit ghost sm" data-st="${j.id}|en curso">▶ Empecé</button>` : j.status === 'en curso' ? `<button class="btn btn-edit ghost sm" data-st="${j.id}|entregado">📦 Entregué</button>` : ''}${sd > 0 ? `<button class="btn btn-create sm" data-ab="${j.id}">💵 Abono</button>` : ''}<button class="btn btn-cancel ghost sm" data-tm="${j.id}">⏱</button></div></div>`; }).join('')}
      <div class="tl">${hs.map((e) => `<div class="ev"><span class="dot">${e.ic}</span><div class="bub"><span>${esc(e.t)}</span><small>${fmt.date(String(e.at).slice(0, 10))}${e.s ? ' · ' + esc(e.s) : ''}</small></div></div>`).join('') || '<p class="muted">Sin historia todavía.</p>'}</div>
      <div class="card row" style="justify-content:space-between;font-size:13px"><span class="muted">Te ha pagado</span><b class="num up">${money(pagado)}</b><span class="muted">Te debe</span><b class="num">${money(r.debe)}</b></div>
      <div class="row end"><button class="btn btn-edit ghost sm" data-a="edit">✎ Editar datos</button></div>`;
  };
  paint();
  un = store.subscribe('*', (col) => { if (['clients', 'jobs', 'abonos', 'cotizaciones', 'clientLog', 'invoices'].includes(col)) paint(); });
  body.addEventListener('click', async (e) => {
    const g = (x) => e.target.closest(x); let b;
    const c = store.get('clients', cid);
    if ((b = g('[data-ok]'))) return aprobar(store.get('cotizaciones', b.dataset.ok));
    if ((b = g('[data-seg]'))) { store.update('cotizaciones', b.dataset.seg, { followAt: fmt.today() }); bumpReg('seguimientos'); toast('🔁 Seguimiento anotado'); return; }
    if ((b = g('[data-re]'))) { const q = store.get('cotizaciones', b.dataset.re); const exp = new Date(); exp.setDate(exp.getDate() + 3); store.update('cotizaciones', q.id, { status: 'enviada', sentAt: new Date().toISOString(), expiresAt: exp.toISOString().slice(0, 10) }); if (q.status === 'borrador') bumpReg('cotizaciones'); await compartirCotizacion(store.get('cotizaciones', q.id)); return; }
    if ((b = g('[data-no]'))) { if (await confirmSheet('¿No aceptó?', 'La cotización queda como no aceptada en su historia.', { yes: 'Sí, no aceptó', danger: true })) store.update('cotizaciones', b.dataset.no, { status: 'rechazada' }); return; }
    if ((b = g('[data-st]'))) { const [id, st] = b.dataset.st.split('|'); store.update('jobs', id, { status: st, ...(st === 'entregado' ? { deliveredAt: fmt.today() } : {}) }); toast(st === 'entregado' ? '📦 Entregado: toca 💵 Abono cuando te pague el saldo' : '▶ En curso'); return; }
    if ((b = g('[data-ab]'))) return abonoSheet(b.dataset.ab);
    if ((b = g('[data-tm]'))) { const j = store.get('jobs', b.dataset.tm); return openTimer({ label: j.title, kind: 'trabajo', job: j.id, source: j.source }); }
    const a = g('[data-a]')?.dataset.a;
    if (a === 'wa') plantillas(c);
    if (a === 'cot') { s.close(); resetQ({ client: cid, marca: c.source || Q.marca }); setTimeout(() => document.querySelector('[data-nav=cotizar]')?.click(), 280); }
    if (a === 'cobrar') { const js = store.list('jobs').filter((j) => j.client === cid && ['aprobado', 'en curso', 'entregado'].includes(j.status) && saldoTrabajo(j) > 0); if (!js.length) return toast('No te debe nada ✓'); abonoSheet(js.length === 1 ? js[0].id : null, cid); }
    if (a === 'nota') { const f = h('<form class="form"><textarea id="nt" rows="3" placeholder="Prefiere que lo llamen después de las 2 p. m."></textarea><div class="row end"><button class="btn btn-create">Guardar nota</button></div></form>'); const s2 = sheet('📝 Nota de ' + c.name, f); f.addEventListener('submit', (ev) => { ev.preventDefault(); const v = f.querySelector('#nt').value.trim(); if (!v) return; store.add('clientLog', { client: cid, kind: 'nota', text: v }); s2.close(); }); setTimeout(() => f.querySelector('#nt').focus(), 300); }
    if (a === 'edit') openForm(clientesMod, c);
  });
  return s;
}

// Plantillas de WhatsApp
function plantillas(c) {
  const co = cobro(); const firma = '\n— ' + (co.nombre || 'Cristóbal');
  const q = store.list('cotizaciones').filter((x) => x.client === c.id && ['enviada', 'vencida'].includes(x.status)).sort((a, b) => String(b.sentAt).localeCompare(String(a.sentAt)))[0];
  const jd = store.list('jobs').filter((j) => j.client === c.id && saldoTrabajo(j) > 0 && ['aprobado', 'en curso', 'entregado'].includes(j.status))[0];
  const jl = store.list('jobs').filter((j) => j.client === c.id && ['en curso', 'entregado'].includes(j.status))[0];
  const pagos = [co.nequi && 'Nequi ' + co.nequi, co.daviplata && 'Daviplata ' + co.daviplata, co.banco && co.cuenta && `${co.banco} ${co.cuenta}`].filter(Boolean).join(' · ');
  const combo = store.list('combos')[0];
  const T = [
    ['seg', '🔁 Seguimiento', `Hola ${c.name} 👋 ¿Pudiste revisar la cotización${q ? ' de ' + q.title + ' (' + money(q.total) + ')' : ''}? Si quieres te muestro un ejemplo de un trabajo parecido. Quedo atento.` + firma],
    ['pago', '💵 Recordatorio de pago', `Hola ${c.name} 👋 Te escribo por el saldo${jd ? ' de ' + jd.title : ''}: ${money(jd ? saldoTrabajo(jd) : 0)}.${pagos ? ' Puedes pagar por ' + pagos + '.' : ''} ¡Gracias!` + firma],
    ['listo', '📦 Trabajo listo', `Hola ${c.name} 👋 ¡Tu ${jl ? jl.title : 'trabajo'} está listo! Te lo comparto para que lo revises y me digas si quieres algún ajuste.` + firma],
    ['promo', '🎁 Saludo / promo', `Hola ${c.name} 👋 ¿Cómo va el negocio? Este mes tengo ${combo ? 'el combo ' + combo.name + ' a ' + money(combo.price) : 'promociones para clientes como tú'}. ¿Te cuento?` + firma],
  ];
  const body = h(`<div class="form">${T.map(([k, l, t]) => `<button class="tpl" data-t="${k}"><b>${l}</b><span>${esc(t)}</span></button>`).join('')}${c.contact ? '' : '<p class="muted" style="font-size:12px;margin:0">Este cliente no tiene WhatsApp guardado: se abrirá para que elijas el chat.</p>'}</div>`);
  const s = sheet('💬 WhatsApp a ' + c.name, body);
  body.onclick = (e) => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    const t = T.find((x) => x[0] === b.dataset.t);
    window.open(waLink(c.contact, t[2]), '_blank', 'noopener');
    store.add('clientLog', { client: c.id, kind: 'whatsapp', text: t[1] + ' enviado' });
    if (b.dataset.t === 'seg' && q) { store.update('cotizaciones', q.id, { followAt: fmt.today() }); bumpReg('seguimientos'); }
    s.close();
  };
}
function aprobar(q) {
  if (!q) return;
  const job = store.add('jobs', { title: q.title, client: q.client, source: q.source, service: q.service || '', price: q.total, anticipo: q.anticipoPct ?? 50, status: 'aprobado', quote: q.id, fundador: !!q.desc?.fundador });
  store.update('cotizaciones', q.id, { status: 'aprobada', approvedAt: fmt.today(), job: job.id });
  bumpReg('ventas');
  toast('✅ ¡Venta! Se creó el trabajo; registra el anticipo cuando te pague');
  setTimeout(() => abonoSheet(job.id), 400);
}
export function abonoSheet(jobId, clientId) {
  const opciones = store.list('jobs').filter((j) => (jobId ? j.id === jobId : j.client === clientId) && saldoTrabajo(j) > 0);
  let jid = jobId || opciones[0]?.id;
  const body = h('<form class="form" novalidate></form>');
  const s = sheet('💵 Registrar pago', body);
  const paint = () => {
    const j = store.get('jobs', jid); const sd = j ? saldoTrabajo(j) : 0; const pag = j ? j.price - sd : 0; const ant = j ? Math.round(j.price * (Number(j.anticipo ?? 50) / 100)) : 0;
    const accs = store.list('accounts');
    body.innerHTML = `${opciones.length > 1 ? `<div class="picks">${opciones.map((o) => `<button type="button" class="pick ${o.id === jid ? 'on' : ''}" data-j="${o.id}">${esc(o.title)}</button>`).join('')}</div>` : `<b>${esc(j?.title || '')}</b>`}
      <p class="muted num" style="margin:0">Pagado ${money(pag)} de ${money(j?.price)} · falta <b style="color:var(--fg)">${money(sd)}</b></p>
      <div class="picks">${pag < ant ? `<button type="button" class="pick" data-v="${ant - pag}" data-k="anticipo">Anticipo ${money(ant - pag)}</button>` : ''}<button type="button" class="pick" data-v="${sd}" data-k="saldo">Todo el saldo ${money(sd)}</button></div>
      <div class="field"><label for="av">Valor</label><input id="av" type="number" inputmode="numeric" step="1000" min="0" placeholder="$"></div>
      ${accs.length ? `<div class="field"><label for="ac">Entra a la cuenta</label><select id="ac">${accs.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>` : ''}
      <div class="row end"><button class="btn btn-create">✓ Guardar pago</button></div>`;
  };
  paint();
  let kind = 'abono';
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-j]'); if (b) { jid = b.dataset.j; return paint(); }
    const v = e.target.closest('[data-v]'); if (v) { body.querySelector('#av').value = v.dataset.v; kind = v.dataset.k; }
  });
  body.addEventListener('submit', (e) => {
    e.preventDefault(); const j = store.get('jobs', jid); if (!j) return;
    const val = Number(body.querySelector('#av').value) || 0; if (val <= 0) return toast('Escribe el valor');
    const sd = saldoTrabajo(j); if (val > sd + 1) return toast(`El saldo es ${money(sd)}: no puede ser más`);
    store.add('abonos', { job: j.id, amount: val, kind: val >= sd ? (j.price - sd > 0 ? 'saldo' : kind) : kind, date: fmt.today(), account: body.querySelector('#ac')?.value || '' });
    toast(val >= sd ? '✅ Pagado completo · entró a Finanzas' : `💵 ${money(val)} registrado · entró a Finanzas`); s.close();
  });
}

// ---------- 🎯 Prospectos (lista aparte, simple) ----------
const prospectos = { ...prospMod,
  render(el) {
    const ps = store.list('prospects').filter((p) => !['ganado', 'perdido'].includes(p.stage));
    const cal = ps.filter((p) => p.temp === 'caliente');
    const posible = ps.reduce((a, p) => a + (Number(p.potential) || 0), 0);
    const hoy = ps.filter((p) => p.nextDate && p.nextDate <= fmt.today());
    ps.sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999') || ({ caliente: 0, tibio: 1, frio: 2 }[a.temp || 'tibio'] - { caliente: 0, tibio: 1, frio: 2 }[b.temp || 'tibio']));
    el.innerHTML = `<div class="card psum"><div><b class="num">🔥 ${cal.length}</b><small>calientes</small></div><div><b class="num up">${money(posible)}</b><small>posibles</small></div><div><b class="num">${hoy.length}</b><small>para hoy</small></div></div>
      <div class="clist section">${ps.map((p) => `<button class="cli" data-p="${p.id}"><span class="av t-${p.temp || 'tibio'}">${{ caliente: '🔥', tibio: '🌤', frio: '❄️' }[p.temp || 'tibio']}</span>
        <span class="cm"><b>${esc(p.name)}</b><small>${esc(p.next || 'Sin próximo paso')}${p.interest ? ' · ' + esc(p.interest) : ''}</small></span>
        <span class="cr"><small class="${p.nextDate && p.nextDate < fmt.today() ? 'down' : ''}">${p.nextDate ? (p.nextDate === fmt.today() ? 'hoy' : fmt.date(p.nextDate)) : ''}</small>${p.potential ? `<b class="num" style="font-size:12.5px">${money(p.potential)}</b>` : ''}</span></button>`).join('') || '<div class="empty"><b>Sin prospectos</b>Toca ＋ para anotar el primer negocio que visitaste.</div>'}</div>
      ${store.list('prospects').some((p) => ['ganado', 'perdido'].includes(p.stage)) ? `<p class="muted" style="font-size:12px">${store.list('prospects').filter((p) => p.stage === 'ganado').length} ganados · ${store.list('prospects').filter((p) => p.stage === 'perdido').length} perdidos</p>` : ''}`;
    el.onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) fichaProspecto(b.dataset.p); };
  } };
export function fichaProspecto(pid) {
  const p = store.get('prospects', pid); if (!p) return;
  const body = h(`<div class="form">
    <div class="row" style="gap:6px"><span class="chip">${{ caliente: '🔥 Caliente', tibio: '🌤 Tibio', frio: '❄️ Frío' }[p.temp || 'tibio']}</span>${p.origin ? `<span class="chip">vía ${esc(p.origin)}</span>` : ''}${p.potential ? `<span class="chip s-create">${money(p.potential)} posibles</span>` : ''}</div>
    ${p.interest ? `<p style="margin:0">💡 Le interesa: <b>${esc(p.interest)}</b></p>` : ''}
    <p style="margin:0">➡️ ${esc(p.next || 'Sin próximo paso')}${p.nextDate ? ' · ' + fmt.date(p.nextDate) : ''}</p>
    <div class="acts"><button data-a="wa"><i>💬</i>WhatsApp</button><button data-a="cot"><i>🧮</i>Cotizar</button><button data-a="cont"><i>✓</i>Contacté</button><button data-a="edit"><i>✎</i>Editar</button></div>
    <div class="row"><button class="btn btn-create" data-a="win" style="flex:1">✅ Ganado: pasar a clientes</button><button class="btn btn-delete ghost" data-a="lose">✕ Perdido</button></div></div>`);
  const s = sheet('🎯 ' + p.name, body);
  body.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'wa') { window.open(waLink(p.contact, `Hola ${p.name} 👋 Soy ${cobro().nombre || 'Cristóbal'}. ¿Tienes 5 minutos para mostrarte cómo puedo ayudarte con ${p.interest || 'tu negocio'}?`), '_blank', 'noopener'); store.update('prospects', p.id, { lastAt: fmt.today() }); bumpReg('seguimientos'); }
    if (a === 'cot') { s.close(); resetQ({ prospect: p.id }); setTimeout(() => document.querySelector('[data-nav=cotizar]')?.click(), 280); }
    if (a === 'cont') {
      const f = h(`<form class="form"><div class="field"><label for="pn">Próximo paso</label><input id="pn" value="${esc(p.next || '')}" placeholder="Mostrarle ejemplos el jueves"></div><div class="picks">${[['1', 'Mañana'], ['2', 'En 2 días'], ['7', 'En una semana']].map(([d, l]) => `<button type="button" class="pick" data-d="${d}">${l}</button>`).join('')}</div><div class="field"><label for="pd">Fecha</label><input id="pd" type="date" value="${esc(p.nextDate && p.nextDate > fmt.today() ? p.nextDate : '')}"></div><div class="row end"><button class="btn btn-create">✓ Guardar</button></div></form>`);
      const s2 = sheet('✓ Contacté a ' + p.name, f);
      f.onclick = (ev) => { const b = ev.target.closest('[data-d]'); if (!b) return; const d = new Date(); d.setDate(d.getDate() + Number(b.dataset.d)); f.querySelector('#pd').value = d.toISOString().slice(0, 10); };
      f.addEventListener('submit', (ev) => { ev.preventDefault(); store.update('prospects', p.id, { lastAt: fmt.today(), next: f.querySelector('#pn').value.trim(), nextDate: f.querySelector('#pd').value }); bumpReg('seguimientos'); toast('✓ Anotado'); s2.close(); s.close(); });
    }
    if (a === 'edit') { s.close(); setTimeout(() => openForm(prospMod, p), 280); }
    if (a === 'win') { const c = store.add('clients', { name: p.name, contact: p.contact || '', negocio: p.interest ? '' : '', fromProspect: p.id, note: [p.interest && 'Le interesa: ' + p.interest, p.origin && 'Vía: ' + p.origin].filter(Boolean).join(' · ') }); store.update('prospects', p.id, { stage: 'ganado', client: c.id }); for (const q of store.list('cotizaciones').filter((x) => x.prospect === p.id)) store.update('cotizaciones', q.id, { client: c.id }); toast('✅ ¡Nuevo cliente!'); s.close(); setTimeout(() => fichaCliente(c.id), 300); }
    if (a === 'lose' && await confirmSheet('¿Perdido?', `${p.name} sale de tu lista de prospectos.`, { yes: 'Perdido', danger: true })) { store.update('prospects', p.id, { stage: 'perdido' }); s.close(); }
  });
}

// ---------- 📒 Mi día ----------
const midia = { id: 'midia', title: 'Mi día', icon: '📒',
  render(el, api) {
    const r = regHoy(); const nm = (store.get('config', 'plan10m') || {}).numeros || {};
    const cot = store.list('cotizaciones').filter((q) => (q.sentAt || '').slice(0, 10) === fmt.today()).length;
    const ventas = store.list('cotizaciones').filter((q) => q.approvedAt === fmt.today()).length;
    const cobrado = store.list('abonos').filter((a) => a.date === fmt.today()).reduce((x, a) => x + (Number(a.amount) || 0), 0);
    const mins = store.list('timeLogs').filter((t) => t.date === fmt.today() && (t.kind || 'trabajo') === 'trabajo').reduce((x, t) => x + (Number(t.minutes) || 0), 0);
    const step = (k, l, i) => { const v = Number(r[k]) || 0; const m = Number(nm[k]) || 0; return `<div class="num-card ${m && v >= m ? 'ok' : ''}"><span class="ic">${i}</span><span class="li-main"><b>${l}</b><small class="muted">${m ? 'meta ' + m : ''}</small></span><div class="stp"><button data-k="${k}" data-d="-1" aria-label="Menos">−</button><b class="num">${v}</b><button data-k="${k}" data-d="1" aria-label="Más">＋</button></div></div>`; };
    el.innerHTML = misionesHtml(false) + `<div class="section"><h2>Registro de hoy</h2>
      ${step('contactos', 'Contactos nuevos', '📞')}${step('seguimientos', 'Seguimientos', '🔁')}
      <div class="card auto"><div><b class="num">${cot}</b><small>cotizaciones</small></div><div><b class="num">${ventas}</b><small>ventas</small></div><div><b class="num up">${money(cobrado)}</b><small>cobrado</small></div><div><b class="num">${fmt.hours(mins)}</b><small>trabajadas</small></div></div>
      <p class="muted" style="font-size:12px;margin:4px 0 10px">Cotizaciones, ventas, cobros y horas se llenan solos desde la app.</p>
      <div class="field"><label for="ap">Qué funcionó / qué no (una línea)</label><input id="ap" value="${esc(r.aprendizaje || '')}" placeholder="Las barberías responden más por la tarde"></div></div>`;
    let t = 0;
    el.oninput = (e) => { if (e.target.id !== 'ap') return; clearTimeout(t); const v = e.target.value; t = setTimeout(() => { const x = regHoy(); x.id ? store.update('registroDiario', x.id, { aprendizaje: v }) : store.add('registroDiario', { date: fmt.today(), aprendizaje: v }); }, 600); };
    el.onclick = (e) => {
      if (misionesClick(e, api)) return;
      const b = e.target.closest('[data-k]'); if (b) { bumpReg(b.dataset.k, Number(b.dataset.d)); navigator.vibrate?.(8); }
    };
    el.querySelector('[data-misnew]')?.addEventListener('submit', (e) => { e.preventDefault(); const v = e.target.q.value.trim(); if (!v) return; crearPropia(v); toast('⭐ Misión agregada'); });
  } };

// ---------- 💵 Cobros ----------
const cobros = { id: 'cobros', title: 'Cobros', icon: '💵',
  render(el) {
    const js = trabajosActivos().filter((j) => saldoTrabajo(j) > 0).sort((a, b) => (b.status === 'entregado') - (a.status === 'entregado'));
    const ab = store.list('abonos').filter((a) => (a.date || '').startsWith(fmt.today().slice(0, 7))).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const inv = store.list('invoices').filter((i) => !i.paid);
    el.innerHTML = `<div class="card psum"><div><b class="num">${money(porCobrar())}</b><small>por cobrar</small></div><div><b class="num up">${money(cobradoMes())}</b><small>cobrado este mes</small></div></div>
      <div class="section"><h2>Te deben</h2>${js.map((j) => { const sd = saldoTrabajo(j); return `<div class="card qcard"><div class="row" style="justify-content:space-between"><b>${esc(store.get('clients', j.client)?.name || '')} · ${esc(j.title)}</b><span class="chip ${j.status === 'entregado' ? 's-delete' : ''}">${esc(j.status)}</span></div>
        <div class="bar" style="margin:6px 0"><i style="width:${(j.price - sd) / j.price * 100}%;background:var(--c-create)"></i></div><div class="row" style="justify-content:space-between"><span class="muted num" style="font-size:12.5px">falta <b style="color:var(--fg)">${money(sd)}</b> de ${money(j.price)}</span><button class="btn btn-create sm" data-ab="${j.id}">💵 Registrar pago</button></div></div>`; }).join('') || '<p class="muted">Nadie te debe ✓</p>'}</div>
      ${inv.length ? `<div class="section"><h2>Cobros de antes</h2>${inv.map((i) => `<div class="list-item"><div class="li-main"><div class="li-title">${esc(i.number || 'Cobro')} · ${esc(store.get('clients', i.client)?.name || '')}</div></div><b class="num">${money(i.amount)}</b><button class="btn btn-create sm" data-inv="${i.id}">Pagó</button></div>`).join('')}</div>` : ''}
      <div class="section"><h2>Pagos de este mes</h2>${ab.map((a) => `<div class="list-item"><div class="li-main"><div class="li-title">${esc(store.get('clients', store.get('jobs', a.job)?.client)?.name || '')} · ${esc({ anticipo: 'Anticipo', saldo: 'Saldo', abono: 'Abono' }[a.kind] || 'Abono')}</div><div class="li-sub">${fmt.date(a.date)} · ${esc(store.get('jobs', a.job)?.title || '')}</div></div><b class="num up">${money(a.amount)}</b><button class="btn btn-delete ghost sm" data-del="${a.id}" aria-label="Borrar">✕</button></div>`).join('') || '<p class="muted">Sin pagos este mes.</p>'}</div>`;
    el.onclick = async (e) => {
      const b = e.target.closest('[data-ab]'); if (b) return abonoSheet(b.dataset.ab);
      const i = e.target.closest('[data-inv]'); if (i) { store.update('invoices', i.dataset.inv, { paid: true }); toast('✓ Pagado · entró a Finanzas'); return; }
      const d = e.target.closest('[data-del]'); if (d && await confirmSheet('¿Borrar pago?', 'También se quita de Finanzas.', { yes: 'Borrar', danger: true })) store.remove('abonos', d.dataset.del);
    };
  } };

// ---------- 🛠 Trabajos ----------
const ST = [['aprobado', '✅ Aprobado'], ['en curso', '▶ En curso'], ['entregado', '📦 Entregado'], ['pagado', '💵 Pagado']];
const trabajos = { id: 'trabajos', title: 'Trabajos', icon: '🛠', onAdd: () => openForm(jobMod, null, { status: 'aprobado', anticipo: 50 }),
  render(el) {
    const js = store.list('jobs').filter((j) => j.status !== 'cotizado');
    el.innerHTML = ST.map(([k, l]) => { const L = js.filter((j) => j.status === k).sort((a, b) => (a.due || '9').localeCompare(b.due || '9')); if (!L.length) return ''; return `<div class="section"><h2>${l} · ${L.length}</h2>${L.slice(0, k === 'pagado' ? 6 : 99).map((j) => `<div class="list-item" data-j="${j.id}"><div class="li-main"><div class="li-title">${esc(j.title)}</div><div class="li-sub">${esc(store.get('clients', j.client)?.name || '')}${j.due ? ' · entrega ' + fmt.date(j.due) : ''}</div></div><b class="num">${money(j.price)}</b>${k === 'aprobado' ? `<button class="btn btn-edit ghost sm" data-st="${j.id}|en curso">▶</button>` : k === 'en curso' ? `<button class="btn btn-edit ghost sm" data-st="${j.id}|entregado">📦</button>` : ''}</div>`).join('')}</div>`; }).join('') || '<div class="empty"><b>Sin trabajos</b>Cuando un cliente apruebe una cotización, el trabajo aparece aquí solo.</div>';
    el.onclick = (e) => {
      const b = e.target.closest('[data-st]'); if (b) { e.stopPropagation(); const [id, st] = b.dataset.st.split('|'); store.update('jobs', id, { status: st, ...(st === 'entregado' ? { deliveredAt: fmt.today() } : {}) }); return; }
      const j = e.target.closest('[data-j]'); if (j) { const job = store.get('jobs', j.dataset.j); job.client ? fichaCliente(job.client) : openForm(jobMod, job); }
    };
  } };

// ---------- ⏱ Cronómetro ----------
const crono = { id: 'cronometro', title: 'Cronómetro', icon: '⏱',
  render(el) {
    const t = timer.state(); const js = store.list('jobs').filter((j) => ['aprobado', 'en curso'].includes(j.status));
    const logs = store.list('timeLogs').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 8);
    el.innerHTML = `<div class="card tcard">${t ? `<b>${esc(t.label)}</b><div class="num tbig" id="clk">${clock(timer.elapsed(t))}</div><div class="row">${t.paused ? '<button class="btn btn-pending" data-a="resume">▶ Seguir</button>' : '<button class="btn btn-pending" data-a="pause">⏸ Pausa</button>'}<button class="btn btn-delete" data-a="stop">■ Terminar</button></div>`
      : `<div class="field"><label>¿En qué trabajas?</label><div class="picks">${js.map((j) => `<button class="pick" data-job="${j.id}">🛠 ${esc(j.title)}</button>`).join('')}</div></div><form class="nq" data-libre><input name="q" placeholder="…o algo libre: buscar clientes en la calle" autocomplete="off"><button class="btn btn-create sm">▶</button></form>`}</div>
      <div class="section"><h2>Últimos tiempos</h2>${logs.map((l) => `<div class="list-item"><div class="li-main"><div class="li-title">${esc(l.label || store.get('jobs', l.job)?.title || 'Trabajo')}</div><div class="li-sub">${fmt.date(l.date)}</div></div><b class="num">${fmt.hours(l.minutes)}</b></div>`).join('') || '<p class="muted">Mide tus horas: así sabes cuánto te paga de verdad cada trabajo.</p>'}</div>`;
    const tick = () => { const c = el.querySelector('#clk'); const st = timer.state(); if (!st?.running || !c?.isConnected) return; c.textContent = clock(timer.elapsed(st)); setTimeout(tick, 1000); }; tick();
    el.onclick = (e) => {
      const j = e.target.closest('[data-job]'); if (j) { const job = store.get('jobs', j.dataset.job); timer.start({ label: job.title, kind: 'trabajo', job: job.id, source: job.source }); if (job.status === 'aprobado') store.update('jobs', job.id, { status: 'en curso' }); return; }
      const a = e.target.closest('[data-a]')?.dataset.a; if (a === 'pause') timer.pause(); if (a === 'resume') timer.resume(); if (a === 'stop') { const l = timer.stop(); if (l) toast('Guardado ' + fmt.hours(l.minutes)); }
    };
    el.querySelector('[data-libre]')?.addEventListener('submit', (e) => { e.preventDefault(); const v = e.target.q.value.trim(); if (!v) return; timer.start({ label: v, kind: 'trabajo' }); });
  } };

// ---------- 🔒 Mis datos de cobro (para el PDF y los mensajes; solo en tu cuenta) ----------
const datos = { id: 'datos', title: 'Mis datos de cobro', icon: '🔒',
  render(el) {
    const c = store.get('config', 'cobro') || {};
    const F = [['nombre', 'Tu nombre o nombre comercial'], ['telefono', 'WhatsApp'], ['correo', 'Correo'], ['instagram', 'Instagram'], ['nequi', 'Nequi (número)'], ['daviplata', 'Daviplata (número)'], ['banco', 'Banco'], ['tipoCuenta', 'Tipo de cuenta'], ['cuenta', 'Número de cuenta'], ['titular', 'Titular'], ['cedula', 'Cédula o NIT']];
    el.innerHTML = `<p class="muted" style="margin:0 0 10px;font-size:13px">Salen en el PDF de la cotización y en los recordatorios de pago. Se guardan solo en tu cuenta (no en el código).</p>
      <form class="form" data-f>${F.map(([k, l]) => `<div class="field"><label for="d-${k}">${l}</label><input id="d-${k}" name="${k}" value="${esc(c[k] || '')}"></div>`).join('')}
      <div class="field"><label>Hora mínima (calculadora)</label><input name="minimoHora" type="number" inputmode="numeric" step="1000" value="${minHora()}"></div>
      <div class="row end"><button class="btn btn-create">✓ Guardar</button></div></form>`;
    el.querySelector('[data-f]').addEventListener('submit', (e) => { e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target)); const mh = Number(fd.minimoHora) || 35000; delete fd.minimoHora; store.add('config', { ...c, ...fd, id: 'cobro' }); store.add('config', { ...(store.get('config', 'negocios') || {}), id: 'negocios', minimoHora: mh }); toast('✓ Datos guardados'); });
  } };

boot({ appId: 'negocios', version: VERSION, home, homeLabel: 'Clientes', homeIcon: '💬', homeAdd: (api) => { resetQ(); api.go('cotizar'); },
  modules: [prospectos, cotizar, midia, planes, cobros, trabajos, crono, empresas, datos] });
