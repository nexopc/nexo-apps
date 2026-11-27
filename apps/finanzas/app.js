// NEXO Finanzas · tu plata
import { boot, fromSchema, store, fmt, esc, h, openForm, toast, sheet, openHarvey } from '../../core/shell.js';
import { estado, grafica, P10_CSS, SEMA } from '../../core/plan10m.js';
import { fx, money, balances } from '../../core/fx.js';
import { registrar, accIcon } from './registrar.js';
{ const st = document.createElement('style'); st.textContent = P10_CSS; document.head.appendChild(st); }

const VERSION = '2.1.0';
const month = () => fmt.today().slice(0, 7);
const sum = (arr) => arr.reduce((a, t) => a + (Number(t.amount) || 0), 0);
const txMonth = (m = month()) => store.list('transactions').filter((t) => (t.date || '').startsWith(m));

const subCOP = (s) => fx.toCOP(s.amount, s.currency || 'COP');
const monthlySub = (s) => (s.cycle === 'año' ? subCOP(s) / 12 : s.cycle === 'semana' ? subCOP(s) * 4.33 : subCOP(s)) || 0;
function autoAlerts() {
  const out = [];
  const spent = {}; txMonth().filter((t) => t.type === 'gasto').forEach((t) => (spent[t.category] = (spent[t.category] || 0) + (+t.amount || 0)));
  for (const b of store.list('budgets')) {
    const p = (spent[b.category] || 0) / (b.limit || 1);
    if (p >= 1) out.push(['s-delete', `Te pasaste del presupuesto de ${b.category}: ${fmt.money(spent[b.category])} de ${fmt.money(b.limit)}`]);
    else if (p >= 0.8) out.push(['s-pending', `Vas en ${Math.round(p * 100)}% del presupuesto de ${b.category}`]);
  }
  const today = fmt.today();
  for (const s of store.list('subscriptions')) {
    if (!s.nextDate) continue;
    const d = Math.round((new Date(s.nextDate + 'T12:00') - new Date(today + 'T12:00')) / 864e5);
    if (d >= 0 && d <= 3) out.push(['s-pending', `${s.name}: renueva ${d === 0 ? 'hoy' : `en ${d} días`} · ${money(s.amount, s.currency || 'COP')}${store.get('accounts', s.account) ? ' con ' + store.get('accounts', s.account).name : ''}`]);
    if (d < 0) out.push(['s-delete', `${s.name}: el pago venció hace ${-d} días`]);
  }
  for (const a of balances()) if (a.balance < 0) out.push(['s-delete', `La cuenta ${a.name} está en negativo (${fmt.money(a.balance)})`]);
  for (const i of store.list('invoices')) if (!i.paid && i.due && i.due < today) out.push(['s-pending', `Cobro vencido: ${fmt.money(i.amount)} (${i.number || 'sin número'})`]);
  return out;
}

// ---------- Movimientos ----------
let txTab = 'all';
const movimientos = fromSchema('transactions', { id: 'movimientos', title: 'Movimientos', icon: '💸', single: 'movimiento',
  filter: (r) => txTab === 'all' || r.type === txTab,
  sort: (a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''),
  itemIcon: (r) => (r.type === 'ingreso' ? '🟢' : r.type === 'gasto' ? '🔴' : '🔵'),
  titleOf: (r) => r.title,
  subOf: (r) => [fmt.date(r.date), r.category, store.get('accounts', r.account)?.name, r.type === 'traslado' ? '→ ' + (store.get('accounts', r.toAccount)?.name || '') : ''].filter(Boolean).map(esc).join(' · '),
  sideOf: (r) => `<span class="${r.type === 'ingreso' ? 'up' : r.type === 'gasto' ? 'down' : ''}">${r.type === 'ingreso' ? '+' : r.type === 'gasto' ? '−' : '⇄'}${r.currency && r.currency !== 'COP' ? money(r.amountCur, r.currency) + '<small class="muted" style="display:block;text-align:right;font-weight:400">≈ ' + fmt.money(r.amount) + '</small>' : fmt.money(r.amount)}</span>`,
  onAdd: () => registrar('gasto'), onOpen: (r) => registrar(r.type, r),
  render(el, api) {
    const m = txMonth();
    el.innerHTML = `<div class="quick row" style="margin-bottom:12px">
        <button class="btn btn-delete" data-new="gasto">− Gasto</button><button class="btn btn-create" data-new="ingreso">＋ Ingreso</button><button class="btn btn-edit ghost" data-new="traslado">⇄ Traslado</button></div>
      <div class="tabs">${[['all', 'Todo'], ['gasto', 'Gastos'], ['ingreso', 'Ingresos'], ['traslado', 'Traslados']].map(([k, l]) => `<button data-t="${k}" aria-pressed="${txTab === k}">${l}</button>`).join('')}</div>
      <p class="muted num" style="margin:0 0 10px">Este mes: <span class="up">+${fmt.money(sum(m.filter((t) => t.type === 'ingreso')))}</span> · <span class="down">−${fmt.money(sum(m.filter((t) => t.type === 'gasto')))}</span></p><div id="tl"></div>`;
    api.renderList(el.querySelector('#tl'), { ...movimientos, render: null });
    el.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { txTab = b.dataset.t; api.paint(); } };
    el.querySelector('.quick').onclick = (e) => { const b = e.target.closest('[data-new]'); if (b) registrar(b.dataset.new); };
  } });

