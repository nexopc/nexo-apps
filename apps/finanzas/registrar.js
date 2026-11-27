// Registrar un movimiento en 3 toques: ¿Qué? → ¿Cuánto? (botones que suman) → ¿De dónde?
// - Moneda en cada movimiento (COP / USD / EUR): se guarda el valor original y su equivalente en pesos.
// - ＋ Cuenta / tarjeta: se crea ahí mismo, sin salir.
// - Teclado solo si el monto es raro (⌨).
import { store, fmt, esc, h, toast, sheet, prefs } from '../../core/shell.js';
import { fx, money, CURS } from '../../core/fx.js';

export const CATS = {
  gasto: [['Comida', '🍔'], ['Transporte', '🚌'], ['Datos', '📱'], ['Estudio', '📚'], ['Herramientas', '🛠'], ['Equipos', '🖥'], ['Publicidad', '📣'], ['Servicios', '💡'], ['Suscripciones', '🔁'], ['Ocio', '🎮'], ['Salud', '💊'], ['Familia', '🏠'], ['Otro', '•']],
  ingreso: [['Cliente', '💼'], ['Anticipo', '🤝'], ['Venta', '🛒'], ['Salario tienda', '🏪'], ['Regalo', '🎁'], ['Alcancía', '🪙'], ['Otro', '•']],
  traslado: [['Traslado', '⇄']],
};
const STEPS = { COP: [1000, 2000, 5000, 10000, 20000, 50000], USD: [1, 5, 10, 20, 50, 100], EUR: [1, 5, 10, 20, 50, 100] };
const short = (v, cur) => (cur === 'COP' ? (v >= 1000 ? v / 1000 + 'k' : v) : v);
const TITLE = { gasto: '− Gasto', ingreso: '＋ Ingreso', traslado: '⇄ Mover plata' };
const ACC_ICON = { Efectivo: '💵', 'Tarjeta de crédito': '💳', 'Tarjeta débito': '💳', 'Billetera digital': '📲', Ahorro: '🐷', Negocio: '💼', Personal: '🏦' };
export const accIcon = (a) => ACC_ICON[a?.kind] || '🏦';

