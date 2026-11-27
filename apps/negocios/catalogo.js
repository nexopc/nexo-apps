// NEXO Negocios v3 · 📦 Planes y combos + ＋ Crear (empresa, servicio, plan con calculadora, combo) + 🏢 Empresas
import { store, fmt, esc, h, toast, sheet, confirmSheet, openForm, fromSchema } from '../../core/shell.js';
import { money, minHora, derivado, cobradoMes, colorOf } from './datos.js';

let marca = '';
const fuentes = fromSchema('sources', { id: 'empresas-f', title: 'Empresa', single: 'empresa' });

export function crearMenu(after) {
  const body = h(`<div class="form">${[['empresa', '🏢', 'Empresa o marca', 'Agencia, NEXO PC, una nueva…'], ['servicio', '🧰', 'Servicio', 'Redes, página web, mantenimiento de PC…'], ['plan', '⭐', 'Plan de un servicio', 'Básico, Pro, Premium… con la calculadora'], ['combo', '🎁', 'Combo', 'Junta planes y ponle un precio especial']]
    .map(([k, i, t, s]) => `<button class="opt" data-k="${k}"><span class="oi">${i}</span><span><b>${t}</b><small>${s}</small></span></button>`).join('')}</div>`);
  const s = sheet('＋ ¿Qué vas a crear?', body);
  body.onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; s.close(); setTimeout(() => ({ empresa: () => empresaForm(null, after), servicio: () => planForm(null, { nuevoServicio: true }, after), plan: () => planForm(null, {}, after), combo: () => comboForm(null, after) })[b.dataset.k](), 280); };
}

export function empresaForm(src, after) { const s = openForm(fuentes, src, src ? {} : { estado: 'activa', color: '#FF8A1F' }); return s; }