// ---------- Cuentas y bolsillos ----------
const cuentas = fromSchema('accounts', { id: 'cuentas', title: 'Cuentas', icon: '👛', single: 'cuenta o tarjeta',
  render(el) {
    const bs = balances(); const r = fx.get();
    el.innerHTML = `${bs.length ? `<div class="grid">${bs.map((a) => `<button class="card acc" data-id="${a.id}" style="--k:${esc(a.color || 'var(--accent)')}"><span class="chip">${accIcon(a)} ${esc(a.kind || 'Cuenta')}${a.currency !== 'COP' ? ' · ' + a.currency : ''}</span><b>${esc(a.name)}</b><span class="v num ${a.native < 0 ? 'down' : ''}">${money(a.native, a.currency)}</span>${a.currency !== 'COP' ? `<span class="muted num" style="font-size:13px">≈ ${fmt.money(a.balance)}</span>` : ''}</button>`).join('')}</div>
      <p class="muted num" style="margin-top:12px">Total en pesos: <b style="color:var(--fg)">${fmt.money(bs.reduce((x, a) => x + a.balance, 0))}</b></p>`
      : '<div class="empty"><b>Agrega tus cuentas y tarjetas</b>Efectivo, Nequi, tu banco, tarjetas… también en dólares o euros.</div>'}
      <button class="btn btn-create ghost" data-a="add" style="width:100%;margin-top:6px">＋ Agregar cuenta o tarjeta</button>
      <div class="card section fxc"><h3>💱 Tasas de cambio</h3>
        <div class="row num" style="gap:14px"><span>1 USD = <b>${fmt.money(r.USD)}</b></span><span>1 EUR = <b>${fmt.money(r.EUR)}</b></span></div>
        <p class="muted" style="font-size:12px;margin:6px 0 10px">${r.auto === false ? '✎ Puestas a mano' : 'Automáticas'}${r.updated ? ' · ' + fmt.date(r.updated.slice(0, 10)) : ''}</p>
        <div class="row"><button class="btn btn-edit ghost sm" data-a="fxedit">✎ Corregir</button>${r.auto === false ? '<button class="btn btn-cancel sm" data-a="fxauto">Volver a automático</button>' : ''}</div></div>`;
    el.onclick = async (e) => {
      const c = e.target.closest('.acc'); if (c) return openForm(cuentas, store.get('accounts', c.dataset.id));
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (a === 'add') openForm(cuentas, null, { currency: 'COP', kind: 'Billetera digital' });
      if (a === 'fxauto') { fx.set({ auto: true, updated: '' }); await fx.refresh(true); toast('Tasas automáticas'); }
      if (a === 'fxedit') {
        const f = h(`<form class="form"><div class="field"><label for="fu">1 USD en pesos</label><input id="fu" type="number" inputmode="numeric" value="${r.USD}"></div>
          <div class="field"><label for="fe">1 EUR en pesos</label><input id="fe" type="number" inputmode="numeric" value="${r.EUR}"></div>
          <p class="muted" style="font-size:13px;margin:0">Úsalo si tu banco o casa de cambio te da otra tasa. Los movimientos ya guardados no cambian.</p>
          <div class="row end"><button class="btn btn-edit">✓ Guardar tasas</button></div></form>`);
        const sh = sheet('Corregir tasas', f);
        f.addEventListener('submit', (ev) => { ev.preventDefault(); fx.set({ USD: Number(f.fu.value) || r.USD, EUR: Number(f.fe.value) || r.EUR, auto: false, source: 'manual' }); toast('Tasas guardadas'); sh.close(); });
      }
    };
  } });