export function registrar(type = 'gasto', rec = null) {
  const st = rec
    ? { type: rec.type, cat: rec.category || '', cur: rec.currency || 'COP', val: rec.currency && rec.currency !== 'COP' ? Number(rec.amountCur) || 0 : Number(rec.amount) || 0, acc: rec.account || '', to: rec.toAccount || '', title: rec.title || '', date: rec.date || fmt.today() }
    : { type, cat: type === 'traslado' ? 'Traslado' : '', cur: prefs.get('fin:cur', 'COP'), val: 0, acc: prefs.get('fin:acc:' + type, '') || store.list('accounts')[0]?.id || '', to: '', title: '', date: fmt.today() };
  let keypad = false, detail = !!rec;
  const body = h('<div class="reg3"></div>');
  const s = sheet(rec ? 'Editar movimiento' : TITLE[st.type], body);

  const accChips = (sel, key) => store.list('accounts').map((a) => `<button type="button" class="pick ${sel === a.id ? 'on' : ''}" data-${key}="${a.id}">${accIcon(a)} ${esc(a.name)}${a.currency && a.currency !== 'COP' ? ' · ' + a.currency : ''}</button>`).join('')
    + `<button type="button" class="pick add" data-newacc="${key}">＋ Cuenta / tarjeta</button>`;
  const paint = () => {
    const cats = CATS[st.type] || CATS.gasto;
    const cop = fx.toCOP(st.val, st.cur);
    body.innerHTML = `
      ${rec ? `<div class="seg" data-g="type">${['gasto', 'ingreso', 'traslado'].map((k) => `<button type="button" data-v="${k}" aria-pressed="${st.type === k}">${TITLE[k]}</button>`).join('')}</div>` : ''}
      ${st.type !== 'traslado' ? `<section><h4>1 · ¿Qué?</h4><div class="picks">${cats.map(([c, i]) => `<button type="button" class="pick ${st.cat === c ? 'on' : ''}" data-cat="${esc(c)}">${i} ${esc(c)}</button>`).join('')}</div></section>` : ''}
      <section><div class="row" style="justify-content:space-between"><h4>${st.type === 'traslado' ? '1' : '2'} · ¿Cuánto?</h4>
        <div class="seg sm" data-g="cur">${CURS.map((c) => `<button type="button" data-v="${c}" aria-pressed="${st.cur === c}">${c}</button>`).join('')}</div></div>
        <div class="amt num">${money(st.val, st.cur)}</div>
        ${st.cur !== 'COP' ? `<div class="muted num" style="margin:-4px 0 8px;font-size:13px">≈ ${fmt.money(cop)} · 1 ${st.cur} = ${fmt.money(fx.rate(st.cur))}</div>` : ''}
        ${keypad ? `<input class="kp" type="number" inputmode="decimal" step="any" min="0" value="${st.val || ''}" placeholder="Escribe el valor">` : ''}
        <div class="picks steps">${STEPS[st.cur].map((v) => `<button type="button" class="pick" data-plus="${v}">+${short(v, st.cur)}</button>`).join('')}
          <button type="button" class="pick ${keypad ? 'on' : ''}" data-a="kp" aria-label="Teclado">⌨</button><button type="button" class="pick" data-a="reset" aria-label="Volver a cero">↺</button></div></section>
      <section><h4>${st.type === 'traslado' ? '2 · Sale de' : '3 · ¿De dónde?'}${st.type === 'ingreso' ? ' (entra a)' : ''}</h4><div class="picks">${accChips(st.acc, 'acc')}</div></section>
      ${st.type === 'traslado' ? `<section><h4>3 · Entra a</h4><div class="picks">${accChips(st.to, 'to')}</div></section>` : ''}
      ${detail ? `<section class="det"><div class="field"><label for="rt">Detalle (opcional)</label><input id="rt" value="${esc(st.title)}" placeholder="${esc(st.cat || 'Concepto')}"></div>
        <div class="field"><label for="rd">Fecha</label><input id="rd" type="date" value="${esc(st.date)}"></div></section>` : `<button type="button" class="linkish" data-a="det">＋ Detalle o fecha</button>`}
      <div class="row end">${rec ? '<button type="button" class="btn btn-delete ghost" data-a="del">🗑</button>' : ''}
        <button type="button" class="btn ${st.type === 'gasto' ? 'btn-delete' : st.type === 'ingreso' ? 'btn-create' : 'btn-edit'} save" data-a="save" style="flex:1">✓ ${rec ? 'Guardar cambios' : 'Guardar ' + (st.type === 'traslado' ? 'traslado' : st.type)}</button></div>`;
    const kp = body.querySelector('.kp');
    if (kp) { kp.oninput = () => { st.val = Number(kp.value) || 0; const a = body.querySelector('.amt'); if (a) a.textContent = money(st.val, st.cur); }; }
  };
  const readDetail = () => { const t = body.querySelector('#rt'); if (t) st.title = t.value.trim(); const d = body.querySelector('#rd'); if (d && d.value) st.date = d.value; };
  const newAccount = (key) => {
    readDetail();
    const f = h(`<form class="form"><div class="field"><label for="na">Nombre</label><input id="na" placeholder="Nequi, Bancolombia, Tarjeta Nu…" autocomplete="off"></div>
      <div class="field"><label>Tipo</label><div class="seg" data-g="k">${['Efectivo', 'Billetera digital', 'Tarjeta débito', 'Tarjeta de crédito', 'Ahorro'].map((k, i) => `<button type="button" data-v="${k}" aria-pressed="${i === 1}">${ACC_ICON[k]} ${k}</button>`).join('')}</div></div>
      <div class="field"><label>Moneda</label><div class="seg" data-g="c">${CURS.map((c, i) => `<button type="button" data-v="${c}" aria-pressed="${i === 0}">${c}</button>`).join('')}</div></div>
      <div class="field"><label for="ni">Saldo que tiene hoy</label><input id="ni" type="number" inputmode="decimal" step="any" value="0"></div>
      <div class="row end"><button class="btn btn-create">＋ Crear y usar</button></div></form>`);
    const s2 = sheet('Nueva cuenta o tarjeta', f);
    f.addEventListener('click', (e) => { const b = e.target.closest('[data-g] [data-v]'); if (b) b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b)); });
    f.addEventListener('submit', (e) => { e.preventDefault();
      const name = f.querySelector('#na').value.trim(); if (!name) { toast('Ponle un nombre'); return; }
      const pick = (g) => f.querySelector(`[data-g=${g}] [aria-pressed=true]`)?.dataset.v;
      const a = store.add('accounts', { name, kind: pick('k'), currency: pick('c') || 'COP', initial: Number(f.querySelector('#ni').value) || 0 });
      st[key] = a.id; toast('Cuenta creada: ' + name); s2.close(); setTimeout(paint, 50); });
  };
  const save = () => {
    readDetail();
    if (!st.val) return toast('Falta: ¿cuánto?');
    if (st.type !== 'traslado' && !st.cat) return toast('Falta: ¿qué fue?');
    if (!st.acc) return toast('Falta: ¿de qué cuenta?');
    if (st.type === 'traslado' && (!st.to || st.to === st.acc)) return toast('Elige a qué cuenta entra');
    const data = { type: st.type, amount: fx.toCOP(st.val, st.cur), currency: st.cur, amountCur: st.cur === 'COP' ? null : st.val,
      title: st.title || st.cat || 'Traslado', category: st.type === 'traslado' ? 'Otro' : st.cat, account: st.acc, toAccount: st.type === 'traslado' ? st.to : '', date: st.date };
    rec ? store.update('transactions', rec.id, data) : store.add('transactions', data);
    prefs.set('fin:acc:' + st.type, st.acc); prefs.set('fin:cur', st.cur);
    navigator.vibrate?.(12); toast(rec ? 'Cambios guardados' : `${st.type === 'gasto' ? 'Gasto' : st.type === 'ingreso' ? 'Ingreso' : 'Traslado'} guardado: ${money(st.val, st.cur)}`); s.close();
  };
  body.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const g = t.closest('[data-g]')?.dataset.g;
    if (g === 'type') { readDetail(); st.type = t.dataset.v; if (st.type === 'traslado') st.cat = 'Traslado'; else if (!CATS[st.type].some(([c]) => c === st.cat)) st.cat = ''; return paint(); }
    if (g === 'cur') { if (st.cur !== t.dataset.v) { st.val = 0; st.cur = t.dataset.v; } return paint(); }
    const d = t.dataset;
    if (d.cat) { st.cat = d.cat; return paint(); }
    if (d.plus) { st.val = Math.round((st.val + Number(d.plus)) * 100) / 100; navigator.vibrate?.(6); return paint(); }
    if (d.acc) { st.acc = d.acc; return paint(); }
    if (d.to) { st.to = d.to; return paint(); }
    if (d.newacc) return newAccount(d.newacc);
    if (d.a === 'kp') { keypad = !keypad; paint(); if (keypad) setTimeout(() => body.querySelector('.kp')?.focus(), 30); return; }
    if (d.a === 'reset') { st.val = 0; return paint(); }
    if (d.a === 'det') { detail = true; return paint(); }
    if (d.a === 'save') return save();
    if (d.a === 'del') { store.remove('transactions', rec.id); toast('Movimiento borrado'); s.close(); }
  });
  paint();
  return s;
}