// ---------- Plan con calculadora ----------
export function planForm(svc, { nuevoServicio = false, source = '', name = '' } = {}, after) {
  const S = svc ? { ...svc, extras: (svc.extras || []).map((x) => ({ ...x })) } : { source: source || marca || store.list('sources')[0]?.id || '', name, plan: '', desc: '', noIncluye: '', mensual: false, anticipo: 50, entrega: '', hours: 4, costos: 20000, price: 0, extras: [] };
  S.hours = Number(S.hours) || 4; S.costos = Number(S.costos) || 0; S.anticipo = Number(S.anticipo ?? 50);
  let margen = 30; let nuevo = nuevoServicio || !S.name;
  const body = h('<form class="form pform" novalidate></form>');
  const s = sheet(svc ? '✎ Editar plan' : nuevoServicio ? '🧰 Nuevo servicio (y su primer plan)' : '⭐ Nuevo plan', body);
  const nombres = () => [...new Set(store.list('services').filter((x) => x.source === S.source).map((x) => x.name))];
  const read = () => {
    const v = (id) => body.querySelector('#' + id)?.value;
    if (body.querySelector('#pn')) S.name = v('pn').trim();
    S.plan = v('pp').trim(); S.desc = v('pd'); S.noIncluye = v('pni'); S.entrega = v('pe').trim(); S.anticipo = Number(v('pa')) || 0;
    S.price = Number(v('px')) || 0;
    S.extras = [...body.querySelectorAll('.exrow')].map((r) => ({ name: r.querySelector('.exn').value.trim(), price: Number(r.querySelector('.exp').value) || 0 })).filter((x) => x.name);
  };
  const paint = () => {
    const minimo = Math.round(S.hours * minHora() + S.costos); const sug = Math.ceil(minimo * (1 + margen / 100) / 1000) * 1000;
    const ph = S.hours ? Math.round(((S.price || sug) - S.costos) / S.hours) : 0;
    const srcs = store.list('sources');
    body.innerHTML = `
      <div class="field"><label>Empresa</label><div class="picks">${srcs.map((x) => `<button type="button" class="pick ${x.id === S.source ? 'on' : ''}" data-src="${x.id}">${esc(x.name)}</button>`).join('')}<button type="button" class="pick add" data-a="newsrc">＋ Empresa</button></div></div>
      <div class="field"><label>Servicio</label>${nuevo ? `<input id="pn" value="${esc(S.name)}" placeholder="Redes sociales, Página web, Video…">${nombres().length ? '<button type="button" class="linkish" data-a="elegir">← Elegir uno que ya tengo</button>' : ''}`
        : `<div class="picks">${nombres().map((n) => `<button type="button" class="pick ${n === S.name ? 'on' : ''}" data-nm="${esc(n)}">${esc(n)}</button>`).join('')}<button type="button" class="pick add" data-a="nuevo">＋ Servicio</button></div>`}</div>
      <div class="field"><label for="pp">Nombre del plan</label><input id="pp" value="${esc(S.plan)}" placeholder="Básico, Emprendedor, Pro, Premium…"></div>
      <div class="field"><label for="pd">Qué incluye (uno por línea)</label><textarea id="pd" rows="3" placeholder="6 posts al mes&#10;2 reels">${esc(S.desc)}</textarea></div>
      <div class="field"><label for="pni">Qué NO incluye</label><textarea id="pni" rows="2" placeholder="Pauta pagada, fotos profesionales…">${esc(S.noIncluye)}</textarea></div>
      <div class="seg" data-g="men"><button type="button" data-v="0" aria-pressed="${!S.mensual}">Pago único</button><button type="button" data-v="1" aria-pressed="${!!S.mensual}">Mensual</button></div>
      <div class="row" style="gap:10px;flex-wrap:nowrap"><div class="field" style="flex:1"><label for="pa">Anticipo %</label><input id="pa" type="number" inputmode="numeric" min="0" max="100" value="${S.anticipo}"></div><div class="field" style="flex:1.4"><label for="pe">Tiempo de entrega</label><input id="pe" value="${esc(S.entrega)}" placeholder="5 días hábiles"></div></div>
      <div class="calc"><b class="ct">🧮 Calculadora <span class="muted">· tu hora mínima ${money(minHora())}</span></b>
        ${[['hours', '⏱ Horas reales', 0.5, (x) => x + ' h'], ['costos', '💸 Costos (datos, transporte, materiales)', 5000, money], ['margen', '📈 Ganancia extra', 5, (x) => x + ' %']].map(([k, l, st, f]) => `<div class="qrow"><span>${l}</span><div class="stp"><button type="button" data-c="${k}" data-d="${-st}" aria-label="Menos">−</button><b class="num">${f(k === 'margen' ? margen : S[k])}</b><button type="button" data-c="${k}" data-d="${st}" aria-label="Más">＋</button></div></div>`).join('')}
        <div class="qrow"><span class="muted">Mínimo <b class="num" style="color:var(--fg)">${money(minimo)}</b></span><span class="muted">Sugerido <b class="num up">${money(sug)}</b> <button type="button" class="linkish" data-a="usar">usar</button></span></div></div>
      <div class="field"><label for="px">Tu precio${S.mensual ? ' (al mes)' : ''}</label><input id="px" type="number" inputmode="numeric" step="1000" min="0" value="${S.price || ''}" placeholder="${sug}" class="${S.price && S.price < minimo ? 'bad' : ''}">
        <span class="hint ${S.price && S.price < minimo ? 'down' : 'up'}">${S.price && S.price < minimo ? `⚠ Por debajo de tu mínimo (${money(minimo)}): perderías plata o tiempo` : ph ? `Ganas ${money(ph)} por hora ✓` : ''}</span></div>
      <div class="field"><label>Extras (opcional)</label>${S.extras.map((x, i) => `<div class="exrow row" style="gap:6px;flex-wrap:nowrap"><input class="exn" value="${esc(x.name)}" placeholder="Reel extra"><input class="exp" type="number" inputmode="numeric" value="${x.price || ''}" placeholder="$" style="max-width:120px"><button type="button" class="btn btn-delete ghost sm" data-rx="${i}" aria-label="Quitar">✕</button></div>`).join('')}<button type="button" class="linkish" data-a="addex">＋ Extra</button></div>
      <div class="row end">${svc ? '<button type="button" class="btn btn-delete ghost" data-a="del">🗑</button>' : ''}<button class="btn btn-create">✓ Guardar plan</button></div>`;
    body.querySelector('#px').oninput = (e) => { S.price = Number(e.target.value) || 0; const hint = body.querySelector('.hint'); const bad = S.price && S.price < minimo; e.target.classList.toggle('bad', !!bad); const p2 = S.hours ? Math.round(((S.price || sug) - S.costos) / S.hours) : 0; hint.className = 'hint ' + (bad ? 'down' : 'up'); hint.textContent = bad ? `⚠ Por debajo de tu mínimo (${money(minimo)}): perderías plata o tiempo` : p2 ? `Ganas ${money(p2)} por hora ✓` : ''; };
  };
  paint();
  body.addEventListener('click', (e) => {
    const g = (x) => e.target.closest(x); let b;
    if ((b = g('[data-src]'))) { read(); S.source = b.dataset.src; if (!nombres().includes(S.name)) nuevo = !nombres().length || nuevo; return paint(); }
    if ((b = g('[data-nm]'))) { read(); S.name = b.dataset.nm; return paint(); }
    if ((b = g('[data-c]'))) { read(); const k = b.dataset.c; const d = Number(b.dataset.d); if (k === 'margen') margen = Math.max(0, margen + d); else S[k] = Math.max(0, Math.round((S[k] + d) * 10) / 10); navigator.vibrate?.(6); return paint(); }
    if ((b = g('[data-g=men] [data-v]'))) { read(); S.mensual = b.dataset.v === '1'; return paint(); }
    if ((b = g('[data-rx]'))) { read(); S.extras.splice(Number(b.dataset.rx), 1); return paint(); }
    const a = g('[data-a]')?.dataset.a;
    if (a === 'usar') { read(); S.price = Math.ceil(Math.round(S.hours * minHora() + S.costos) * (1 + margen / 100) / 1000) * 1000; return paint(); }
    if (a === 'addex') { read(); S.extras.push({ name: '', price: 0 }); paint(); setTimeout(() => body.querySelectorAll('.exn')[S.extras.length - 1]?.focus(), 30); return; }
    if (a === 'nuevo') { read(); nuevo = true; S.name = ''; paint(); setTimeout(() => body.querySelector('#pn')?.focus(), 30); return; }
    if (a === 'elegir') { read(); nuevo = false; S.name = nombres()[0] || ''; return paint(); }
    if (a === 'newsrc') { s.close(); setTimeout(() => empresaForm(null), 280); return; }
    if (a === 'del') { confirmSheet('¿Borrar plan?', `"${svc.name} · ${svc.plan}" se borra del catálogo. Las cotizaciones viejas no cambian.`, { yes: 'Borrar', danger: true }).then((ok) => { if (ok) { store.remove('services', svc.id); toast('Plan borrado'); s.close(); after?.(); } }); }
  });
  body.addEventListener('submit', (e) => {
    e.preventDefault(); read();
    if (!S.source) return toast('Elige la empresa');
    if (!S.name) return toast('Escribe el nombre del servicio');
    if (!S.plan) return toast('Ponle nombre al plan');
    const minimo = Math.round(S.hours * minHora() + S.costos);
    if (!S.price) S.price = Math.ceil(minimo * (1 + margen / 100) / 1000) * 1000;
    const data = { source: S.source, name: S.name, plan: S.plan, desc: S.desc, noIncluye: S.noIncluye, mensual: !!S.mensual, anticipo: S.anticipo, entrega: S.entrega, hours: S.hours, costos: S.costos, price: S.price, extras: S.extras };
    svc ? store.update('services', svc.id, data) : store.add('services', data);
    toast(S.price < minimo ? '⚠ Guardado, pero está por debajo de tu mínimo' : '✓ Plan guardado'); s.close(); after?.();
  });
  return s;
}

