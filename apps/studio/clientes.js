// 👥 Clientes desde Studio (son los mismos de NEXO Negocios: se crean una vez y salen en las dos apps)
import { store, esc, h, toast, sheet, confirmSheet } from '../../core/shell.js';
import { colorCli, iniciales } from './datos.js';

const PAL = ['#FF4F9A', '#00E5FF', '#FFC23D', '#1CE783', '#9B7BFF', '#FF8A1F', '#5FB7FF', '#FF6A6A'];
export function crearCliente(after = () => {}, edit = null) {
  const c = edit ? store.get('clients', edit) : null;
  let color = c?.color || PAL.find((p) => !store.list('clients').some((x) => x.color === p)) || PAL[0];
  const f = h(`<form class="form" novalidate>
    <div class="field"><label for="cn">Nombre del cliente o negocio</label><input id="cn" value="${esc(c?.name || '')}" placeholder="Barbería Flow" autocomplete="off"></div>
    <div class="field"><label for="cw">WhatsApp (opcional)</label><input id="cw" inputmode="tel" value="${esc(c?.contact || '')}" placeholder="300 555 1234"></div>
    <div class="field"><label for="cg">Tipo de negocio (opcional)</label><input id="cg" value="${esc(c?.negocio || '')}" placeholder="Barbería, ferretería, restaurante…"></div>
    <div class="field"><label>Color en Studio</label><div class="cols">${PAL.map((p) => `<button type="button" class="colb ${p === color ? 'on' : ''}" data-col="${p}" style="background:${p}" aria-label="Color ${p}"></button>`).join('')}</div></div>
    <div class="row end">${c ? '<button type="button" class="btn btn-delete ghost" data-a="del">🗑</button>' : ''}<button class="btn btn-create">${c ? '✓ Guardar' : '＋ Crear cliente'}</button></div>
    <p class="muted" style="font-size:12px;margin:0">Es el mismo cliente de NEXO Negocios: ahí le puedes cotizar y cobrar.</p></form>`);
  const s = sheet(c ? '👥 ' + c.name : '👥 Nuevo cliente', f);
  f.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-col]'); if (b) { color = b.dataset.col; f.querySelectorAll('[data-col]').forEach((x) => x.classList.toggle('on', x === b)); return; }
    if (e.target.closest('[data-a=del]') && await confirmSheet('¿Borrar cliente?', `${c.name} se borra también de Negocios. Sus videos quedan sin cliente.`, { yes: 'Borrar', danger: true })) { store.remove('clients', c.id); s.close(); after(null); }
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault(); const name = f.querySelector('#cn').value.trim(); if (!name) return toast('Escribe el nombre');
    const data = { name, contact: f.querySelector('#cw').value.trim(), negocio: f.querySelector('#cg').value.trim(), color };
    const r = c ? store.update('clients', c.id, data) : store.add('clients', data);
    toast(c ? '✓ Guardado' : '👥 Cliente creado'); s.close(); after(r);
  });
  setTimeout(() => f.querySelector('#cn').focus(), 300);
  return s;
}
export const clientesMod = { id: 'clientes', title: 'Clientes', icon: '👥', onAdd: () => crearCliente(),
  render(el) {
    const cs = store.list('clients').sort((a, b) => a.name.localeCompare(b.name));
    el.innerHTML = cs.length ? `<div class="list">${cs.map((c) => { const n = store.list('videos').filter((v) => v.client === c.id); return `<button class="list-item" data-c="${c.id}"><span class="avc" style="--k:${esc(colorCli(c.id))}">${esc(iniciales(c.name))}</span><div class="li-main"><div class="li-title">${esc(c.name)}</div><div class="li-sub">${n.length} video(s)${n.filter((v) => v.status !== 'publicado').length ? ' · ' + n.filter((v) => v.status !== 'publicado').length + ' en producción' : ''}${c.negocio ? ' · ' + esc(c.negocio) : ''}</div></div></button>`; }).join('')}</div>`
      : '<div class="empty"><b>Sin clientes</b>Toca ＋ para crear el primero. También aparecen los que crees en NEXO Negocios.</div>';
    el.onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) crearCliente(() => {}, b.dataset.c); };
  } };
