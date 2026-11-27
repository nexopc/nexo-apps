// NEXO Negocios · tu trabajo
import { boot, fromSchema, store, fmt, esc, h, openForm, toast, sheet, openHarvey } from '../../core/shell.js';
import { estado, P10_CSS, SEMA } from '../../core/plan10m.js';
import { timer, clock } from '../../core/timer.js';
{ const st = document.createElement('style'); st.textContent = P10_CSS; document.head.appendChild(st); }

const VERSION = '2.1.0';
const STATUS = [['cotizado', 'Cotizado', 's-edit'], ['aprobado', 'Aprobado', 's-pending'], ['en curso', 'En curso', 's-pending'], ['entregado', 'Entregado', 's-create'], ['pagado', 'Pagado', 's-create']];
const STAGES = [['nuevo', 'Nuevo'], ['contactado', 'Contactado'], ['reunión', 'Reunión'], ['propuesta', 'Propuesta'], ['ganado', 'Ganado'], ['perdido', 'Perdido']];
const name = (col, id) => store.get(col, id)?.name || store.get(col, id)?.title || '';
const minutesOf = (jobId) => store.list('timeLogs').filter((t) => t.job === jobId).reduce((a, t) => a + (Number(t.minutes) || 0), 0);
const paidOf = (pred) => store.list('invoices').filter((i) => i.paid && pred(i)).reduce((a, i) => a + (Number(i.amount) || 0), 0);
function hourValue() {
  const mins = store.list('timeLogs').reduce((a, t) => a + (Number(t.minutes) || 0), 0);
  const paid = paidOf(() => true);
  return mins ? Math.round(paid / (mins / 60)) : 0;
}
const copy = async (txt) => { try { await navigator.clipboard.writeText(txt); toast('Copiado: pégalo en WhatsApp'); } catch { toast('No se pudo copiar'); } };

// ---------- Módulos simples ----------
const minHora = () => Number(cfg10().minimoHora) || 35000;
// Valores que salen solos de los datos base: horas reales (cronómetro), costos y precio → ganancia por hora y precio mínimo
function derived(svc) {
  const jobs = store.list('jobs').filter((j) => j.service === svc.id && minutesOf(j.id) > 0);
  const real = jobs.length ? jobs.reduce((a, j) => a + minutesOf(j.id), 0) / jobs.length / 60 : 0;
  const hours = real || Number(svc.hours) || 0;
  const costos = Number(svc.costos) || 0;
  const precio = Number(svc.price) || 0;
  return { real: Math.round(real * 10) / 10, hours, costos, porHora: hours ? Math.round((precio - costos) / hours) : 0, minimo: Math.round(hours * minHora() + costos), medidos: jobs.length };
}
const ESTADO = { activa: ['🟢', 'Activa'], pausada: ['⏸', 'Pausada'], futura: ['📅', 'Empieza'] };
const fuentes = fromSchema('sources', { id: 'fuentes', title: 'Fuentes', icon: '🧭', single: 'fuente de ingreso',
  render(el) {
    const m = fmt.today().slice(0, 7);
    const ss = store.list('sources');
    el.innerHTML = `<p class="muted" style="margin:0 0 12px">Cada empresa o fuente con sus planes. Toca una para ver y editar sus planes.</p>
      <div class="grid">${ss.map((x) => { const v = paidOf((i) => store.get('jobs', i.job)?.source === x.id && (i.date || '').startsWith(m)); const meta = Number(x.metaMes) || 0; const [ic, lb] = ESTADO[x.estado || 'activa'];
        return `<button class="card src" data-src="${x.id}" style="--k:${esc(x.color || 'var(--accent)')}"><div class="row" style="justify-content:space-between"><b>${esc(x.name)}</b><span class="chip">${ic} ${lb}${x.estado === 'futura' && x.inicio ? ' ' + fmt.date(x.inicio) : ''}</span></div>
          <span class="muted" style="font-size:13px">${store.list('services').filter((s) => s.source === x.id).length} planes · ${store.list('combos').filter((c) => c.source === x.id).length} combos</span>
          <div class="bar"><i style="width:${meta ? Math.min(100, (v / meta) * 100) : 0}%;background:var(--k)"></i></div>
          <span class="num" style="font-size:13px">${fmt.money(v)}${meta ? ' de ' + fmt.money(meta) : ''} este mes</span></button>`; }).join('')}</div>
      <button class="btn btn-create ghost" data-a="new" style="width:100%;margin-top:12px">＋ Nueva empresa o fuente de ingreso</button>`;
    el.onclick = (e) => {
      if (e.target.closest('[data-a=new]')) return openForm(fuentes, null, { estado: 'activa' });
      const c = e.target.closest('[data-src]'); if (c) fuenteDetalle(store.get('sources', c.dataset.src));
    };
  } });
function fuenteDetalle(src) {
  const body = h('<div class="form"></div>');
  let un = null;
  sheet(src.name, body, { onClose: () => un?.() });
  const paint = () => {
    const svcs = store.list('services').filter((x) => x.source === src.id).sort((a, b) => (a.name + a.price).localeCompare(b.name + b.price));
    body.innerHTML = `<div class="row"><button class="btn btn-edit ghost sm" data-a="edit">✎ Editar fuente</button><button class="btn btn-create sm" data-a="plan">＋ Plan</button></div>
      ${svcs.map((x) => { const d = derived(x); return `<div class="card plan" data-svc="${x.id}">
        <div class="row" style="justify-content:space-between"><b>${esc(x.name)}${x.plan ? ' · ' + esc(x.plan) : ''}</b><b class="num">${fmt.money(x.price)}${x.mensual ? '/mes' : ''}</b></div>
        <div class="dv num"><span>⏱ ${d.hours ? d.hours + ' h' : '—'}${d.real ? ' <i>(medido en ' + d.medidos + ')</i>' : x.hours ? ' <i>(estimado)</i>' : ''}</span><span>💸 costos ${fmt.money(d.costos)}</span>
        <span class="${d.porHora && d.porHora < minHora() ? 'down' : 'up'}">${d.porHora ? fmt.money(d.porHora) + '/h' : '— /h'}</span><span>mínimo ${d.hours ? fmt.money(d.minimo) : '—'}</span></div></div>`; }).join('') || '<div class="empty"><b>Sin planes</b>Agrega el primero con ＋ Plan.</div>'}
      <p class="muted" style="font-size:12px;margin:0">Gris = sale solo: horas del cronómetro, costos y tu hora mínima (${fmt.money(minHora())}). Tú cambias precio, extras y qué incluye.</p>`;
  };
  paint();
  un = store.subscribe('services', paint);
  body.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'edit') return openForm(fuentes, src);
    if (a === 'plan') return openForm(servicios, null, { source: src.id, anticipo: 50 });
    const p = e.target.closest('[data-svc]'); if (p) openForm(servicios, store.get('services', p.dataset.svc));
  });
}