// ---------- Combo ----------
export function comboForm(cb, after) {
  const C = cb ? { ...cb, plans: [...(cb.plans || [])] } : { name: '', para: 'Negocio', plans: [], pct: 15, source: marca || store.list('sources')[0]?.id || '' };
  const body = h('<form class="form" novalidate></form>');
  const s = sheet(cb ? '✎ Editar combo' : '🎁 Nuevo combo', body);
  const svcs = () => store.list('services').sort((a, b) => (a.name + a.price).localeCompare(b.name + b.price));
  const sum = () => C.plans.map((id) => store.get('services', id)).filter(Boolean).reduce((a, p) => a + (Number(p.price) || 0), 0);
  const minSum = () => C.plans.map((id) => store.get('services', id)).filter(Boolean).reduce((a, p) => a + derivado(p).minimo, 0);
  const paint = () => {
    const sep = sum(); const price = Math.round(sep * (1 - C.pct / 100) / 1000) * 1000; const low = minSum() && price < minSum();
    body.innerHTML = `<div class="field"><label for="cn">Nombre</label><input id="cn" value="${esc(C.name)}" placeholder="Negocio Visible"></div>
      <div class="field"><label>Para</label><div class="seg" data-g="para">${['Persona', 'Negocio', 'Empresa'].map((p) => `<button type="button" data-v="${p}" aria-pressed="${C.para === p}">${p}</button>`).join('')}</div></div>
      <div class="field"><label>Elige los planes</label><div class="list">${svcs().map((p) => `<button type="button" class="list-item ${C.plans.includes(p.id) ? 'on' : ''}" data-p="${p.id}"><span class="check" aria-pressed="${C.plans.includes(p.id)}">✓</span><div class="li-main"><div class="li-title">${esc(p.name)} · ${esc(p.plan || '')}</div><div class="li-sub">${esc(store.get('sources', p.source)?.name || '')}</div></div><b class="num">${money(p.price)}</b></button>`).join('') || '<p class="muted">Primero crea planes.</p>'}</div></div>
      <div class="calc"><div class="qrow"><span class="muted">Por separado</span><b class="num">${money(sep)}</b></div>
        <div class="qrow"><span>🏷 Descuento del combo</span><div class="stp"><button type="button" data-d="-5" aria-label="Menos">−</button><b class="num">${C.pct} %</b><button type="button" data-d="5" aria-label="Más">＋</button></div></div>
        <div class="qrow"><span>Precio combo</span><b class="num ${low ? 'down' : 'up'}" style="font-size:20px">${money(price)}</b></div>
        <span class="muted" style="font-size:12px">${sep ? `El cliente ahorra ${money(sep - price)}${low ? ` · ⚠ quedas por debajo de tu mínimo (${money(minSum())})` : ' · sigues sobre tu mínimo ✓'}` : 'Marca 2 o más planes.'}</span></div>
      <div class="row end">${cb ? '<button type="button" class="btn btn-delete ghost" data-a="del">🗑</button>' : ''}<button class="btn btn-create">✓ Guardar combo</button></div>`;
  };
  paint();
  const readN = () => { C.name = body.querySelector('#cn').value.trim(); };
  body.addEventListener('click', (e) => {
    const g = (x) => e.target.closest(x); let b;
    if ((b = g('[data-p]'))) { readN(); const id = b.dataset.p; C.plans = C.plans.includes(id) ? C.plans.filter((x) => x !== id) : [...C.plans, id]; return paint(); }
    if ((b = g('[data-g=para] [data-v]'))) { readN(); C.para = b.dataset.v; return paint(); }
    if ((b = g('[data-d]'))) { readN(); C.pct = Math.max(0, Math.min(60, C.pct + Number(b.dataset.d))); return paint(); }
    if (g('[data-a=del]')) confirmSheet('¿Borrar combo?', `"${cb.name}" se borra.`, { yes: 'Borrar', danger: true }).then((ok) => { if (ok) { store.remove('combos', cb.id); s.close(); after?.(); } });
  });
  body.addEventListener('submit', (e) => {
    e.preventDefault(); readN();
    if (!C.name) return toast('Ponle nombre al combo');
    if (C.plans.length < 2) return toast('Elige al menos 2 planes');
    const sep = sum(); const price = Math.round(sep * (1 - C.pct / 100) / 1000) * 1000;
    const ps = C.plans.map((id) => store.get('services', id)).filter(Boolean);
    const data = { name: C.name, para: C.para, plans: C.plans, pct: C.pct, separate: sep, price, source: ps[0]?.source || C.source, items: ps.map((p) => `${p.name} · ${p.plan}`).join('\n') };
    cb ? store.update('combos', cb.id, data) : store.add('combos', data);
    toast('🎁 Combo guardado'); s.close(); after?.();
  });
  return s;
}

