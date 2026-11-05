/* Navegación entre secciones (#inicio, #movimientos, #metas, #categorias).
   En la compu: links en el encabezado y el punto marca dónde estás.
   En el celular: menú de hamburguesa que se despliega a pantalla completa. */
(function (MF) {
  'use strict';
  const { $, $$, lerp, clamp } = MF;
  const { animate, reveal, swapText, unfold, reduceMQ } = MF.motion;

  const VIEWS = ['inicio', 'movimientos', 'metas', 'categorias'];
  const NAMES = { inicio: 'Inicio', movimientos: 'Movimientos', metas: 'Metas', categorias: 'Categorías' };

  const topbar = $('#topbar'), drawer = $('#drawer'), burger = $('#burger'), navDot = $('#navDot'), fab = $('#fab');
  let current = null;
  let drawerOpen = false;
  const dot = { x: null };

  const fromHash = () => { const h = decodeURIComponent(location.hash.slice(1)); return VIEWS.includes(h) ? h : 'inicio'; };

  /* ---- punto de la sección activa (compu) ---- */
  function placeDot(animated) {
    const a = $(`.nav [data-view-link="${current}"]`);
    if (!a || !a.offsetWidth) return;
    const to = a.offsetLeft + a.offsetWidth / 2;
    const from = dot.x;
    dot.x = to;
    if (!animated || from === null) { navDot.style.transform = `translateX(${to}px)`; return; }
    animate(navDot, { w: 16, update: p => { navDot.style.transform = `translateX(${lerp(from, to, p)}px)`; } });
  }

  /* ---- cambiar de sección ---- */
  function show(v, { intro = false } = {}) {
    const prev = current;
    if (prev === v && !intro) return;
    current = v;
    VIEWS.forEach(x => { $(`#view-${x}`).hidden = x !== v; });
    $$('[data-view-link]').forEach(a => {
      if (a.dataset.viewLink === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    fab.setAttribute('aria-label', v === 'metas' ? 'Nueva meta (N)' : 'Nuevo movimiento (N)');
    document.title = v === 'inicio' ? 'Mis finanzas' : `${NAMES[v]} · Mis finanzas`;
    placeDot(!!prev);
    if (intro) { $('#viewName').textContent = NAMES[v]; return; }

    const dir = VIEWS.indexOf(v) >= VIEWS.indexOf(prev) ? 1 : -1;
    swapText($('#viewName'), NAMES[v], dir);
    window.scrollTo(0, 0);
    reveal($$(`#view-${v} .hero .reveal-i, #view-${v} .month .reveal-i`), { delay: 0.04, stagger: 0.04 });
    MF.render('view');
  }

  function go(v) {
    if (location.hash.slice(1) === v) show(v); else location.hash = v;
  }

  window.addEventListener('hashchange', () => { closeDrawer(); show(fromHash()); });
  // Tocar el link de la sección en la que ya estás también cierra el menú.
  document.addEventListener('click', e => { if (e.target.closest('#drawer [data-view-link]')) closeDrawer(); });

  /* ---- encabezado con línea al hacer scroll ---- */
  const onScroll = () => topbar.classList.toggle('scrolled', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- hamburguesa ---- */
  const [l1, l2] = $$('span', burger);
  function paintBurger(p) {
    l1.style.transform = `translateY(${lerp(-4, 0, p)}px) rotate(${45 * p}deg)`;
    l2.style.transform = `translateY(${lerp(4, 0, p)}px) rotate(${-45 * p}deg)`;
  }
  let burgerP = 0;
  function morphBurger(to) {
    const from = burgerP;
    burgerP = to;
    animate(burger, { w: 16, update: p => paintBurger(lerp(from, to, p)) });
  }

  function openDrawer() {
    if (drawerOpen) return;
    drawerOpen = true;
    MF.menu && MF.menu.close();
    drawer.style.paddingTop = `${topbar.getBoundingClientRect().bottom}px`;
    drawer.hidden = false;
    drawer.scrollTop = 0;
    document.documentElement.classList.add('drawer-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Cerrar menú');
    $('#main').inert = true;
    fab.inert = true;
    morphBurger(1);
    unfold(drawer, { w: 13 });
    reveal($$('.drawer-nav .reveal-i', drawer), { delay: 0.08, stagger: 0.045 });
    $$('.drawer-opts .opt', drawer).forEach((el, i) => unfold(el, { delay: 0.25 + i * 0.03 }));
  }

  function closeDrawer(instant) {
    if (!drawerOpen) return;
    drawerOpen = false;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menú');
    document.documentElement.classList.remove('drawer-open');
    $('#main').inert = false;
    fab.inert = false;
    morphBurger(0);
    const done = () => { drawer.hidden = true; drawer.style.clipPath = ''; };
    if (instant || reduceMQ.matches) { done(); return; }
    animate(drawer.__k_unfold || (drawer.__k_unfold = {}), {
      dur: 0.32, ease: 'in',
      update: p => { drawer.style.clipPath = `inset(0 0 ${clamp(p, 0, 1) * 100}% 0)`; },
      done,
    });
  }

  burger.addEventListener('click', () => (drawerOpen ? closeDrawer() : openDrawer()));
  window.addEventListener('resize', () => {
    placeDot(false);
    if (drawerOpen && getComputedStyle(burger).display === 'none') closeDrawer(true);
  });

  /* Datos chiquitos al costado de cada sección en el menú del celular. */
  function setMeta(view, text) {
    const el = $(`#drawer [data-meta="${view}"]`);
    if (el) el.textContent = text;
  }

  function init() {
    show(fromHash(), { intro: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => placeDot(false));
  }

  MF.nav = {
    VIEWS, NAMES, init, go, setMeta,
    current: () => current,
    closeDrawer, openDrawer,
    isDrawerOpen: () => drawerOpen,
  };
})(window.MF = window.MF || {});
