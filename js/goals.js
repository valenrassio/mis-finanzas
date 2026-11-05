/* Metas: cuánto querés juntar, cuánto llevás y cuánto te falta por mes para llegar a la fecha.
   Cuando una meta se cumple, el punto aparece al final de su barra. */
(function (MF) {
  'use strict';
  const { $, $$, MONTHS, now, esc, money, lerp, parseAmount, store } = MF;
  const { animate, reveal, countTo, grow } = MF.motion;

  const list = $('#goalList');
  const prevFill = new Map();

  /* Progreso, lo que falta y el ritmo mensual necesario. */
  function stats(g) {
    const done = g.saved >= g.target;
    const pct = g.target > 0 ? Math.min(1, g.saved / g.target) : 0;
    const left = Math.max(0, g.target - g.saved);
    let perMonth = null, late = false, when = '';
    if (g.deadline) {
      const [y, m] = g.deadline.split('-').map(Number);
      when = `${MONTHS[m - 1]} ${y}`;
      const months = (y * 12 + m - 1) - (now.getFullYear() * 12 + now.getMonth()) + 1; // el mes actual cuenta
      if (months >= 1) perMonth = left / months; else late = true;
    }
    return { done, pct, left, perMonth, late, when };
  }

  function noteFor(s) {
    if (s.done) return '<span class="cat-note over">Cumplida</span>';
    const parts = [`${Math.round(s.pct * 100)}%`, `faltan ${money(s.left)}`];
    if (s.perMonth !== null) parts.push(`${money(Math.ceil(s.perMonth / 100) * 100)} por mes hasta ${s.when}`);
    else if (s.late) parts.push(`la fecha era ${s.when}`);
    return `<span class="cat-note">${parts.join(' · ')}</span>`;
  }

  /* Orden: las que están en curso primero, las cumplidas al final. */
  const sorted = goals => [...goals].sort((a, b) =>
    (a.saved >= a.target) - (b.saved >= b.target) || (a.created || 0) - (b.created || 0));

  /* Fila de una meta. compact = versión para el Inicio (sin botones, lleva a Metas). */
  function rowHtml(g, compact) {
    const s = stats(g);
    const inner = `
      <span class="cat-top">
        <span class="cat-name reveal"><span class="reveal-i">${esc(g.name)}</span></span>
        <span class="cat-amt reveal"><span class="reveal-i">${money(g.saved)} <span>de ${money(g.target)}</span></span></span>
      </span>
      <span class="track"><span class="fill" data-to="${s.pct}" data-key="${g.id}"></span>${s.done ? '<span class="dot end-dot"></span>' : ''}</span>
      ${noteFor(s)}`;
    if (compact) return `<li class="goal"><a class="goal-btn" href="#metas">${inner}</a></li>`;
    return `<li class="goal" data-goal="${g.id}">
      <div class="goal-main">
        <button type="button" class="goal-btn" data-goal-edit="${g.id}" aria-label="Editar ${esc(g.name)}">${inner}</button>
        <div class="goal-acts">
          <button type="button" class="mini" data-goal-add="${g.id}">Sumar</button>
          <button type="button" class="mini" data-goal-sub="${g.id}"${g.saved > 0 ? '' : ' disabled'}>Sacar</button>
        </div>
      </div>
    </li>`;
  }

  /* Hace crecer las barras desde su ancho anterior (o desde cero) y el punto de las cumplidas. */
  function animateFills(box, prev, mode) {
    $$('.fill', box).forEach((fill, i) => {
      const to = +fill.dataset.to;
      const key = fill.dataset.key;
      const from = mode === 'data' ? (prev.get(key) ?? 0) : 0;
      fill.style.transform = `scaleX(${from})`;
      animate(fill, {
        delay: mode === 'data' ? 0 : 0.3 + i * 0.05, w: 13,
        update: p => { fill.style.transform = `scaleX(${Math.max(0, lerp(from, to, p))})`; },
      });
      const end = fill.parentNode.querySelector('.end-dot');
      if (end && (mode !== 'data' || (prev.get(key) ?? 0) < 1)) grow(end, { delay: mode === 'data' ? 0.35 : 0.75 + i * 0.05 });
    });
    prev.clear();
    $$('.fill', box).forEach(f => prev.set(f.dataset.key, +f.dataset.to));
  }

  function render(mode) {
    const goals = store.db.goals;
    const saved = goals.reduce((a, g) => a + g.saved, 0);
    const target = goals.reduce((a, g) => a + g.target, 0);
    const left = goals.reduce((a, g) => a + Math.max(0, g.target - g.saved), 0);
    const done = goals.filter(g => g.saved >= g.target).length;
    countTo($('#gTotal'), saved, money);
    countTo($('#gTarget'), target, money);
    countTo($('#gLeft'), left, money);
    $('#gDone').textContent = goals.length ? `${done} de ${goals.length}` : '—';

    if (!goals.length) {
      list.innerHTML = `<li class="empty">
        <p>Todavía no tenés metas.</p>
        <p class="muted">Un viaje, un fondo para imprevistos, algo que quieras comprar. Ponele un monto y una fecha, y te digo cuánto juntar por mes.</p>
        <div class="actions"><button type="button" class="primary sm" data-act="new-goal">Crear una meta</button></div>
      </li>`;
      prevFill.clear();
      return;
    }
    list.innerHTML = sorted(goals).map(g => rowHtml(g, false)).join('');
    animateFills(list, prevFill, mode);
    if (mode !== 'data') reveal($$('.reveal-i', list), { delay: 0.2, stagger: 0.025 });
  }

  /* ---- sumar o sacar plata (formulario en la misma fila) ---- */
  function editAmount(id, sign) {
    const li = $(`li[data-goal="${CSS.escape(id)}"]`, list);
    const g = store.findGoal(id);
    if (!li || !g) return;
    const existing = $('.goal-edit', li);
    $$('.goal-edit', list).forEach(f => f.remove());
    if (existing && existing.dataset.sign === String(sign)) return; // tocar de nuevo el mismo botón lo cierra

    const verb = sign > 0 ? 'Sumar' : 'Sacar';
    const f = document.createElement('form');
    f.className = 'cat-edit goal-edit';
    f.dataset.sign = sign;
    f.innerHTML = `
      <input class="line-input" inputmode="decimal" placeholder="${sign > 0 ? `Cuánto sumás a ${esc(g.name)}` : `Cuánto sacás (tenés ${money(g.saved)})`}"
        aria-label="${verb} a ${esc(g.name)}">
      <button type="submit" class="primary sm">${verb}</button>`;
    li.appendChild(f);
    const h = f.scrollHeight;
    f.style.height = '0px';
    animate(f, { w: 14, update: p => { f.style.height = `${Math.max(0, h * p)}px`; }, done: () => { f.style.height = ''; } });

    const input = $('input', f);
    input.focus();
    input.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); f.remove(); } });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const amount = parseAmount(input.value);
      if (!(amount > 0)) { input.focus(); input.select(); return; }
      const before = store.snapshot();
      const wasDone = g.saved >= g.target;
      const real = store.contribute(id, sign * amount);
      store.save();
      MF.render('data');
      const undo = () => { store.db = before; store.save(); MF.render('data'); };
      if (!wasDone && g.saved >= g.target) {
        grow($('#brandDot'), { from: 0.4 });
        MF.toast(`Cumpliste "${g.name}"`, undo);
      } else MF.toast(real > 0 ? `Sumaste ${money(real)} a ${g.name}` : `Sacaste ${money(-real)} de ${g.name}`, undo);
    });
  }

  list.addEventListener('click', e => {
    const add = e.target.closest('[data-goal-add]');
    if (add) { editAmount(add.dataset.goalAdd, 1); return; }
    const sub = e.target.closest('[data-goal-sub]');
    if (sub) { editAmount(sub.dataset.goalSub, -1); return; }
    const edit = e.target.closest('[data-goal-edit]');
    if (edit) { const g = store.findGoal(edit.dataset.goalEdit); if (g) MF.sheet.openGoal(g); }
  });

  function remove(id) {
    const before = store.snapshot();
    store.removeGoal(id);
    store.save();
    MF.render('data');
    MF.toast('Meta borrada', () => { store.db = before; store.save(); MF.render('data'); });
  }

  MF.goals = { render, remove, rowHtml, sorted, animateFills, stats };
})(window.MF = window.MF || {});
