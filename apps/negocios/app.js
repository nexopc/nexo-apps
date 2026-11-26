// NEXO Negocios · tu trabajo
import { boot, fromSchema, store, fmt, esc, h, openForm, toast, sheet, openHarvey } from '../../core/shell.js';

const VERSION = '1.0.1';
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
const fuentes = fromSchema('sources', { id: 'fuentes', title: 'Fuentes', icon: '🧭', single: 'fuente de ingreso',
  titleOf: (r) => r.name, subOf: (r) => `${store.list('services').filter((s) => s.source === r.id).length} servicios`,
  sideOf: (r) => `<span class="up num">${fmt.money(paidOf((i) => store.get('jobs', i.job)?.source === r.id))}</span>` });
const servicios = fromSchema('services', { id: 'servicios', title: 'Servicios', icon: '🧾', single: 'servicio',
  titleOf: (r) => r.name, subOf: (r) => [name('sources', r.source), r.hours ? r.hours + ' h' : ''].filter(Boolean).map(esc).join(' · '),
  sideOf: (r) => `${fmt.money(r.price)}${r.hours ? `<div class="muted" style="font-size:11px">${fmt.money(r.price / r.hours)}/h</div>` : ''}` });
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

// ---------- Cotizador en vivo ----------
let quote = {};
const cotizador = { id: 'cotizador', title: 'Cotizador', icon: '🧮',
  render(el) {
    const svcs = store.list('services'); const cbs = store.list('combos');
    const items = [...cbs.map((c) => ({ id: 'c:' + c.id, name: '🎁 ' + c.name, price: +c.price || 0 })), ...svcs.map((s) => ({ id: 's:' + s.id, name: s.name, price: +s.price || 0, hours: +s.hours || 0 }))];
    if (!items.length) { el.innerHTML = '<div class="empty"><b>Primero crea tus servicios</b>Ve a 🧾 Servicios y agrega lo que vendes con su precio. Aquí los combinas y cotizas en segundos.</div>'; return; }
    const calc = () => {
      const sub = items.reduce((a, it) => a + (quote[it.id] || 0) * it.price, 0);
      const disc = Number(el.querySelector('#disc')?.value || 0);
      const total = Math.round(sub * (1 - disc / 100));
      const hrs = items.reduce((a, it) => a + (quote[it.id] || 0) * (it.hours || 0), 0);
      el.querySelector('#sub').textContent = fmt.money(sub);
      el.querySelector('#tot').textContent = fmt.money(total);
      el.querySelector('#hrs').textContent = hrs ? `${hrs} h estimadas · ${fmt.money(total / hrs)}/h` : '';
      return { sub, disc, total };
    };
    el.innerHTML = `<div class="quote"><div class="list">${items.map((it) => `<div class="list-item q-it" style="cursor:default"><div class="li-main"><div class="li-title">${esc(it.name)}</div><div class="li-sub num">${fmt.money(it.price)}</div></div>
        <div class="stepper"><button data-d="-1" data-i="${it.id}" aria-label="Quitar">−</button><span class="num" id="q-${it.id.replace(':', '_')}">${quote[it.id] || 0}</span><button data-d="1" data-i="${it.id}" aria-label="Agregar">＋</button></div></div>`).join('')}</div>
      <aside class="card qsum"><div class="row" style="justify-content:space-between"><span class="muted">Subtotal</span><b class="num" id="sub"></b></div>
        <div class="field"><label for="disc">Descuento %</label><input id="disc" type="number" min="0" max="100" value="0"></div>
        <div class="field"><label for="qc">Cliente</label><select id="qc"><option value="">—</option>${store.list('clients').map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
        <div class="tot num" id="tot"></div><div class="muted num" id="hrs" style="font-size:13px"></div>
        <div class="row"><button class="btn btn-create" data-a="save">＋ Guardar como trabajo</button><button class="btn btn-edit ghost" data-a="copy">📋 Copiar para WhatsApp</button><button class="btn btn-cancel ghost sm" data-a="reset">Limpiar</button></div></aside></div>`;
    calc();
    el.oninput = calc;
    el.onclick = (e) => {
      const b = e.target.closest('[data-d]');
      if (b) { quote[b.dataset.i] = Math.max(0, (quote[b.dataset.i] || 0) + Number(b.dataset.d)); el.querySelector('#q-' + b.dataset.i.replace(':', '_')).textContent = quote[b.dataset.i]; calc(); navigator.vibrate?.(8); return; }
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      const { total, disc } = calc();
      const lines = items.filter((it) => quote[it.id]).map((it) => `• ${quote[it.id]} × ${it.name.replace('🎁 ', '')} — ${fmt.money(it.price * quote[it.id])}`);
      if (a === 'reset') { quote = {}; this.render(el); return; }
      if (!lines.length) return toast('Agrega al menos un servicio');
      const client = store.get('clients', el.querySelector('#qc').value);
      if (a === 'copy') copy(`Hola${client ? ' ' + client.name : ''} 👋 Esta es tu cotización:\n${lines.join('\n')}${disc ? `\nDescuento: ${disc}%` : ''}\n*Total: ${fmt.money(total)}*\n\nQuedo atento. — Cristóbal`);
      if (a === 'save') { store.add('jobs', { title: lines.map((l) => l.split(' — ')[0].replace('• ', '')).join(', ').slice(0, 80), client: client?.id || '', price: total, status: 'cotizado' }); quote = {}; toast('Trabajo cotizado creado'); }
    };
  } };