// ---------- Pantallas de "Más" ----------
export const planes = { id: 'planes', title: 'Planes y combos', icon: '📦', onAdd: () => crearMenu(),
  render(el) {
    const srcs = store.list('sources');
    if (!marca || !srcs.some((s) => s.id === marca)) marca = srcs[0]?.id || '';
    const svcs = store.list('services').filter((s) => !marca || s.source === marca);
    const names = [...new Set(svcs.map((s) => s.name))];
    const combos = store.list('combos').filter((c) => !marca || !c.source || c.source === marca);
    el.innerHTML = `<div class="picks">${srcs.map((s) => `<button class="pick ${s.id === marca ? 'on' : ''}" data-m="${s.id}">${esc(s.name)}</button>`).join('')}<button class="pick add" data-a="emp">＋ Empresa</button></div>
      <button class="btn btn-create" data-a="crear" style="width:100%;margin:12px 0">＋ Crear empresa, servicio, plan o combo</button>
      ${names.map((n) => `<div class="card section"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(n)}</h3><button class="linkish" data-addplan="${esc(n)}">＋ Plan</button></div>
        ${svcs.filter((s) => s.name === n).sort((a, b) => a.price - b.price).map((p) => { const d = derivado(p); return `<button class="prow" data-svc="${p.id}"><span><b>${esc(p.plan || 'Único')}</b><small>${[p.entrega, p.mensual ? 'mensual' : '', d.hours ? d.hours + ' h' + (d.real ? ' medidas' : '') : ''].filter(Boolean).map(esc).join(' · ')}</small></span><span class="num" style="text-align:right"><b>${money(p.price)}</b><small class="${d.porHora && d.porHora < minHora() ? 'down' : 'muted'}">${d.porHora ? money(d.porHora) + '/h' : ''}</small></span></button>`; }).join('')}</div>`).join('') || '<div class="empty section"><b>Sin servicios en esta empresa</b>Toca ＋ Crear para el primero.</div>'}
      <div class="section"><h2>🎁 Combos</h2>${combos.map((c) => `<button class="prow card" data-cb="${c.id}"><span><b>${esc(c.name)}</b><small>${esc((c.items || '').split('\n').join(' + '))}</small></span><span class="num" style="text-align:right"><b>${money(c.price)}</b>${c.separate ? `<small class="up">ahorra ${money(c.separate - c.price)}</small>` : ''}</span></button>`).join('') || '<p class="muted">Sin combos.</p>'}</div>`;
    el.onclick = (e) => {
      const g = (x) => e.target.closest(x); let b;
      if ((b = g('[data-m]'))) { marca = b.dataset.m; return this.render(el); }
      if ((b = g('[data-svc]'))) return planForm(store.get('services', b.dataset.svc));
      if ((b = g('[data-cb]'))) return comboForm(store.get('combos', b.dataset.cb));
      if ((b = g('[data-addplan]'))) return planForm(null, { source: marca, name: b.dataset.addplan });
      const a = g('[data-a]')?.dataset.a;
      if (a === 'crear') crearMenu(); if (a === 'emp') empresaForm(null);
    };
  } };

