/* Arranque: dibuja la sección activa, navegación por mes, teclado y animación de entrada.
   MF.render() redibuja la sección que se está viendo; mode = 'intro' | 'view' | 'month' | 'data'. */
(function (MF) {
  'use strict';
  const { $, $$, MONTHS, now, cap, signed, money, store } = MF;
  const { countTo, swapText, reveal, grow } = MF.motion;

  /* ---- Movimientos: balance del mes elegido ---- */
  function renderMonthHero(monthTx) {
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
  }

  function renderMonth(mode) {
    const monthTx = store.inMonth(store.view.y, store.view.m);
    renderMonthHero(monthTx);
    MF.chart.render(monthTx, mode === 'view' ? 'month' : mode);
    MF.categories.render(monthTx, mode);
    MF.movements.render(monthTx, mode);
  }

  /* Lo que se comparte entre secciones: aviso de ejemplo, opciones del menú y datos del menú del celular. */
  function renderShared() {
    $$('[data-sample-notice]').forEach(n => { n.hidden = !store.db.sample; });
    $$('.opt-sample').forEach(b => { b.hidden = store.db.tx.length > 0; });
    const active = store.db.goals.filter(g => !g.done).length;
    MF.nav.setMeta('inicio', `${now.getDate()} de ${MONTHS[now.getMonth()]}`);
    MF.nav.setMeta('movimientos', `${MONTHS[store.view.m]}${store.view.y !== now.getFullYear() ? ` ${store.view.y}` : ''}`);
    MF.nav.setMeta('metas', store.db.goals.length ? `${active} en curso` : '');
    MF.nav.setMeta('categorias', `${store.db.cats.out.length + store.db.cats.in.length}`);
  }

  MF.render = function (mode = 'data') {
    renderShared();
    const v = MF.nav.current();
    if (v === 'inicio') MF.home.render(mode);
    else if (v === 'metas') MF.goals.render(mode);
    else if (v === 'categorias') MF.catManage.render(mode);
    else renderMonth(mode);
  };

  /* ---- meses (en Movimientos) ---- */
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
    if (e.key === 'Escape') {
      if (MF.sheet.isOpen()) MF.sheet.close();
      else if (MF.nav.isDrawerOpen()) MF.nav.closeDrawer();
      else MF.menu.close();
      return;
    }
    const typing = e.target.closest('input, textarea, select, [contenteditable]');
    if (typing || MF.sheet.isOpen() || MF.nav.isDrawerOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      if (MF.nav.current() === 'metas') MF.sheet.openGoal(); else MF.sheet.open();
    }
    if (MF.nav.current() === 'movimientos') {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    }
  });

  /* ---- entrada ---- */
  store.init();
  const { y, m } = store.view;
  $('#monthLabel').textContent = `${cap(MONTHS[m])} ${y}`;
  $('#heroMonth').textContent = MONTHS[m];
  MF.nav.init();
  const v = MF.nav.current();
  grow($('#brandDot'));
  reveal([$('#viewName'), ...$$(`#view-${v} .hero .reveal-i, #view-${v} .month .reveal-i`)], { delay: 0.05, stagger: 0.045 });
  grow($('#fab'), { delay: 0.55 });
  MF.render('intro');
})(window.MF = window.MF || {});