// ---------- Presupuesto ----------
const presupuesto = fromSchema('budgets', { id: 'presupuesto', title: 'Presupuesto', icon: '🧮', single: 'presupuesto',
  render(el) {
    const spent = {}; txMonth().filter((t) => t.type === 'gasto').forEach((t) => (spent[t.category] = (spent[t.category] || 0) + (+t.amount || 0)));
    const bs = store.list('budgets');
    if (!bs.length) { el.innerHTML = '<div class="empty"><b>Sin presupuesto</b>Ponle un límite mensual a cada categoría (comida, transporte, ocio…).</div>'; return; }
    el.innerHTML = `<div class="list">${bs.map((b) => { const s = spent[b.category] || 0; const p = Math.round((s / (b.limit || 1)) * 100); const c = p >= 100 ? 'var(--c-delete)' : p >= 80 ? 'var(--c-pending)' : 'var(--c-create)';
      return `<button class="card bud" data-id="${b.id}"><div class="row" style="justify-content:space-between"><b>${esc(b.category)}</b><span class="num">${fmt.money(s)} / ${fmt.money(b.limit)}</span></div>
      <div class="bar" style="margin-top:8px"><i style="width:${Math.min(100, p)}%;background:${c}"></i></div><span class="muted num" style="font-size:12px">${p}% · quedan ${fmt.money(Math.max(0, b.limit - s))}</span></button>`; }).join('')}</div>`;
    el.onclick = (e) => { const c = e.target.closest('.bud'); if (c) openForm(presupuesto, store.get('budgets', c.dataset.id)); };
  } });

