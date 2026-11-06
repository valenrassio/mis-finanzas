/* Formulario de movimiento o de meta. El punto azul se abre como un círculo y se convierte en el formulario;
   al cerrar, el formulario vuelve a ser el punto. */
(function (MF) {
  'use strict';
  const { $, $$, now, iso, esc, clamp, lerp, nf, parseAmount, store } = MF;
  const { animate, reveal, grow, unfold, reduceMQ } = MF.motion;

  const wrap = $('#sheetWrap'), sheet = $('#sheet'), flood = $('#flood'), scrim = $('#scrim'), fab = $('#fab');
  const fAmount = $('#fAmount'), fDate = $('#fDate'), fNote = $('#fNote'), fErr = $('#fErr');
  const gName = $('#gName'), gTarget = $('#gTargetIn'), gSaved = $('#gSavedIn'), gDate = $('#gDate'), gErr = $('#gErr');
  const segThumb = $('#segThumb');

  // mode: 'move' (movimiento) o 'goal' (meta). editing: el objeto que se edita, o null si es nuevo.
  const form = { mode: 'move', type: 'out', cat: null, editing: null };
  let isOpen = false;
  const thumb = { x: 0, w: 0 };

  /* ---- tipo y categoría ---- */
  function mostUsed(type) {
    const cats = store.cats(type);
    const count = {};
    for (const t of store.db.tx) if (t.type === type) count[t.category] = (count[t.category] || 0) + 1;
    const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    return top && cats.includes(top[0]) ? top[0] : cats[0];
  }

  function renderChips() {
    $('#fCats').innerHTML = store.cats(form.type)
      .map(c => `<button type="button" data-chip="${esc(c)}" aria-pressed="${c === form.cat}">${MF.swatch(form.type, c)}${esc(c)}</button>`).join('');
  }

  function setType(type, animated = true) {
    form.type = type;
    $$('#seg button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.type === type)));
    const b = $(`#seg button[data-type="${type}"]`);
    const to = { x: b.offsetLeft, w: b.offsetWidth };
    const from = { x: thumb.x, w: thumb.w || to.w };
    Object.assign(thumb, to);
    const paint = (x, w) => { segThumb.style.transform = `translateX(${x}px)`; segThumb.style.width = `${w}px`; };
    if (!animated) paint(to.x, to.w);
    else animate(segThumb, { w: 18, update: p => paint(lerp(from.x, to.x, p), lerp(from.w, to.w, p)) });
    if (!store.cats(type).includes(form.cat)) form.cat = mostUsed(type);
    renderChips();
  }

  $('#seg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setType(b.dataset.type); });
  $('#fCats').addEventListener('click', e => {
    const b = e.target.closest('[data-chip]');
    if (!b) return;
    form.cat = b.dataset.chip;
    $$('#fCats button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  });

  /* Fecha por defecto: hoy si se ve el mes actual; si no, un día dentro del mes visible. */
  function defaultDate() {
    const { y, m } = store.view;
    if (MF.nav.current() !== 'movimientos' || (y === now.getFullYear() && m === now.getMonth())) return iso(now);
    return iso(new Date(y, m, 1) > now ? new Date(y, m, 1) : new Date(y, m + 1, 0));
  }

  /* Centro del punto relativo al panel y radio que pasa las cuatro esquinas. */
  function geom() {
    const r = sheet.getBoundingClientRect(), f = fab.getBoundingClientRect();
    const cx = f.left + f.width / 2 - r.left, cy = f.top + f.height / 2 - r.top;
    const R = Math.hypot(Math.max(cx, r.width - cx), Math.max(cy, r.height - cy)) + 8;
    return { cx, cy, R, r0: f.width / 2 };
  }

  function fillMove(tx, opts = {}) {
    $('#sheetTitle').textContent = tx ? 'Editar movimiento' : 'Nuevo movimiento';
    fAmount.value = tx ? String(tx.amount).replace('.', ',') : '';
    fDate.value = tx ? tx.date : (opts.date || defaultDate());
    fNote.value = tx ? tx.note || '' : '';
    fErr.textContent = '';
    form.cat = tx ? tx.category : null;
  }

  function fillGoal(g) {
    $('#sheetTitle').textContent = g ? 'Editar meta' : 'Nueva meta';
    gName.value = g ? g.name : '';
    gTarget.value = g ? nf.format(g.target) : '';
    gSaved.value = g && g.saved ? nf.format(g.saved) : '';
    gDate.value = g ? g.deadline || '' : '';
    $('#gSavedLbl').textContent = g ? 'Ahorrado hasta ahora' : 'Ya tengo (opcional)';
    gErr.textContent = '';
  }

  function openWith(mode, item, opts = {}) {
    if (isOpen) return;
    isOpen = true;
    MF.menu && MF.menu.close();
    MF.nav && MF.nav.closeDrawer(true);
    form.mode = mode;
    form.editing = item || null;
    $$('.sheet-body', sheet).forEach(b => { b.hidden = b.dataset.mode !== mode; });
    $('#fDelete').hidden = !item;
    if (mode === 'goal') fillGoal(item); else fillMove(item, opts);
    wrap.hidden = false;
    sheet.scrollTop = 0;
    if (mode === 'move') { thumb.w = 0; setType(item ? item.type : 'out', false); }
    $('#main').inert = true;

    const { cx, cy, R, r0 } = geom();
    const clip = rad => { sheet.style.clipPath = `circle(${rad}px at ${cx}px ${cy}px)`; };
    clip(r0);
    flood.style.opacity = 1;
    scrim.style.opacity = 0;
    fab.style.visibility = 'hidden';
    animate('sheet', {
      w: 10, dur: 1.1,
      update: p => {
        clip(Math.max(r0, lerp(r0, R, p)));
        flood.style.opacity = clamp(1 - (p - 0.06) / 0.4, 0, 1);
        scrim.style.opacity = clamp(p, 0, 1);
      },
      done: () => { sheet.style.clipPath = ''; flood.style.opacity = 0; },
    });
    reveal($$('.sheet-h .reveal-i, .sheet-body:not([hidden]) .reveal-i', sheet), { delay: 0.16, stagger: 0.03 });
    [...$$('.sheet-body:not([hidden]) > *', sheet), $('.sheet-f')].forEach((el, i) => unfold(el, { delay: 0.2 + i * 0.05 }));
    const first = mode === 'goal' ? gName : fAmount;
    setTimeout(() => first.focus({ preventScroll: true }), reduceMQ.matches ? 0 : 280);
  }

  function close(after) {
    if (!isOpen) return;
    isOpen = false;
    const { cx, cy, R, r0 } = geom();
    const clip = rad => { sheet.style.clipPath = `circle(${rad}px at ${cx}px ${cy}px)`; };
    animate('sheet', {
      dur: 0.42, ease: 'in',
      update: p => {
        clip(lerp(R, r0, p));
        flood.style.opacity = clamp((p - 0.5) / 0.35, 0, 1);
        scrim.style.opacity = 1 - p;
      },
      done: () => {
        wrap.hidden = true;
        sheet.style.clipPath = '';
        fab.style.visibility = '';
        $('#main').inert = false;
        grow(fab, { from: 0.86 });
        fab.focus({ preventScroll: true });
        if (after) after();
      },
    });
  }

  /* ---- guardar ---- */
  function saveMove() {
    const amount = parseAmount(fAmount.value);
    if (!(amount > 0)) { fErr.textContent = 'Ingresá un monto mayor a cero.'; fAmount.focus(); return; }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(fDate.value) ? fDate.value : iso(now);
    const data = { type: form.type, amount, category: form.cat || store.cats(form.type)[0], note: fNote.value.trim(), date };
    const wasEdit = !!form.editing;
    if (form.editing) Object.assign(form.editing, data); else store.add(data);
    store.save();

    const [y, m] = date.split('-').map(Number);
    const { view } = store;
    const moved = MF.nav.current() === 'movimientos' && (y !== view.y || m - 1 !== view.m);
    close(() => {
      if (moved) MF.goToMonth(y, m - 1);
      else MF.render('data');
      MF.toast(wasEdit ? 'Movimiento actualizado' : 'Movimiento guardado');
    });
  }

  function saveGoal() {
    const name = gName.value.trim();
    const target = parseAmount(gTarget.value);
    if (!name) { gErr.textContent = 'Ponele un nombre a la meta.'; gName.focus(); return; }
    if (!(target > 0)) { gErr.textContent = 'Ingresá cuánto querés juntar.'; gTarget.focus(); return; }
    const saved = Math.max(0, parseAmount(gSaved.value) || 0);
    const deadline = /^\d{4}-\d{2}$/.test(gDate.value) ? gDate.value : '';
    const wasEdit = !!form.editing;
    if (wasEdit) store.updateGoal(form.editing.id, { name, target, saved, deadline });
    else store.addGoal({ name, target, saved, deadline });
    store.save();
    close(() => {
      if (MF.nav.current() !== 'metas') MF.nav.go('metas'); else MF.render('data');
      MF.toast(wasEdit ? 'Meta actualizada' : 'Meta creada');
    });
  }

  sheet.addEventListener('submit', e => {
    e.preventDefault();
    if (form.mode === 'goal') saveGoal(); else saveMove();
  });

  $('#fDelete').addEventListener('click', () => {
    const item = form.editing;
    if (!item) return;
    if (form.mode === 'goal') close(() => MF.goals.remove(item.id));
    else close(() => MF.movements.remove(item.id));
  });
  $('#sheetClose').addEventListener('click', () => close());
  scrim.addEventListener('click', () => close());
  fab.addEventListener('click', () => (MF.nav.current() === 'metas' ? openWith('goal') : openWith('move')));
  fAmount.addEventListener('input', () => { fErr.textContent = ''; });
  [gName, gTarget].forEach(i => i.addEventListener('input', () => { gErr.textContent = ''; }));

  MF.sheet = {
    open: (tx, opts) => openWith('move', tx, opts), // opts.date: fecha para un movimiento nuevo
    openGoal: g => openWith('goal', g),
    close,
    isOpen: () => isOpen,
  };
})(window.MF = window.MF || {});