// ---------- Cronómetro y valor real de tu hora ----------
let run = JSON.parse(localStorage.getItem('nexo:neg:timer') || 'null');
const cronometro = { id: 'cronometro', title: 'Cronómetro', icon: '⏱',
  render(el) {
    const jobs = store.list('jobs').filter((j) => j.status !== 'pagado');
    const rows = store.list('jobs').map((j) => { const m = minutesOf(j.id); const paid = paidOf((i) => i.job === j.id) || (j.status === 'pagado' ? +j.price || 0 : 0); return { j, m, v: m ? Math.round((paid || +j.price || 0) / (m / 60)) : 0 }; }).filter((r) => r.m);
    el.innerHTML = `<div class="card timer"><div style="min-width:0;flex:1"><div class="field"><label for="tj">Trabajo</label><select id="tj" ${run ? 'disabled' : ''}>${jobs.map((j) => `<option value="${j.id}" ${run?.job === j.id ? 'selected' : ''}>${esc(j.title)}</option>`).join('') || '<option value="">Crea un trabajo primero</option>'}</select></div></div>
        <div class="tclock num" id="clk">00:00:00</div>${run ? '<button class="btn btn-delete" data-a="stop">■ Detener</button>' : `<button class="btn btn-create" data-a="go" ${jobs.length ? '' : 'disabled'}>▶ Empezar</button>`}</div>
      <div class="grid k section"><div class="card kpi"><div class="v num">${fmt.money(hourValue())}</div><div class="l">valor real de tu hora (cobrado ÷ horas)</div></div>
        <div class="card kpi"><div class="v num">${fmt.hours(store.list('timeLogs').reduce((a, t) => a + (+t.minutes || 0), 0))}</div><div class="l">horas registradas</div></div></div>
      <div class="section"><h2>Por trabajo</h2><div class="list">${rows.sort((a, b) => a.v - b.v).map((r) => `<div class="list-item" style="cursor:default"><div class="li-main"><div class="li-title">${esc(r.j.title)}</div><div class="li-sub">${fmt.hours(r.m)} · ${fmt.money(r.j.price)}</div></div><div class="li-side ${r.v < 15000 ? 'down' : 'up'}">${fmt.money(r.v)}/h</div></div>`).join('') || '<div class="empty"><b>Sin tiempos todavía</b>Usa el cronómetro al trabajar: descubrirás qué servicio te paga mejor la hora.</div>'}</div></div>`;
    const tick = () => { const c = el.querySelector('#clk'); if (!run || !c?.isConnected) return; const s = Math.floor((Date.now() - run.t0) / 1000); c.textContent = [s / 3600, (s / 60) % 60, s % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':'); setTimeout(tick, 1000); };
    tick();
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'go') { run = { t0: Date.now(), job: el.querySelector('#tj').value }; localStorage.setItem('nexo:neg:timer', JSON.stringify(run)); this.render(el); }
      if (a === 'stop') { const m = Math.max(1, Math.round((Date.now() - run.t0) / 60000)); store.add('timeLogs', { job: run.job, minutes: m, date: fmt.today() }); run = null; localStorage.removeItem('nexo:neg:timer'); toast(`Guardado ${fmt.hours(m)}`); }
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
  el.innerHTML = `<div class="page-title"><h1>Tus números</h1><button class="btn btn-create sm" data-go="cotizador">🧮 Cotizar</button></div>
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

boot({ appId: 'negocios', version: VERSION, home, modules: [trabajos, cotizador, clientes, cobros, prospectos, cronometro, servicios, combos, fuentes] });