// ---------- Calculadora: ¿cuánto me cuesta este trabajo? ----------
const calculadora = { id: 'calculadora', title: 'Calculadora', icon: '🧮',
  render(el) {
    const C = calculadora.st || (calculadora.st = { horas: 4, costos: 20000, margen: 30 });
    const paint = () => {
      const base = C.horas * minHora() + C.costos;
      const sug = Math.ceil((base * (1 + C.margen / 100)) / 1000) * 1000;
      el.innerHTML = `<div class="card calc">
        ${[['horas', '⏱ Horas reales', [-1, -0.5, 0.5, 1], (v) => v + ' h'], ['costos', '💸 Costos (datos, transporte, materiales)', [-10000, -5000, 5000, 10000], fmt.money], ['margen', '📈 Ganancia extra', [-10, -5, 5, 10], (v) => v + ' %']].map(([k, l, st, f]) => `
          <div class="crow"><span>${l}</span><div class="row" style="gap:6px;flex-wrap:nowrap">${st.slice(0, 2).map((d) => `<button class="btn btn-cancel sm" data-k="${k}" data-d="${d}">${d > 0 ? '+' : '−'}</button>`).join('')}<b class="num" style="min-width:92px;text-align:center">${f(C[k])}</b>${st.slice(2).map((d) => `<button class="btn btn-create sm" data-k="${k}" data-d="${d}">+</button>`).join('')}</div></div>`).join('')}
        <div class="crow"><span>Tu hora mínima</span><b class="num">${fmt.money(minHora())}</b></div></div>
        <div class="grid k section"><div class="card kpi"><div class="v num">${fmt.money(base)}</div><div class="l">precio mínimo (no cobres menos)</div></div>
        <div class="card kpi"><div class="v num up">${fmt.money(sug)}</div><div class="l">precio sugerido</div></div>
        <div class="card kpi"><div class="v num">${fmt.money(C.horas ? Math.round((sug - C.costos) / C.horas) : 0)}</div><div class="l">ganas por hora</div></div></div>`;
    };
    paint();
    el.onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; const d = Number(b.dataset.d);
      C[k] = Math.max(0, Math.round((C[k] + d) * 10) / 10); navigator.vibrate?.(6); paint(); };
  } };
const servicios = fromSchema('services', { id: 'servicios', title: 'Planes', icon: '🧾', single: 'plan',
  titleOf: (r) => r.name + (r.plan ? ' · ' + r.plan : ''), subOf: (r) => [name('sources', r.source), r.hours ? r.hours + ' h' : ''].filter(Boolean).map(esc).join(' · '),
  sideOf: (r) => { const d = derived(r); return `${fmt.money(r.price)}${d.porHora ? `<div class="${d.porHora < minHora() ? 'down' : 'muted'}" style="font-size:11px">${fmt.money(d.porHora)}/h</div>` : ''}`; } });
const combos = fromSchema('combos', { id: 'combos', title: 'Combos', icon: '🎁', single: 'combo', titleOf: (r) => r.name, subOf: (r) => esc(r.items || ''), sideOf: (r) => fmt.money(r.price) });

// ---------- Clientes con historial ----------
const clientes = fromSchema('clients', { id: 'clientes', title: 'Clientes', icon: '🤝', single: 'cliente',
  titleOf: (r) => r.name,
  subOf: (r) => `${store.list('jobs').filter((j) => j.client === r.id).length} trabajos · ${esc(r.kind || '')}`,
  sideOf: (r) => `<span class="up num">${fmt.money(paidOf((i) => i.client === r.id))}</span>`,
  render(el, api) {
    api.renderList(el, { ...clientes, render: null });
    el.onclick = (e) => {
      const it = e.target.closest('.list-item'); if (!it) return;
      const c = store.get('clients', it.dataset.id);
      const jobs = store.list('jobs').filter((j) => j.client === c.id);
      const invs = store.list('invoices').filter((i) => i.client === c.id);
      const body = h(`<div class="form">
        <div class="grid k"><div class="card kpi"><div class="v num up">${fmt.money(paidOf((i) => i.client === c.id))}</div><div class="l">te ha pagado</div></div>
        <div class="card kpi"><div class="v num">${fmt.money(invs.filter((i) => !i.paid).reduce((a, i) => a + (+i.amount || 0), 0))}</div><div class="l">por cobrar</div></div></div>
        ${c.contact ? `<p style="margin:0">📱 <span class="num" style="user-select:all">${esc(c.contact)}</span></p>` : ''}
        <h3>Historial</h3><div class="list">${[...jobs.map((j) => ({ d: j.due || j.createdAt, t: `🛠 ${j.title}`, s: j.status })), ...invs.map((i) => ({ d: i.date, t: `🧾 Cobro ${i.number || ''} ${fmt.money(i.amount)}`, s: i.paid ? 'pagado' : 'pendiente' }))].sort((a, b) => (b.d || '').localeCompare(a.d || '')).map((x) => `<div class="list-item" style="cursor:default"><div class="li-main"><div class="li-title">${esc(x.t)}</div><div class="li-sub">${fmt.date((x.d || '').slice(0, 10))}</div></div><span class="chip">${esc(x.s)}</span></div>`).join('') || '<p class="muted">Sin historial todavía.</p>'}</div>
        <div class="row end"><button class="btn btn-edit" data-a="edit">✏️ Editar cliente</button><button class="btn btn-create" data-a="job">＋ Trabajo</button></div></div>`);
      const s = sheet(c.name, body);
      body.onclick = (ev) => { const a = ev.target.closest('[data-a]')?.dataset.a; if (a === 'edit') { s.close(); setTimeout(() => openForm(clientes, c), 300); } if (a === 'job') { s.close(); setTimeout(() => openForm(trabajos, null, { client: c.id }), 300); } };
    };
  } });