// ---------- Metas de ahorro ----------
const ahorro = fromSchema('savings', { id: 'ahorro', title: 'Bolsillos', icon: '🐷', single: 'bolsillo',
  render(el) {
    const ss = store.list('savings');
    if (!ss.length) { el.innerHTML = '<div class="empty"><b>Crea tu meta: Abrir NEXO PC</b>Pon el valor total y una fecha. Te digo cuánto ahorrar por mes. También puedes llevar tu 🪙 alcancía de monedas.</div>'; }
    if (ss.length) el.innerHTML = `<div class="grid">${ss.map((s) => { const p = Math.min(100, Math.round(((s.saved || 0) / (s.target || 1)) * 100));
      const monthsLeft = s.due ? Math.max(1, Math.round((new Date(s.due) - new Date()) / (30.4 * 864e5))) : null;
      const perMonth = monthsLeft ? Math.ceil(Math.max(0, s.target - (s.saved || 0)) / monthsLeft) : null;
      if (s.kind === 'alcancia' || s.kind === 'bolsillo') return `<div class="card sav"><div class="ring" style="--p:${s.target ? p : 100}"><span style="font-size:26px">${s.kind === 'alcancia' ? '🪙' : '👝'}</span></div>
        <div><b>${esc(s.name)}</b><div class="num" style="font:700 22px var(--display)">${fmt.money(s.saved || 0)}${s.target ? ` <span class="muted" style="font-size:13px;font-weight:500">de ${fmt.money(s.target)}</span>` : ''}</div>
        <div class="row" style="margin-top:8px">${(s.kind === 'alcancia' ? [200, 500, 1000, 2000] : [5000, 10000, 20000]).map((v) => `<button class="btn btn-create ghost sm" data-coin="${s.id}" data-v="${v}">+${v >= 1000 ? v / 1000 + 'k' : v}</button>`).join('')}<button class="btn btn-edit ghost sm" data-ed="${s.id}">✎</button></div></div></div>`;
      return `<div class="card sav"><div class="ring" style="--p:${p}"><span class="num">${p}%</span></div>
        <div><b>${esc(s.name)}</b><div class="num">${fmt.money(s.saved || 0)} <span class="muted">de ${fmt.money(s.target)}</span></div>
        ${perMonth ? `<div class="muted" style="font-size:13px">Necesitas <b style="color:var(--fg)">${fmt.money(perMonth)}/mes</b> por ${monthsLeft} meses</div>` : ''}
        <div class="row" style="margin-top:8px"><button class="btn btn-create sm" data-dep="${s.id}">＋ Abonar</button><button class="btn btn-edit ghost sm" data-ed="${s.id}">Editar</button></div></div></div>`; }).join('')}</div>`;
    el.insertAdjacentHTML('afterbegin', `<div class="row" style="margin-bottom:12px"><button class="btn btn-create ghost sm" data-newk="meta">＋ Meta</button><button class="btn btn-create ghost sm" data-newk="alcancia">＋ 🪙 Alcancía</button><button class="btn btn-create ghost sm" data-newk="bolsillo">＋ 👝 Bolsillo</button></div>`);
    el.onclick = (e) => {
      const nk = e.target.closest('[data-newk]'); if (nk) return openForm(ahorro, null, { kind: nk.dataset.newk, name: nk.dataset.newk === 'alcancia' ? 'Alcancía de monedas' : '' });
      const coin = e.target.closest('[data-coin]');
      if (coin) { const s = store.get('savings', coin.dataset.coin); const v = Number(coin.dataset.v); store.update('savings', s.id, { saved: (Number(s.saved) || 0) + v }); navigator.vibrate?.(8); toast(`+${fmt.money(v)} a ${s.name}`); return; }
      const ed = e.target.closest('[data-ed]'); if (ed) return openForm(ahorro, store.get('savings', ed.dataset.ed));
      const d = e.target.closest('[data-dep]'); if (!d) return;
      const s = store.get('savings', d.dataset.dep);
      const body = h(`<form class="form"><div class="field"><label for="v">¿Cuánto abonas?</label><input id="v" type="number" inputmode="numeric" step="1000" min="0"></div><div class="row end"><button class="btn btn-create">＋ Abonar</button></div></form>`);
      const sh = sheet('Abonar a ' + s.name, body);
      body.addEventListener('submit', (ev) => { ev.preventDefault(); const v = Number(body.v.value) || 0; if (!v) return;
        store.update('savings', s.id, { saved: (Number(s.saved) || 0) + v });
        if (s.account) store.add('transactions', { type: 'traslado', amount: v, title: 'Abono a ' + s.name, category: 'Otro', account: store.list('accounts').find((a) => a.kind === 'Personal')?.id || '', toAccount: s.account, date: fmt.today() });
        toast('Abono guardado 🐷'); sh.close(); });
    };
  } });

// ---------- Suscripciones ----------
const suscripciones = fromSchema('subscriptions', { id: 'suscripciones', title: 'Suscripciones', icon: '🔁', single: 'suscripción',
  sort: (a, b) => (a.nextDate || '9').localeCompare(b.nextDate || '9'),
  titleOf: (r) => r.name,
  subOf: (r) => { const a = store.get('accounts', r.account); return `cada ${esc(r.cycle || 'mes')}${r.nextDate ? ' · renueva ' + fmt.date(r.nextDate) : ''}${a ? ' · ' + accIcon(a) + ' ' + esc(a.name) : ' · <span class="down">¿con qué se paga?</span>'}`; },
  sideOf: (r) => `${money(r.amount, r.currency || 'COP')}${r.currency && r.currency !== 'COP' ? `<small class="muted" style="display:block;text-align:right;font-weight:400">≈ ${fmt.money(subCOP(r))}</small>` : ''}`,
  headerExtra: () => `<span class="chip s-pending num">${fmt.money(store.list('subscriptions').reduce((a, s) => a + monthlySub(s), 0))}/mes</span>` });

// ---------- Alertas ----------
const alertas = fromSchema('alerts', { id: 'alertas', title: 'Alertas', icon: '🔔', single: 'alerta',
  render(el, api) {
    const auto = autoAlerts();
    el.innerHTML = `<div class="section" style="margin-top:0"><h2>Automáticas</h2>${auto.length ? `<div class="list">${auto.map(([c, t]) => `<div class="list-item" style="cursor:default"><span class="chip ${c}">●</span><div class="li-main" style="white-space:normal">${esc(t)}</div></div>`).join('')}</div>` : '<div class="empty"><b>Todo en orden</b>No hay alertas de presupuesto, pagos ni saldos.</div>'}</div>
      <div class="section"><h2>Tus alertas (Louis las vigila)</h2><div id="al"></div></div>`;
    api.renderList(el.querySelector('#al'), { ...alertas, render: null, titleOf: (r) => r.title, sideOf: (r) => (r.active ? '<span class="chip s-create">activa</span>' : '<span class="chip">pausada</span>') });
  } });

