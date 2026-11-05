/* Arranque: encabezado del balance, navegación por mes, teclado y animación de entrada.
   MF.render() redibuja todo; mode = 'intro' | 'month' | 'data'. */
(function (MF) {
  'use strict';
  const { $, $$, MONTHS, cap, signed, money, store } = MF;
  const { countTo, swapText, reveal, grow } = MF.motion;

  function renderHero(monthTx) {
    const { view } = store;
    const s = store.sum(monthTx);
    const net = s.in - s.out;
    const pv = store.shift(view.y, view.m, -1);
    const ps = store.sum(store.inMonth(pv.y, pv.m));

    countTo($('#balance'), net, signed);
    countTo($('#sIn'), s.in, money);
    countTo($('#sOut'), s.out, money);
    $('#sSave').textContent = s.in > 0 ? `${Math.round((net / s.in) * 100)}%` : '—';

    const cmp = $('#sOutCmp');
    if (s.out > 0 && ps.out > 0) {
      const d = Math.round(((s.out - ps.out) / ps.out) * 100);
      cmp.textContent = `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d)}% vs ${MONTHS[pv.m]}`;
    } else cmp.textContent = '';

    $('#notice').hidden = !store.db.sample;
    $('#menuSample').hidden = store.db.tx.length > 0;
  }

  MF.render = function (mode = 'data') {
    const monthTx = store.inMonth(store.view.y, store.view.m);
    renderHero(monthTx);
    MF.chart.render(monthTx, mode);
    MF.categories.render(monthTx, mode);
    MF.movements.render(monthTx, mode);
  };

  /* ---- meses ---- */
  function syncMonthLabels(dir = 1) {
    const { y, m } = store.view;
    swapText($('#monthLabel'), `${cap(MONTHS[m])} ${y}`, dir);
    swapText($('#heroMonth'), MONTHS[m], dir);
  }

  MF.goToMonth = function (y, m) {
    const { view } = store;
    const dir = y * 12 + m >= view.y * 12 + view.m ? 1 : -1;
    view.y = y;
    view.m = m;
    syncMonthLabels(dir);
    MF.render('month');
  };
  const step = delta => { const n = store.shift(store.view.y, store.view.m, delta); MF.goToMonth(n.y, n.m); };
  $('#prevM').addEventListener('click', () => step(-1));
  $('#nextM').addEventListener('click', () => step(1));

  /* ---- teclado ---- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (MF.sheet.isOpen()) MF.sheet.close(); else MF.menu.close(); return; }
    const typing = e.target.closest('input, textarea, select, [contenteditable]');
    if (typing || MF.sheet.isOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); MF.sheet.open(); }
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* ---- entrada ---- */
  store.init();
  const { y, m } = store.view;
  $('#monthLabel').textContent = `${cap(MONTHS[m])} ${y}`;
  $('#heroMonth').textContent = MONTHS[m];
  grow($('#brandDot'));
  reveal([$('#monthLabel'), ...$$('.hero .reveal-i')], { delay: 0.05, stagger: 0.045 });
  grow($('#fab'), { delay: 0.55 });
  MF.render('intro');
})(window.MF = window.MF || {});