// ---------- Trabajos (tablero por estado) ----------
const trabajos = fromSchema('jobs', { id: 'trabajos', title: 'Trabajos', icon: '🛠', single: 'trabajo',
  render(el) {
    const jobs = store.list('jobs');
    el.innerHTML = `<div class="board">${STATUS.map(([k, l, c]) => { const js = jobs.filter((j) => (j.status || 'cotizado') === k);
      return `<section class="lane"><header><span class="chip ${c}">${l}</span><span class="muted num">${js.length}</span></header>
      ${js.map((j) => `<div class="jcard" data-id="${j.id}"><b>${esc(j.title)}</b><span class="muted">${esc(name('clients', j.client))}</span>
        <div class="row" style="justify-content:space-between"><span class="num">${fmt.money(j.price)}</span>${j.due ? `<span class="chip ${j.due < fmt.today() && k !== 'pagado' && k !== 'entregado' ? 's-delete' : ''}">📅 ${fmt.date(j.due)}</span>` : ''}</div>
        ${k !== 'pagado' ? `<button class="btn btn-edit ghost sm" data-next="${j.id}">Mover a ${STATUS[STATUS.findIndex((s) => s[0] === k) + 1][1]} →</button>` : ''}</div>`).join('')}</section>`; }).join('')}</div>`;
    el.onclick = (e) => {
      const n = e.target.closest('[data-next]');
      if (n) { const j = store.get('jobs', n.dataset.next); const i = STATUS.findIndex((s) => s[0] === (j.status || 'cotizado'));
        const next = STATUS[i + 1][0];
        store.update('jobs', j.id, { status: next });
        if (next === 'entregado' && !store.list('invoices').some((x) => x.job === j.id)) toast('Entregado ✓ · crea la cuenta de cobro en 🧾 Cobros');
        return; }
      const c = e.target.closest('.jcard'); if (c) openForm(trabajos, store.get('jobs', c.dataset.id));
    };
  } });