// ---------- Reportes ----------
const reportes = { id: 'reportes', title: 'Reportes', icon: '📈',
  render(el) {
    const m = txMonth();
    const byCat = {}; m.filter((t) => t.type === 'gasto').forEach((t) => (byCat[t.category || 'Otro'] = (byCat[t.category || 'Otro'] || 0) + (+t.amount || 0)));
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const maxC = Math.max(1, ...cats.map((c) => c[1]));
    const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return d.toISOString().slice(0, 7); });
    const series = months.map((mm) => { const t = txMonth(mm); return { m: mm, i: sum(t.filter((x) => x.type === 'ingreso')), g: sum(t.filter((x) => x.type === 'gasto')) }; });
    const maxS = Math.max(1, ...series.flatMap((s) => [s.i, s.g]));
    const inc = sum(m.filter((t) => t.type === 'ingreso')), out = sum(m.filter((t) => t.type === 'gasto'));
    el.innerHTML = `<div class="grid k"><div class="card kpi"><div class="v num up">${fmt.money(inc)}</div><div class="l">ingresos del mes</div></div>
      <div class="card kpi"><div class="v num down">${fmt.money(out)}</div><div class="l">gastos del mes</div></div>
      <div class="card kpi"><div class="v num">${inc ? Math.round(((inc - out) / inc) * 100) : 0}%</div><div class="l">tasa de ahorro</div></div></div>
      <div class="grid section">
      <div class="card"><h3>¿En qué se va la plata? (este mes)</h3>${cats.map(([c, v]) => `<div class="hbar"><span>${esc(c)}</span><div class="bar"><i style="width:${(v / maxC) * 100}%;background:var(--c-delete)"></i></div><span class="num">${fmt.money(v)}</span></div>`).join('') || '<p class="muted">Aún no hay gastos este mes.</p>'}</div>
      <div class="card"><h3>Últimos 6 meses</h3><div class="cols">${series.map((s) => `<div class="c"><div class="b"><i class="in" style="height:${(s.i / maxS) * 100}%" title="Ingresos ${fmt.money(s.i)}"></i><i class="out" style="height:${(s.g / maxS) * 100}%" title="Gastos ${fmt.money(s.g)}"></i></div><span class="muted">${new Date(s.m + '-15').toLocaleDateString('es-CO', { month: 'short' })}</span></div>`).join('')}</div>
        <div class="row muted" style="font-size:12px;margin-top:6px"><span><i class="sw" style="background:var(--c-create)"></i>ingresos</span><span><i class="sw" style="background:var(--c-delete)"></i>gastos</span></div></div></div>
      <div class="row section"><button class="btn btn-ai" data-a="louis">🟣 Que Louis revise mis números</button></div>`;
    el.querySelector('[data-a=louis]').onclick = () => openHarvey('Louis: revisa mis finanzas de este mes y los últimos 6 meses. Dime dónde estoy perdiendo plata y cuánto puedo ahorrar para NEXO PC.');
  } };

