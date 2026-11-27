// Tasas de cambio (pesos por 1 USD / 1 EUR). Automáticas una vez al día y editables a mano.
// Se guardan en store('config', 'fx') → iguales en todos tus dispositivos.
import { store, fmt } from './store.js';

export const CURS = ['COP', 'USD', 'EUR'];
const DEF = { USD: 4000, EUR: 4400 };
export const fx = {
  get: () => store.get('config', 'fx') || { id: 'fx', ...DEF, auto: true },
  rate(cur) { if (!cur || cur === 'COP') return 1; return Number(this.get()[cur]) || DEF[cur] || 1; },
  toCOP(v, cur) { return Math.round((Number(v) || 0) * this.rate(cur)); },
  fromCOP(v, cur) { const r = this.rate(cur); return cur === 'COP' ? Math.round(v) : Math.round(((Number(v) || 0) / r) * 100) / 100; },
  set(patch) { store.add('config', { ...this.get(), ...patch, id: 'fx', updated: new Date().toISOString() }); },
  // Busca la tasa del día (si está en automático). Fuente gratuita sin clave; si falla, se queda la última.
  async refresh(force = false) {
    const c = this.get();
    if (!force && (c.auto === false || (c.updated || '').slice(0, 10) === fmt.today())) return c;
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
      const j = await r.json(); const cop = j?.rates?.COP, eur = j?.rates?.EUR;
      if (cop && eur) this.set({ USD: Math.round(cop), EUR: Math.round(cop / eur), auto: true, source: 'automática' });
    } catch {}
    return this.get();
  },
};
export const money = (v, cur = 'COP') => cur === 'COP' ? fmt.money(v)
  : new Intl.NumberFormat('es-CO', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(Number(v) || 0);

// Saldo de cada cuenta en SU moneda (native) y su valor hoy en pesos (cop).
// Un movimiento en la misma moneda de la cuenta usa su valor original; si no, se convierte.
export function balances() {
  const tx = store.list('transactions');
  return store.list('accounts').map((a) => {
    const cur = a.currency || 'COP';
    const val = (t) => (cur === 'COP' ? Number(t.amount) || 0 : (t.currency === cur && t.amountCur != null ? Number(t.amountCur) : fx.fromCOP(t.amount, cur)));
    let n = Number(a.initial) || 0;
    for (const t of tx) {
      if (t.type === 'ingreso' && t.account === a.id) n += val(t);
      if (t.type === 'gasto' && t.account === a.id) n -= val(t);
      if (t.type === 'traslado') { if (t.account === a.id) n -= val(t); if (t.toAccount === a.id) n += val(t); }
    }
    n = cur === 'COP' ? Math.round(n) : Math.round(n * 100) / 100;
    return { ...a, currency: cur, native: n, balance: cur === 'COP' ? n : fx.toCOP(n, cur) };
  });
}