// ---------- Cotizador en vivo (planes, extras, precio fundador, combos) ----------
const cfg10 = () => store.get('config', 'plan10m') || {};
let Q = { tab: 'servicios', marca: '', svc: '', plan: '', extras: {}, opc: {}, fundador: false, client: '' };
function todayReg() { return store.list('registroDiario').find((r) => r.date === fmt.today()); }
function bumpReg(k, n = 1) {
  const r = todayReg();
  if (r) store.update('registroDiario', r.id, { [k]: Math.max(0, (Number(r[k]) || 0) + n) });
  else store.add('registroDiario', { date: fmt.today(), [k]: Math.max(0, n) });
}
const fundadorUsados = () => store.list('jobs').filter((j) => j.fundador).length;
function calc(svc) {
  if (!svc) return null;
  const extras = (svc.extras || []).reduce((a, x) => a + (Q.extras[x.name] || 0) * x.price, 0);
  const pct = (svc.opciones || []).reduce((a, o) => a + (Q.opc[o.name] ? o.pct : 0), 0);
  let total = Math.round((svc.price + extras) * (1 + pct / 100));
  const desc = Q.fundador ? Math.round(total * ((cfg10().fundador?.pct || 10) / 100)) : 0;
  total -= desc;
  const anticipo = Math.round(total * ((Number(svc.anticipo) || 0) / 100));
  return { base: svc.price, extras, pct, desc, total, anticipo, saldo: total - anticipo, monthly: Number(svc.monthly) || 0 };
}
function waText(svc, c, client) {
  const ex = (svc.extras || []).filter((x) => Q.extras[x.name]).map((x) => `• ${Q.extras[x.name]} × ${x.name}: ${fmt.money(x.price * Q.extras[x.name])}`);
  const op = (svc.opciones || []).filter((o) => Q.opc[o.name]).map((o) => `• ${o.name} (${o.pct > 0 ? '+' : ''}${o.pct} %)`);
  return [`Hola${client ? ' ' + client.name : ''} 👋 Te comparto la cotización:`, '',
    `*${svc.name} · Plan ${svc.plan}*${svc.mensual ? ' (mensual)' : ''}`, `Incluye: ${svc.desc || ''}`, `Precio: ${fmt.money(svc.price)}`,
    ...ex, ...op, c.desc ? `• Precio fundador: −${fmt.money(c.desc)}` : '', '',
    `*Total: ${fmt.money(c.total)}*${svc.mensual ? ' al mes' : ''}`,
    c.anticipo ? `Anticipo (${svc.anticipo} %): ${fmt.money(c.anticipo)} · Saldo al entregar: ${fmt.money(c.saldo)}` : 'Pagas al entregar.',
    c.monthly ? `Mensualidad después: ${fmt.money(c.monthly)}` : '', svc.noIncluye ? `No incluye: ${svc.noIncluye}` : '', '', '— Cristóbal'].filter((l) => l !== '').join('\n');
}
const cotizador = { id: 'cotizador', title: 'Cotizador', icon: '🧮',
  render(el) {
    const sources = store.list('sources');
    const svcs = store.list('services');
    if (!svcs.length) { el.innerHTML = '<div class="empty"><b>Sin servicios todavía</b>Entra con Google: tus servicios y combos del Plan $10M se cargan solos. También puedes crearlos en 🧾 Servicios.</div>'; return; }
    const tabs = `<div class="tabs"><button data-tab="servicios" aria-pressed="${Q.tab === 'servicios'}">🧾 Servicios</button><button data-tab="combos" aria-pressed="${Q.tab === 'combos'}">🎁 Combos</button></div>`;
    if (Q.tab === 'combos') { el.innerHTML = tabs + combosView(); return bind(el); }
    const marcas = sources.filter((s) => svcs.some((v) => v.source === s.id));
    if (!Q.marca || !marcas.some((m) => m.id === Q.marca)) Q.marca = marcas[0]?.id || '';
    const names = [...new Set(svcs.filter((v) => !Q.marca || v.source === Q.marca).map((v) => v.name))];
    if (!names.includes(Q.svc)) { Q.svc = names[0] || ''; Q.plan = ''; Q.extras = {}; Q.opc = {}; }
    const plans = svcs.filter((v) => v.name === Q.svc && (!Q.marca || v.source === Q.marca)).sort((a, b) => a.price - b.price);
    if (!plans.some((p) => p.id === Q.plan)) Q.plan = (plans.find((p) => p.plan === 'Premium') || plans[plans.length - 1] || {}).id;
    const svc = plans.find((p) => p.id === Q.plan);
    const cheap = plans[0];
    const minH = cfg10().minimoHora || 35000;
    const c = calc(svc);
    const cup = (cfg10().fundador?.cupos || 3) - fundadorUsados();
    el.innerHTML = tabs + `
      <div class="chips-row">${marcas.map((m) => `<button class="pill ${m.id === Q.marca ? 'on' : ''}" data-marca="${m.id}" style="--pc:${esc(m.color || 'var(--accent)')}">${esc(m.name)}</button>`).join('')}</div>
      <div class="chips-row">${names.map((n) => `<button class="pill sm ${n === Q.svc ? 'on' : ''}" data-svc="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <div class="plans">${plans.map((p) => {
        const rinde = cheap && p !== cheap && cheap.hours && p.hours ? Math.round(((p.hours / p.price) / (cheap.hours / cheap.price) - 1) * 100) : 0;
        const ph = p.hours ? Math.round(p.price / p.hours) : 0;
        return `<button class="plan ${p.id === Q.plan ? 'on' : ''} ${p.plan === 'Premium' ? 'rec' : ''}" data-plan="${p.id}">
          ${p.plan === 'Premium' ? '<span class="rec-tag">★ Recomendado</span>' : ''}
          <b>${esc(p.plan || 'Único')}</b><span class="pp num">${fmt.money(p.price)}${p.mensual ? '<small>/mes</small>' : ''}</span>
          ${p.monthly ? `<span class="muted num" style="font-size:12px">+ ${fmt.money(p.monthly)}/mes</span>` : ''}
          ${rinde > 0 ? `<span class="rinde">Tu plata rinde ${rinde} % más</span>` : ''}
          <span class="num ${ph && ph < minH ? 'down' : 'muted'}" style="font-size:12px">${p.hours || '?'} h · ${ph ? fmt.money(ph) + '/h' : ''}</span></button>`;
      }).join('')}</div>
      ${svc ? `<div class="quote">
        <div class="card"><h3>Qué incluye</h3><p style="margin:0">${esc(svc.desc || '')}</p>${svc.noIncluye ? `<p class="muted" style="margin:8px 0 0;font-size:13px">No incluye: ${esc(svc.noIncluye)}</p>` : ''}
          ${(svc.extras || []).length ? `<h3 style="margin-top:14px">Extras</h3><div class="list">${svc.extras.map((x) => `<div class="list-item q-it" style="cursor:default"><div class="li-main"><div class="li-title">${esc(x.name)}</div><div class="li-sub num">${fmt.money(x.price)}</div></div><div class="stepper"><button data-ex="${esc(x.name)}" data-d="-1" aria-label="Quitar">−</button><span class="num">${Q.extras[x.name] || 0}</span><button data-ex="${esc(x.name)}" data-d="1" aria-label="Agregar">＋</button></div></div>`).join('')}</div>` : ''}
          ${(svc.opciones || []).length ? `<h3 style="margin-top:14px">Opciones</h3><div class="row">${svc.opciones.map((o) => `<button class="pill sm ${Q.opc[o.name] ? 'on' : ''}" data-opc="${esc(o.name)}">${esc(o.name)} ${o.pct > 0 ? '+' : ''}${o.pct} %</button>`).join('')}</div>` : ''}</div>
        <aside class="card qsum">
          <label class="row" style="gap:10px"><input type="checkbox" id="qf" ${Q.fundador ? 'checked' : ''} ${cup <= 0 && !Q.fundador ? 'disabled' : ''} style="width:22px;height:22px"> Precio fundador −${cfg10().fundador?.pct || 10} % <span class="chip ${cup > 0 ? 's-create' : 's-delete'}">${Math.max(0, cup)} cupos</span></label>
          <div class="field"><label for="qc">Cliente</label><select id="qc"><option value="">—</option>${store.list('clients').map((cl) => `<option value="${cl.id}" ${cl.id === Q.client ? 'selected' : ''}>${esc(cl.name)}</option>`).join('')}</select></div>
          <div class="sumrow"><span>Precio</span><b class="num">${fmt.money(c.base)}</b></div>
          ${c.extras ? `<div class="sumrow"><span>Extras</span><b class="num">${fmt.money(c.extras)}</b></div>` : ''}
          ${c.pct ? `<div class="sumrow"><span>Opciones</span><b class="num">${c.pct > 0 ? '+' : ''}${c.pct} %</b></div>` : ''}
          ${c.desc ? `<div class="sumrow"><span>Fundador</span><b class="num up">−${fmt.money(c.desc)}</b></div>` : ''}
          <div class="tot num">${fmt.money(c.total)}${svc.mensual ? '<small>/mes</small>' : ''}</div>
          <div class="sumrow"><span>Anticipo (${esc(svc.anticipoTxt || (svc.anticipo || 0) + ' %')})</span><b class="num">${fmt.money(c.anticipo)}</b></div>
          <div class="sumrow"><span>Saldo</span><b class="num">${fmt.money(c.saldo)}</b></div>
          ${c.monthly ? `<div class="sumrow"><span>Mensualidad</span><b class="num">${fmt.money(c.monthly)}</b></div>` : ''}
          <div class="row"><button class="btn btn-edit" data-a="wa">📋 Copiar para WhatsApp</button><button class="btn btn-create" data-a="save">＋ Guardar como trabajo</button></div>
        </aside></div>` : ''}`;
    bind(el);
  } };
function combosView() {
  const cfg = cfg10(); const today = fmt.today();
  const sem = (cfg.combosSemana || []).find((c) => today >= c.desde && today <= c.hasta);
  const inSem = (n) => sem && (sem.nexopc === n || sem.agencia === n);
  const cupos = (n) => 3 - store.list('jobs').filter((j) => j.combo === n && j.createdAt >= (sem?.desde || '')).length;
  return `${sem ? `<div class="card" style="border-color:var(--accent)"><b>🔥 Combos de la semana</b> <span class="muted">(${fmt.date(sem.desde)} – ${fmt.date(sem.hasta)})</span><div class="muted">${esc(sem.nexopc)} · ${esc(sem.agencia)} — 3 cupos cada uno</div></div>` : ''}
    <div class="grid section">${store.list('combos').map((cb) => { const ah = cb.separate ? Math.round((1 - cb.price / cb.separate) * 100) : 0; const src = store.get('sources', cb.source);
      return `<div class="card combo ${inSem(cb.name) ? 'hot' : ''}"><div class="row" style="justify-content:space-between"><span class="chip" style="color:${esc(src?.color || 'var(--accent)')}">${esc(src?.name || '')}</span>${inSem(cb.name) ? `<span class="chip s-pending">${Math.max(0, cupos(cb.name))} cupos</span>` : ''}</div>
        <b style="font:700 17px var(--display)">${esc(cb.name)}</b><span class="muted" style="font-size:13px">${esc(cb.para || '')} · ${esc(cb.items || '')}</span>
        <div class="row" style="align-items:baseline">${cb.separate ? `<s class="muted num">${fmt.money(cb.separate)}</s>` : ''}<b class="num" style="font-size:22px">${fmt.money(cb.price)}</b>${ah ? `<span class="chip s-create">−${ah} %</span>` : ''}</div>
        <div class="row"><button class="btn btn-edit ghost sm" data-cwa="${cb.id}">📋 WhatsApp</button><button class="btn btn-create ghost sm" data-csave="${cb.id}">＋ Trabajo</button></div></div>`; }).join('') || '<div class="empty"><b>Sin combos</b>Créalos en 🎁 Combos.</div>'}</div>`;
}
async function copyTxt(t) { try { await navigator.clipboard.writeText(t); toast('Copiado: pégalo en WhatsApp'); } catch { toast('No se pudo copiar'); } }
function bind(el) {
  el.onclick = (e) => {
    const g = (sel) => e.target.closest(sel);
    if (g('[data-tab]')) { Q.tab = g('[data-tab]').dataset.tab; return cotizador.render(el); }
    if (g('[data-marca]')) { Q.marca = g('[data-marca]').dataset.marca; Q.svc = ''; return cotizador.render(el); }
    if (g('[data-svc]')) { Q.svc = g('[data-svc]').dataset.svc; Q.plan = ''; Q.extras = {}; Q.opc = {}; return cotizador.render(el); }
    if (g('[data-plan]')) { Q.plan = g('[data-plan]').dataset.plan; return cotizador.render(el); }
    if (g('[data-ex]')) { const b = g('[data-ex]'); Q.extras[b.dataset.ex] = Math.max(0, (Q.extras[b.dataset.ex] || 0) + Number(b.dataset.d)); navigator.vibrate?.(8); return cotizador.render(el); }
    if (g('[data-opc]')) { const n = g('[data-opc]').dataset.opc; Q.opc[n] = !Q.opc[n]; return cotizador.render(el); }
    const svc = store.get('services', Q.plan); const client = store.get('clients', Q.client);
    if (g('[data-a=wa]') && svc) { copyTxt(waText(svc, calc(svc), client)); bumpReg('cotizaciones'); return; }
    if (g('[data-a=save]') && svc) {
      const c = calc(svc);
      store.add('jobs', { title: `${svc.name} · ${svc.plan}`, client: Q.client, source: svc.source, service: svc.id, price: c.total, status: 'cotizado', fundador: Q.fundador, anticipo: c.anticipo });
      bumpReg('cotizaciones'); toast('Trabajo cotizado creado · +1 cotización hoy'); Q.fundador = false; return;
    }
    const cw = g('[data-cwa]'); if (cw) { const cb = store.get('combos', cw.dataset.cwa); copyTxt(`Hola 👋 Te comparto el *${cb.name}*:\n${cb.items}\n${cb.separate ? 'Por separado: ' + fmt.money(cb.separate) + '\n' : ''}*Precio combo: ${fmt.money(cb.price)}*\n\n— Cristóbal`); bumpReg('cotizaciones'); return; }
    const cs = g('[data-csave]'); if (cs) { const cb = store.get('combos', cs.dataset.csave); store.add('jobs', { title: cb.name, source: cb.source, price: cb.price, status: 'cotizado', combo: cb.name }); bumpReg('cotizaciones'); toast('Trabajo cotizado creado'); }
  };
  el.onchange = (e) => {
    if (e.target.id === 'qf') { Q.fundador = e.target.checked; cotizador.render(el); }
    if (e.target.id === 'qc') Q.client = e.target.value;
  };
}

// ---------- Registro diario (números del día) ----------
const NUMS = [['contactos', 'Contactos nuevos', '📞'], ['seguimientos', 'Seguimientos', '🔁'], ['cotizaciones', 'Cotizaciones', '🧮'], ['videos', 'Videos publicados', '🎬'], ['horasProd', 'Horas de producción', '⏱'], ['ventas', 'Ventas', '✅']];
const registro = fromSchema('registroDiario', { id: 'registro', title: 'Registro diario', icon: '📒', single: 'registro del día',
  preset: () => ({ date: fmt.today() }),
  render(el) {
    const meta = cfg10().numeros || { contactos: 8, seguimientos: 5, cotizaciones: 2, videos: 1, horasProd: 4 };
    const r = todayReg() || {};
    const hist = store.list('registroDiario').filter((x) => x.date !== fmt.today()).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 14);
    el.innerHTML = `<p class="muted" style="margin:0 0 10px">Se llena cada noche (8:00 p. m.). Toca ＋ a medida que avanzas en el día.</p>
      <div class="nums">${NUMS.map(([k, l, i]) => { const v = Number(r[k]) || 0; const m = meta[k]; const ok = m ? v >= m : v > 0;
        return `<div class="num-card ${ok ? 'ok' : ''}"><span class="ic">${i}</span><div class="li-main"><b>${l}</b><span class="muted num">${m ? 'meta ' + m : 'meta 1 cada 1,3 días'}</span></div>
          <div class="stepper"><button data-k="${k}" data-d="${k === 'horasProd' ? -0.5 : -1}" aria-label="Menos">−</button><span class="num">${v}</span><button data-k="${k}" data-d="${k === 'horasProd' ? 0.5 : 1}" aria-label="Más">＋</button></div></div>`; }).join('')}</div>
      <div class="row section"><button class="btn btn-create" data-a="cobro">💵 Plata cobrada hoy: ${fmt.money(r.cobrado || 0)}</button><button class="btn btn-edit ghost" data-a="notas">✍️ Qué funcionó y lo #1 de mañana</button></div>
      <div class="section"><h2>Días anteriores</h2><div class="list">${hist.map((x) => { const hit = NUMS.filter(([k]) => meta[k] && (Number(x[k]) || 0) >= meta[k]).length; const tot = NUMS.filter(([k]) => meta[k]).length;
        return `<div class="list-item" data-id="${x.id}"><span class="chip ${hit === tot ? 's-create' : hit >= tot / 2 ? 's-pending' : 's-delete'}">${hit}/${tot}</span><div class="li-main"><div class="li-title">${fmt.date(x.date)}</div><div class="li-sub">${x.contactos || 0} contactos · ${x.cotizaciones || 0} cotizaciones · ${x.ventas || 0} ventas${x.top1 ? ' · #1: ' + esc(x.top1) : ''}</div></div><div class="li-side up">${x.cobrado ? fmt.money(x.cobrado) : ''}</div></div>`; }).join('') || '<p class="muted">Todavía no hay días anteriores.</p>'}</div></div>`;
    el.onclick = (e) => {
      const b = e.target.closest('[data-k]'); if (b) { bumpReg(b.dataset.k, Number(b.dataset.d)); navigator.vibrate?.(8); return; }
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'cobro' || a === 'notas') { const cur = todayReg() || store.add('registroDiario', { date: fmt.today() }); return openForm(registro, store.get('registroDiario', cur.id)); }
      const it = e.target.closest('.list-item'); if (it) openForm(registro, store.get('registroDiario', it.dataset.id));
    };
  } });

// ---------- Cronómetro (el mismo en todas las apps) y valor real de tu hora ----------
const cronometro = { id: 'cronometro', title: 'Cronómetro', icon: '⏱',
  render(el) {
    const t = timer.state();
    const jobs = store.list('jobs').filter((j) => j.status !== 'pagado');
    const rows = store.list('jobs').map((j) => { const m = minutesOf(j.id); const paid = paidOf((i) => i.job === j.id) || (j.status === 'pagado' ? +j.price || 0 : 0); return { j, m, v: m ? Math.round((paid || +j.price || 0) / (m / 60)) : 0 }; }).filter((r) => r.m);
    const logs = store.list('timeLogs').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6);
    el.innerHTML = `<div class="card timer">${t ? `<div style="flex:1;min-width:0"><b>${esc(t.label)}</b><div class="muted" style="font-size:13px">${t.paused ? 'En pausa' : 'Corriendo'} · se ve arriba en todas tus apps</div></div>
        <div class="tclock num" id="clk">${clock(timer.elapsed(t))}</div>
        <div class="row">${t.paused ? '<button class="btn btn-pending" data-a="resume">▶ Seguir</button>' : '<button class="btn btn-pending" data-a="pause">⏸</button>'}<button class="btn btn-delete" data-a="stop">■ Terminar</button></div>`
      : `<div style="min-width:0;flex:1"><div class="field"><label for="tj">¿En qué trabajas?</label><select id="tj"><option value="">— Otra cosa (escribe abajo) —</option>${jobs.map((j) => `<option value="${j.id}">${esc(j.title)}</option>`).join('')}</select></div>
        <input id="tl" placeholder="Ej: buscar clientes en la calle" style="width:100%;min-height:42px;padding:8px 12px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--fg)"></div>
        <button class="btn btn-create" data-a="go">▶ Empezar</button>`}</div>
      <div class="grid k section"><div class="card kpi"><div class="v num">${fmt.money(hourValue())}</div><div class="l">valor real de tu hora (cobrado ÷ horas)</div></div>
        <div class="card kpi"><div class="v num">${fmt.hours(store.list('timeLogs').filter((x) => (x.kind || 'trabajo') === 'trabajo').reduce((a, x) => a + (+x.minutes || 0), 0))}</div><div class="l">horas de trabajo registradas</div></div></div>
      <div class="section"><h2>Últimos tiempos</h2><div class="list">${logs.map((x) => `<div class="list-item" style="cursor:default"><div class="li-main"><div class="li-title">${esc(x.label || name('jobs', x.job) || 'Trabajo')}</div><div class="li-sub">${fmt.date(x.date)}${x.job ? ' · ' + esc(name('jobs', x.job)) : ''}</div></div><div class="li-side num">${fmt.hours(x.minutes)}</div></div>`).join('') || '<div class="empty"><b>Sin tiempos todavía</b>Usa el cronómetro al trabajar: descubrirás qué servicio te paga mejor la hora.</div>'}</div></div>
      <div class="section"><h2>Por trabajo</h2><div class="list">${rows.sort((a, b) => a.v - b.v).map((r) => `<div class="list-item" style="cursor:default"><div class="li-main"><div class="li-title">${esc(r.j.title)}</div><div class="li-sub">${fmt.hours(r.m)} · ${fmt.money(r.j.price)}</div></div><div class="li-side ${r.v < minHora() ? 'down' : 'up'}">${fmt.money(r.v)}/h</div></div>`).join('') || '<p class="muted">Cuando midas trabajos aquí verás cuánto te paga cada hora.</p>'}</div></div>`;
    const tick = () => { const c = el.querySelector('#clk'); const st = timer.state(); if (!st?.running || !c?.isConnected) return; c.textContent = clock(timer.elapsed(st)); setTimeout(tick, 1000); };
    tick();
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'go') { const jid = el.querySelector('#tj').value; const j = store.get('jobs', jid); timer.start({ label: j?.title || el.querySelector('#tl').value.trim() || 'Trabajo', kind: 'trabajo', job: jid, source: j?.source || '' }); toast('▶ En marcha: lo ves arriba en todas las apps'); }
      if (a === 'pause') timer.pause();
      if (a === 'resume') timer.resume();
      if (a === 'stop') { const l = timer.stop(); if (l) toast(`Guardado ${fmt.hours(l.minutes)}`); }
    };
  } };

// ---------- Cobros y cuentas de cobro ----------
const cobros = fromSchema('invoices', { id: 'cobros', title: 'Cobros', icon: '🧾', single: 'cuenta de cobro', checkField: 'paid',
  preset: () => ({ number: 'CC-' + String(store.list('invoices').length + 1).padStart(3, '0') }),
  sort: (a, b) => (a.paid - b.paid) || (a.due || '9').localeCompare(b.due || '9'),
  titleOf: (r) => `${r.number || 'Cobro'} · ${name('clients', r.client) || 'sin cliente'}`,
  subOf: (r) => `${esc(name('jobs', r.job))}${r.due ? ` · vence ${fmt.date(r.due)}` : ''}${r.paid ? ' · ✅ entró a Finanzas' : ''}`,
  sideOf: (r) => `<span class="num ${r.paid ? 'up' : r.due && r.due < fmt.today() ? 'down' : ''}">${fmt.money(r.amount)}</span>`,
  render(el, api) {
    const pend = store.list('invoices').filter((i) => !i.paid);
    el.innerHTML = `<div class="grid k" style="margin-bottom:12px"><div class="card kpi"><div class="v num">${fmt.money(pend.reduce((a, i) => a + (+i.amount || 0), 0))}</div><div class="l">por cobrar (${pend.length})</div></div>
      <div class="card kpi"><div class="v num up">${fmt.money(paidOf((i) => (i.date || '').startsWith(fmt.today().slice(0, 7))))}</div><div class="l">cobrado este mes</div></div></div>
      <p class="muted" style="font-size:13px;margin:0 0 10px">Marca ✓ cuando te paguen: el ingreso se crea solo en NEXO Finanzas.</p><div id="il"></div>`;
    api.renderList(el.querySelector('#il'), { ...cobros, render: null });
    el.querySelector('#il').addEventListener('contextmenu', (e) => { const it = e.target.closest('.list-item'); if (!it) return; e.preventDefault(); copyInvoice(store.get('invoices', it.dataset.id)); });
  },
  headerExtra: () => '<span class="muted" style="font-size:12px">Mantén presionado un cobro para copiar el texto</span>' });
function copyInvoice(i) {
  const c = store.get('clients', i.client); const j = store.get('jobs', i.job);
  copy(`CUENTA DE COBRO ${i.number || ''}\nFecha: ${i.date}\nCliente: ${c?.name || ''}\nConcepto: ${j?.title || ''}\nValor: ${fmt.money(i.amount)}\n${i.due ? 'Vence: ' + i.due + '\n' : ''}\nCristóbal — NEXO`);
}

// ---------- Prospectos ----------
let stage = 'activos';
const prospectos = fromSchema('prospects', { id: 'prospectos', title: 'Prospectos', icon: '🎯', single: 'prospecto',
  filter: (r) => (stage === 'activos' ? !['ganado', 'perdido'].includes(r.stage) : r.stage === stage),
  sort: (a, b) => (a.nextDate || '9').localeCompare(b.nextDate || '9'),
  titleOf: (r) => r.name, subOf: (r) => `${esc(r.next || '')}${r.nextDate ? ' · ' + fmt.date(r.nextDate) : ''}`,
  sideOf: (r) => `<span class="chip ${r.stage === 'ganado' ? 's-create' : r.stage === 'perdido' ? 's-delete' : r.nextDate && r.nextDate <= fmt.today() ? 's-pending' : ''}">${esc(STAGES.find((s) => s[0] === r.stage)?.[1] || 'Nuevo')}</span>`,
  render(el, api) {
    const all = store.list('prospects');
    el.innerHTML = `<div class="funnel">${STAGES.slice(0, 5).map(([k, l]) => `<div><b class="num">${all.filter((p) => (p.stage || 'nuevo') === k).length}</b><span>${l}</span></div>`).join('')}</div>
      <div class="tabs">${[['activos', 'Activos'], ['ganado', 'Ganados'], ['perdido', 'Perdidos']].map(([k, l]) => `<button data-t="${k}" aria-pressed="${stage === k}">${l}</button>`).join('')}</div><div id="pl"></div>
      <div class="row section"><button class="btn btn-ai" data-a="h">🟣 Harvey: mensaje para conseguir clientes</button></div>`;
    api.renderList(el.querySelector('#pl'), { ...prospectos, render: null });
    el.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { stage = b.dataset.t; api.paint(); } };
    el.querySelector('[data-a=h]').onclick = () => openHarvey('Harvey: con mis prospectos activos y mi portafolio, escríbeme un mensaje corto de WhatsApp para el prospecto más caliente y dime qué ofrecerle.');
  } });

// ---------- Panel ----------
function home(el) {
  const m = fmt.today().slice(0, 7);
  const cobrado = paidOf((i) => (i.date || '').startsWith(m));
  const porCobrar = store.list('invoices').filter((i) => !i.paid).reduce((a, i) => a + (+i.amount || 0), 0);
  const activos = store.list('jobs').filter((j) => !['pagado'].includes(j.status || 'cotizado'));
  const soon = activos.filter((j) => j.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 4);
  const follow = store.list('prospects').filter((p) => p.nextDate && p.nextDate <= fmt.today() && !['ganado', 'perdido'].includes(p.stage));
  const bySource = store.list('sources').map((s) => ({ s, v: paidOf((i) => store.get('jobs', i.job)?.source === s.id && (i.date || '').startsWith(m)) }));
  const maxS = Math.max(1, ...bySource.map((x) => x.v));
  const e10 = estado(); const reg = store.list('registroDiario').find((r) => r.date === fmt.today()) || {}; const nm = (store.get('config', 'plan10m') || {}).numeros || {};
  el.innerHTML = `<div class="page-title"><h1>Tus números</h1><button class="btn btn-create sm" data-go="cotizador">🧮 Cotizar</button></div>
    ${e10 ? `<div class="card p10" style="margin-bottom:12px"><div class="sema" style="--sc:${SEMA[e10.color]}"><span class="luz"></span><div><b>${fmt.money(e10.acc)}</b> de ${fmt.money(e10.p.meta)} · ${esc(e10.msg)}</div></div>
      <div class="row" style="gap:14px;font-size:14px">${[['contactos', '📞'], ['seguimientos', '🔁'], ['cotizaciones', '🧮'], ['videos', '🎬']].map(([k, i]) => `<span class="num ${(Number(reg[k]) || 0) >= (nm[k] || 1) ? 'up' : ''}">${i} ${reg[k] || 0}/${nm[k] || '-'}</span>`).join('')}
      <button class="btn btn-edit ghost sm" data-go="registro">📒 Registro de hoy</button></div>
      ${e10.combo ? `<div class="muted" style="font-size:13px">🔥 Combos de la semana: <b style="color:var(--fg)">${esc(e10.combo.nexopc)}</b> y <b style="color:var(--fg)">${esc(e10.combo.agencia)}</b></div>` : ''}</div>` : ''}
    <div class="grid k"><div class="card kpi"><div class="v num up">${fmt.money(cobrado)}</div><div class="l">cobrado este mes</div></div>
      <div class="card kpi"><div class="v num">${fmt.money(porCobrar)}</div><div class="l">por cobrar</div></div>
      <div class="card kpi"><div class="v num">${activos.length}</div><div class="l">trabajos activos</div></div>
      <div class="card kpi"><div class="v num">${fmt.money(hourValue())}</div><div class="l">valor de tu hora</div></div></div>
    <div class="grid section">
      <div class="card"><h3>📦 Entregas próximas</h3>${soon.map((j) => `<div class="row" style="justify-content:space-between;padding:4px 0"><span>${esc(j.title)}</span><span class="chip ${j.due < fmt.today() ? 's-delete' : ''}">${fmt.date(j.due)}</span></div>`).join('') || '<p class="muted" style="margin:0">Nada pendiente</p>'}</div>
      <div class="card"><h3>🎯 Hacer seguimiento hoy</h3>${follow.map((p) => `<div style="padding:4px 0"><b>${esc(p.name)}</b> <span class="muted">· ${esc(p.next || '')}</span></div>`).join('') || '<p class="muted" style="margin:0">Sin seguimientos para hoy</p>'}</div>
      <div class="card"><h3>💼 Ingresos por fuente (mes)</h3>${bySource.map((x) => `<div class="hbar"><span>${esc(x.s.name)}</span><div class="bar"><i style="width:${(x.v / maxS) * 100}%;background:${esc(x.s.color || 'var(--accent)')}"></i></div><span class="num">${fmt.money(x.v)}</span></div>`).join('') || '<p class="muted" style="margin:0">Crea tus fuentes en 🧭 Fuentes</p>'}</div>
    </div>`;
  el.onclick = (e) => { const g = e.target.closest('[data-go]'); if (g) document.querySelector(`[data-nav="${g.dataset.go}"]`)?.click(); };
}

const QUICK = [
  { label: 'Cotizar', icon: '🧮', color: '#E5175F', run: (api) => api.go('cotizador') },
  { label: 'Cobrar', icon: '💵', color: '#FF7A00', run: (api) => api.go('cobros') },
  { label: 'Nuevo cliente', icon: '🤝', color: '#A06CFF', run: () => openForm(clientes) },
  { label: 'Registro', icon: '📒', color: '#00C2B2', run: (api) => api.go('registro') },
];
boot({ appId: 'negocios', version: VERSION, home, quick: QUICK, modules: [cotizador, fuentes, registro, trabajos, clientes, cobros, cronometro, calculadora, prospectos, servicios, combos] });