// ---------- Camino a la libertad financiera ----------
const libertad = { id: 'libertad', title: 'Libertad financiera', icon: '🧭',
  render(el) {
    const months = [...Array(3)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1 - i); return d.toISOString().slice(0, 7); });
    const avgOut = Math.round(months.reduce((a, mm) => a + sum(txMonth(mm).filter((t) => t.type === 'gasto')), 0) / 3) || sum(txMonth().filter((t) => t.type === 'gasto'));
    const avgIn = Math.round(months.reduce((a, mm) => a + sum(txMonth(mm).filter((t) => t.type === 'ingreso')), 0) / 3) || sum(txMonth().filter((t) => t.type === 'ingreso'));
    const total = balances().reduce((a, b) => a + b.balance, 0);
    const emergency = avgOut * 3;
    const nexo = store.list('savings').find((s) => /nexo/i.test(s.name));
    const hasBudget = store.list('budgets').length > 0;
    const steps = [
      ['Registrar todo', 'Anotas cada gasto e ingreso por 30 días', store.list('transactions').length >= 30],
      ['Gastar menos de lo que ganas', `Ingreso promedio ${fmt.money(avgIn)} vs gasto ${fmt.money(avgOut)}`, avgIn > avgOut && avgIn > 0],
      ['Presupuesto por categoría', 'Límites mensuales activos', hasBudget],
      ['Fondo de emergencia (3 meses)', `${fmt.money(total)} de ${fmt.money(emergency)}`, emergency > 0 && total >= emergency],
      ['Capital para NEXO PC', nexo ? `${fmt.money(nexo.saved || 0)} de ${fmt.money(nexo.target)}` : 'Crea la meta en 🐷 Ahorro', nexo && (nexo.saved || 0) >= nexo.target],
      ['Ingresos que no dependen de tu hora', 'Tienda, productos, servicios con equipo', false],
    ];
    const cur = steps.findIndex((s) => !s[2]);
    const runway = avgOut ? (total / avgOut).toFixed(1) : '—';
    el.innerHTML = `<div class="grid k"><div class="card kpi"><div class="v num">${runway}</div><div class="l">meses que aguantas sin ingresos</div></div>
      <div class="card kpi"><div class="v num">${avgIn ? Math.round(((avgIn - avgOut) / avgIn) * 100) : 0}%</div><div class="l">ahorras de lo que ganas</div></div></div>
      <div class="path section">${steps.map(([t, d, ok], i) => `<div class="step ${ok ? 'ok' : i === cur ? 'cur' : ''}"><span class="n">${ok ? '✓' : i + 1}</span><div><b>${t}</b><div class="muted" style="font-size:13px">${esc(d)}</div></div></div>`).join('')}</div>`;
  } };


// ---------- Meta de ventas (Plan $10M) ----------
function metaCard(full = false) {
  const e = estado(); if (!e) return '';
  const pct = Math.min(100, Math.round((e.acc / e.p.meta) * 100));
  return `<div class="card p10">
    <div class="row" style="justify-content:space-between"><b>🎯 ${esc(e.p.nombre)} · al ${fmt.date(e.p.fin)}</b><span class="chip num">${e.diasRest} días</span></div>
    <div class="num" style="font:700 30px var(--display)">${fmt.money(e.acc)} <span class="muted" style="font-size:15px;font-weight:500">de ${fmt.money(e.p.meta)}</span></div>
    <div class="bar"><i style="width:${pct}%;background:${SEMA[e.color]}"></i></div>
    <div class="sema" style="--sc:${SEMA[e.color]}"><span class="luz"></span><div><b>${e.color === 'verde' ? 'Verde' : e.color === 'amarillo' ? 'Amarillo' : 'Rojo'}:</b> ${esc(e.msg)}<div class="muted num" style="font-size:13px">Deberías llevar ${fmt.money(e.meta)} · mínimo ${fmt.money(e.minimo)} · hoy la meta es ${fmt.money(e.metaDia)}</div></div></div>
    ${full ? grafica(e.p) : ''}
    ${full && e.etapa ? `<div class="muted">Etapa actual: <b style="color:var(--fg)">${esc(e.etapa.n)}</b> (${fmt.date(e.etapa.desde)} – ${fmt.date(e.etapa.hasta)}) · meta de la etapa ${fmt.money(e.etapa.meta)}</div>` : ''}
    ${full ? `<div class="grid k"><div class="card kpi"><div class="v num">${fmt.money(e.falta)}</div><div class="l">te falta</div></div><div class="card kpi"><div class="v num">${fmt.money(e.diasRest ? Math.ceil(e.falta / e.diasRest) : e.falta)}</div><div class="l">por día para llegar</div></div><div class="card kpi"><div class="v num">${fmt.money(e.p.minimo)}</div><div class="l">mínimo aceptable</div></div><div class="card kpi"><div class="v num">${fmt.money(e.p.maximo)}</div><div class="l">si todo sale perfecto</div></div></div>` : ''}
  </div>`;
}
const metaVentas = { id: 'meta', title: 'Meta $10M', icon: '🎯',
  render(el) {
    const html = metaCard(true);
    el.innerHTML = html || '<div class="empty"><b>Sin meta de ventas</b>Entra con Google: tu Plan $10M se carga solo desde la nube.</div>';
    if (html) { el.insertAdjacentHTML('beforeend', '<div class="row section"><button class="btn btn-ai" data-a="louis">🟣 Louis: ¿cómo voy con la meta?</button><button class="btn btn-create ghost" data-a="reg">＋ Registro de hoy (Negocios)</button></div>');
      el.querySelector('[data-a=louis]').onclick = () => openHarvey('Louis: revisa mi meta de $10M. ¿Voy en verde, amarillo o rojo? ¿Cuánto debo cobrar por día desde hoy y qué cobros pendientes debo perseguir?');
      el.querySelector('[data-a=reg]').onclick = () => { location.href = '../negocios/index.html#registro'; }; }
  } };

