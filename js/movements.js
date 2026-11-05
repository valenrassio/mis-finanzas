/* Movimientos: lista agrupada por día, filtros y búsqueda, editar y borrar. */
(function (MF) {
  'use strict';
  const { $, $$, MONTHS, WEEKDAYS, now, iso, cap, esc, money, plusMinus, store } = MF;
  const { reveal } = MF.motion;

  const box = $('#moveList');

  function dayLabel(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (dateStr === iso(now)) return 'Hoy';
    if (dateStr === iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) return 'Ayer';
    return `${cap(WEEKDAYS[new Date(y, m - 1, d).getDay()])} ${d} de ${MONTHS[m - 1]}`;
  }

  const emptyState = `
    <div class="empty">
      <p>Todavía no cargaste nada.</p>
      <p class="muted">Empezá por tu último gasto: tocá el punto azul o apretá N.</p>
      <div class="actions">
        <button type="button" class="primary sm" data-act="new">Nuevo movimiento</button>
        <button type="button" class="ghost" data-act="sample">Ver con datos de ejemplo</button>
      </div>
    </div>`;

  function rowHtml(t) {
    const title = esc(t.note || t.category);
    return `<div class="mask row"><div class="mv">
      <button type="button" class="mv-main" data-edit="${t.id}">
        <span class="mv-txt"><span class="mv-t">${title}</span>${t.note ? `<span class="mv-s">${esc(t.category)}</span>` : ''}</span>
        <span class="mv-amt ${t.type}">${t.type === 'in' ? '+' : '−'}${money(t.amount)}</span>
      </button>
      <button type="button" class="mv-del" data-del="${t.id}" aria-label="Borrar ${title}">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      </button></div></div>`;
  }

  function render(monthTx, mode) {
    const { view } = store;
    if (!store.db.tx.length) { box.innerHTML = emptyState; return; }

    const q = view.q.trim().toLowerCase();
    const rows = monthTx
      .filter(t => (view.filter === 'all' || t.type === view.filter) && (!q || `${t.note} ${t.category}`.toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0));
    if (!rows.length) {
      box.innerHTML = `<p class="empty">${monthTx.length ? 'Nada coincide con el filtro.' : `Sin movimientos en ${MONTHS[view.m]}.`}</p>`;
      return;
    }

    const groups = [];
    for (const t of rows) {
      const g = groups[groups.length - 1];
      if (g && g.date === t.date) g.items.push(t); else groups.push({ date: t.date, items: [t] });
    }
    box.innerHTML = groups.map(g => {
      const net = g.items.reduce((a, t) => a + (t.type === 'in' ? t.amount : -t.amount), 0);
      return `<div class="mask"><div class="day-h"><span>${dayLabel(g.date)}</span><span>${plusMinus(net)}</span></div></div>`
        + g.items.map(rowHtml).join('');
    }).join('');

    if (mode !== 'data') reveal($$('.mask > *', box).slice(0, 16), { delay: 0.3, stagger: 0.028 });
  }

  function remove(id) {
    const before = store.snapshot();
    store.remove(id);
    store.save();
    MF.render('data');
    MF.toast('Movimiento borrado', () => { store.db = before; store.save(); MF.render('data'); });
  }

  box.addEventListener('click', e => {
    const edit = e.target.closest('[data-edit]');
    if (edit) { const t = store.find(edit.dataset.edit); if (t) MF.sheet.open(t); return; }
    const del = e.target.closest('[data-del]');
    if (del) remove(del.dataset.del);
  });

  // filtros y búsqueda
  $$('.chip').forEach(b => b.addEventListener('click', () => {
    store.view.filter = b.dataset.filter;
    $$('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    render(store.inMonth(store.view.y, store.view.m), 'filter');
  }));
  $('#search').addEventListener('input', e => {
    store.view.q = e.target.value;
    render(store.inMonth(store.view.y, store.view.m), 'data');
  });

  MF.movements = { render, remove };
})(window.MF = window.MF || {});