export const empresas = { id: 'empresas', title: 'Empresas', icon: '🏢', onAdd: () => empresaForm(null),
  render(el) {
    const m = fmt.today().slice(0, 7);
    const st = { activa: '🟢 Activa', pausada: '⏸ Pausada', futura: '📅 Empieza' };
    el.innerHTML = `<div class="grid">${store.list('sources').map((s) => {
      const v = store.list('transactions').filter((t) => t.type === 'ingreso' && (t.date || '').startsWith(m) && store.get('jobs', t.job)?.source === s.id).reduce((a, t) => a + (Number(t.amount) || 0), 0);
      const meta = Number(s.metaMes) || 0;
      return `<button class="card src" data-s="${s.id}" style="--k:${esc(s.color || '#FF8A1F')}"><div class="row" style="justify-content:space-between"><b>${esc(s.name)}</b><span class="chip">${st[s.estado || 'activa']}${s.estado === 'futura' && s.inicio ? ' ' + fmt.date(s.inicio) : ''}</span></div>
        <span class="muted" style="font-size:13px">${store.list('services').filter((x) => x.source === s.id).length} planes · ${store.list('clients').filter((c) => c.source === s.id).length} clientes</span>
        <div class="bar"><i style="width:${meta ? Math.min(100, v / meta * 100) : 0}%;background:var(--k)"></i></div><span class="num" style="font-size:13px">${money(v)}${meta ? ' de ' + money(meta) : ''} este mes</span></button>`; }).join('')}</div>
      <button class="btn btn-create ghost" data-a="new" style="width:100%;margin-top:12px">＋ Nueva empresa</button>`;
    el.onclick = (e) => { const c = e.target.closest('[data-s]'); if (c) return empresaForm(store.get('sources', c.dataset.s)); if (e.target.closest('[data-a=new]')) empresaForm(null); };
  } };
