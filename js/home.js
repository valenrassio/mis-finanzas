/* Inicio: resumen del mes en curso, cómo vienen las metas, los topes más cerca de pasarse
   y los últimos movimientos. Siempre muestra el mes de hoy, no el que se mira en Movimientos. */
(function (MF) {
  'use strict';
  const { $, $$, MONTHS, WEEKDAYS, now, esc, money, signed, store } = MF;
  const { reveal, countTo } = MF.motion;

  const goalsBox = $('#hGoals'), capsBox = $('#hCaps'), movesBox = $('#hMoves');
  const prevGoals = new Map();
  const prevCaps = new Map();

  function greeting() {
    const h = new Date().getHours();
    return h >= 5 && h < 13 ? 'Buen día' : h >= 13 && h < 20 ? 'Buenas tardes' : 'Buenas noches';
  }

  function renderHero() {
    const month = MONTHS[now.getMonth()];
    $('#hGreet').innerHTML = `${greeting()}. Hoy es ${WEEKDAYS[now.getDay()]} ${now.getDate()} de <span class="key">${month}</span>`;
    const s = store.sum(store.inMonth(now.getFullYear(), now.getMonth()));
    countTo($('#hBalance'), s.in - s.out, signed);
    countTo($('#hIn'), s.in, money);
    countTo($('#hOut'), s.out, money);
    countTo($('#hGoalsSaved'), store.db.goals.reduce((a, g) => a + g.saved, 0), money);
  }

  function renderGoals(mode) {
    const active = MF.goals.sorted(store.db.goals).slice(0, 3);
    if (!active.length) {
      goalsBox.innerHTML = `<li class="empty">
        <p class="muted">Todavía no tenés metas.</p>
        <div class="actions"><button type="button" class="ghost pad0" data-act="new-goal">Crear una meta</button></div></li>`;
      prevGoals.clear();
      return;
    }
    goalsBox.innerHTML = active.map(g => MF.goals.rowHtml(g, true)).join('');
    MF.goals.animateFills(goalsBox, prevGoals, mode);
  }

  /* Topes del mes, del más cerca de pasarse al más tranquilo. */
  function renderCaps(mode) {
    const spent = {};
    for (const t of store.inMonth(now.getFullYear(), now.getMonth())) if (t.type === 'out') spent[t.category] = (spent[t.category] || 0) + t.amount;
    const rows = Object.entries(store.db.budgets)
      .filter(([, b]) => b > 0)
      .map(([n, b]) => ({ n, b, s: spent[n] || 0, r: (spent[n] || 0) / b }))
      .sort((a, b) => b.r - a.r)
      .slice(0, 4);
    if (!rows.length) {
      capsBox.innerHTML = '<li class="empty"><p class="muted">Sin topes todavía. Ponelos en <a class="link" href="#categorias">Categorías</a>.</p></li>';
      prevCaps.clear();
      return;
    }
    capsBox.innerHTML = rows.map(r => `
      <li class="goal"><a class="goal-btn" href="#categorias">
        <span class="cat-top">
          <span class="cat-name reveal"><span class="reveal-i">${esc(r.n)}</span></span>
          <span class="cat-amt reveal"><span class="reveal-i">${money(r.s)} <span>de ${money(r.b)}</span></span></span>
        </span>
        <span class="track"><span class="fill" data-to="${Math.min(1, r.r)}" data-key="${esc(r.n)}"></span></span>
        ${r.s > r.b
          ? `<span class="cat-note over">Te pasaste por ${money(r.s - r.b)}</span>`
          : `<span class="cat-note">Te quedan ${money(r.b - r.s)}</span>`}
      </a></li>`).join('');
    MF.goals.animateFills(capsBox, prevCaps, mode);
  }

  function renderMoves() {
    const rows = [...store.db.tx]
      .sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0))
      .slice(0, 6);
    if (!rows.length) {
      movesBox.innerHTML = `<div class="empty">
        <p>Todavía no cargaste nada.</p>
        <p class="muted">Empezá por tu último gasto: tocá el punto azul.</p>
        <div class="actions">
          <button type="button" class="primary sm" data-act="new">Nuevo movimiento</button>
          <button type="button" class="ghost" data-act="sample">Ver con datos de ejemplo</button>
        </div></div>`;
      return;
    }
    movesBox.innerHTML = rows.map(t => `<div class="mask row"><div class="mv">
      <button type="button" class="mv-main" data-edit="${t.id}">
        <span class="mv-txt"><span class="mv-t">${esc(t.note || t.category)}</span>
          <span class="mv-s">${esc(t.category)} · ${MF.movements.dayLabel(t.date)}</span></span>
        <span class="mv-amt ${t.type}">${t.type === 'in' ? '+' : '−'}${money(t.amount)}</span>
      </button></div></div>`).join('');
  }

  movesBox.addEventListener('click', e => {
    const b = e.target.closest('[data-edit]');
    if (b) { const t = store.find(b.dataset.edit); if (t) MF.sheet.open(t); }
  });

  function render(mode) {
    renderHero();
    renderGoals(mode);
    renderCaps(mode);
    renderMoves();
    if (mode !== 'data') {
      reveal($$('.home-grid .reveal-i', $('#view-inicio')), { delay: 0.25, stagger: 0.02 });
      reveal($$('.mask > *', movesBox), { delay: 0.3, stagger: 0.03 });
    }
  }

  MF.home = { render };
})(window.MF = window.MF || {});
