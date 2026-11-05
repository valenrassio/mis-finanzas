/* "En qué se va": gastos por categoría, con tope mensual opcional. */
(function (MF) {
  'use strict';
  const { $, $$, MONTHS, esc, money, nf, lerp, parseAmount, store } = MF;
  const { animate, reveal } = MF.motion;

  const list = $('#catList');
  const prevFill = new Map(); // ancho anterior de cada barra, para transformarla en vez de redibujarla

  function rowsFor(monthTx) {
    const spent = {};
    for (const t of monthTx) if (t.type === 'out') spent[t.category] = (spent[t.category] || 0) + t.amount;
    const budgets = store.db.budgets;
    const names = new Set([...Object.keys(spent), ...Object.keys(budgets).filter(k => budgets[k] > 0)]);
    return [...names]
      .map(n => ({ n, s: spent[n] || 0, b: budgets[n] || 0 }))
      .sort((a, b) => b.s - a.s || b.b - a.b);
  }

  function noteFor(r, total) {
    if (r.b && r.s > r.b) return `<span class="cat-note over">Te pasaste por ${money(r.s - r.b)}</span>`;
    if (r.b) return `<span class="cat-note">Te quedan ${money(r.b - r.s)}</span>`;
    return `<span class="cat-note">${Math.round((r.s / total) * 100)}% de tus gastos</span>`;
  }

  function render(monthTx, mode) {
    const rows = rowsFor(monthTx);
    if (!rows.length) { list.innerHTML = `<li class="empty-li">Sin gastos en ${MONTHS[store.view.m]}.</li>`; return; }
    const total = rows.reduce((a, r) => a + r.s, 0) || 1;
    const scale = Math.max(...rows.map(r => Math.max(r.s, r.b)));

    list.innerHTML = rows.map(r => `
      <li data-cat="${esc(r.n)}"><button class="cat" type="button" data-cat-btn="${esc(r.n)}">
        <span class="cat-top">
          <span class="cat-name reveal"><span class="reveal-i">${esc(r.n)}</span></span>
          <span class="cat-amt reveal"><span class="reveal-i">${money(r.s)}${r.b ? ` <span>de ${money(r.b)}</span>` : ''}</span></span>
        </span>
        <span class="track"><span class="fill"></span>${r.b ? `<span class="tick" style="left:${(r.b / scale) * 100}%"></span>` : ''}</span>
        ${noteFor(r, total)}
      </button></li>`).join('');

    $$('.fill', list).forEach((fill, i) => {
      const r = rows[i];
      const to = r.s / scale;
      const from = mode === 'data' ? (prevFill.get(r.n) ?? 0) : 0;
      fill.style.transform = `scaleX(${from})`;
      animate(fill, {
        delay: mode === 'data' ? 0 : 0.3 + i * 0.045, w: 13,
        update: p => { fill.style.transform = `scaleX(${Math.max(0, lerp(from, to, p))})`; },
      });
    });
    prevFill.clear();
    rows.forEach(r => prevFill.set(r.n, r.s / scale));
    if (mode !== 'data') reveal($$('.reveal-i', list), { delay: 0.2, stagger: 0.025 });
  }

  /* Formulario inline para el tope de una categoría. */
  function editBudget(name) {
    const li = $(`li[data-cat="${CSS.escape(name)}"]`, list);
    if (!li || $('.cat-edit', li)) return;
    $$('.cat-edit').forEach(f => f.remove());
    const current = store.db.budgets[name];
    const f = document.createElement('form');
    f.className = 'cat-edit';
    f.innerHTML = `
      <input class="line-input" id="budget-input" inputmode="decimal" placeholder="Tope mensual para ${esc(name)}"
        aria-label="Tope mensual para ${esc(name)}" value="${current ? nf.format(current) : ''}">
      <button type="submit" class="primary sm">Guardar</button>
      ${current ? '<button type="button" class="ghost" data-clear>Quitar</button>' : ''}`;
    li.appendChild(f);

    const h = f.scrollHeight;
    f.style.height = '0px';
    animate(f, { w: 14, update: p => { f.style.height = `${Math.max(0, h * p)}px`; }, done: () => { f.style.height = ''; } });

    const input = $('input', f);
    input.focus();
    const commit = v => { store.setBudget(name, v); store.save(); MF.render('data'); };
    f.addEventListener('submit', e => { e.preventDefault(); commit(parseAmount(input.value) || 0); });
    f.addEventListener('click', e => { if (e.target.closest('[data-clear]')) commit(0); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); f.remove(); } });
  }

  list.addEventListener('click', e => {
    const btn = e.target.closest('[data-cat-btn]');
    if (btn) editBudget(btn.dataset.catBtn);
  });

  MF.categories = { render };
})(window.MF = window.MF || {});