// ---------- Inicio ----------
function home(el) {
  const bs = balances();
  const total = bs.reduce((a, b) => a + b.balance, 0);
  const m = txMonth();
  const inc = sum(m.filter((t) => t.type === 'ingreso')), out = sum(m.filter((t) => t.type === 'gasto'));
  const nexo = store.list('savings').find((s) => /nexo/i.test(s.name)) || store.list('savings').find((s) => !s.kind || s.kind === 'meta');
  const alerts = autoAlerts().slice(0, 3);
  const last = store.list('transactions').sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
  el.innerHTML = metaCard() + `<div class="hero card" style="margin-top:12px"><span class="muted">Tienes en total</span><div class="big num">${fmt.money(total)}</div>
      <div class="row num" style="gap:16px"><span class="up">▲ ${fmt.money(inc)} este mes</span><span class="down">▼ ${fmt.money(out)}</span></div>
</div>
    ${alerts.length ? `<div class="list section">${alerts.map(([c, t]) => `<div class="list-item" style="cursor:default"><span class="chip ${c}">!</span><div class="li-main" style="white-space:normal;font-size:14px">${esc(t)}</div></div>`).join('')}</div>` : ''}
    <div class="grid section">
      ${nexo ? `<div class="card"><h3>🐷 ${esc(nexo.name)}</h3><div class="num"><b>${fmt.money(nexo.saved || 0)}</b> <span class="muted">de ${fmt.money(nexo.target)}</span></div><div class="bar" style="margin-top:10px"><i style="width:${Math.min(100, ((nexo.saved || 0) / (nexo.target || 1)) * 100)}%"></i></div></div>` : '<div class="card"><h3>🐷 Meta NEXO PC</h3><p class="muted" style="margin:0">Créala en Ahorro para ver tu avance aquí.</p></div>'}
      <div class="card"><h3>👛 Cuentas</h3>${bs.map((a) => `<div class="row" style="justify-content:space-between;padding:3px 0"><span>${accIcon(a)} ${esc(a.name)}</span><b class="num ${a.native < 0 ? 'down' : ''}">${money(a.native, a.currency)}</b></div>`).join('') || '<p class="muted" style="margin:0">Crea tus cuentas en 👛 Cuentas</p>'}<button class="btn btn-create ghost sm" data-a="newacc" style="margin-top:8px">＋ Cuenta o tarjeta</button></div>
      <div class="card"><h3>🕒 Últimos movimientos</h3>${last.map((t) => `<div class="row" style="justify-content:space-between;padding:3px 0;flex-wrap:nowrap"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.title)}</span><b class="num ${t.type === 'ingreso' ? 'up' : t.type === 'gasto' ? 'down' : ''}">${fmt.money(t.amount)}</b></div>`).join('') || '<p class="muted" style="margin:0">Sin movimientos</p>'}</div>
    </div>`;
  el.onclick = (e) => { const b = e.target.closest('[data-new]'); if (b) registrar(b.dataset.new); if (e.target.closest('[data-a=newacc]')) openForm(cuentas, null, { currency: 'COP', kind: 'Billetera digital' }); };
}

const QUICK = [
  { label: 'Gasto', icon: '−', color: '#FF4D4D', run: () => registrar('gasto') },
  { label: 'Ingreso', icon: '＋', color: '#1CE783', run: () => registrar('ingreso') },
  { label: 'Mover plata', icon: '⇄', color: '#7C5CFF', run: () => registrar('traslado') },
  { label: 'Meta $10M', icon: '🎯', color: '#FFFFFF', run: (api) => api.go('meta') },
];
fx.refresh().catch(() => {});
boot({ appId: 'finanzas', version: VERSION, home, quick: QUICK, modules: [movimientos, metaVentas, cuentas, presupuesto, ahorro, suscripciones, alertas, reportes, libertad] });
