/* Inicio: mira para adelante y te compara con vos mismo, en vez de repetir el detalle de Movimientos.
   - Cuánto podés gastar por día hasta fin de mes.
   - Lo gastado hoy, en los últimos 7 días y el promedio diario.
   - Barras de los últimos 7 días.
   - "Cómo venís": ritmo contra tus meses anteriores, la categoría que más subió, cómo cerrarías el mes y topes.
   - Resumen de metas.
   Siempre usa la fecha de hoy, no el mes que se mira en Movimientos. */
(function (MF) {
  'use strict';
  const { $, $$, MONTHS, WEEKDAYS, now, iso, esc, money, signed, lerp, monthPrefix, store } = MF;
  const { animate, reveal, countTo, grow, swapText } = MF.motion;

  const weekBox = $('#hWeek'), tipsBox = $('#hTips'), goalsBox = $('#hGoals');
  const prevGoals = new Map();
  let prevBars = null;

  const Y = now.getFullYear(), M = now.getMonth(), D = now.getDate();
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  const DIM = daysIn(Y, M);
  const b = s => `<b>${s}</b>`;
  const pct = (a, base) => Math.round(Math.abs(a / base - 1) * 100);

  function greeting() {
    const h = new Date().getHours();
    return h >= 5 && h < 13 ? 'Buen día' : h >= 13 && h < 20 ? 'Buenas tardes' : 'Buenas noches';
  }

  /* Gastos de un mes hasta cierto día (inclusive), en total y por categoría. */
  function spentUntil(y, m, day) {
    const p = monthPrefix(y, m);
    const res = { total: 0, cats: {}, rest: 0 };
    for (const t of store.db.tx) {
      if (t.type !== 'out' || !t.date.startsWith(p)) continue;
      if (+t.date.slice(8, 10) <= day) { res.total += t.amount; res.cats[t.category] = (res.cats[t.category] || 0) + t.amount; }
      else res.rest += t.amount;
    }
    return res;
  }

  /* Hasta 3 meses anteriores con movimientos, cortados en el mismo día del mes que hoy. */
  function history() {
    const months = [];
    for (let k = 1; k <= 3; k++) {
      const { y, m } = store.shift(Y, M, -k);
      if (!store.inMonth(y, m).length) continue;
      months.push(spentUntil(y, m, Math.min(D, daysIn(y, m))));
    }
    return months;
  }

  /* ---- número grande: cuánto podés gastar por día ---- */
  function renderHero(s) {
    $('#hGreet').innerHTML = `${greeting()}. Hoy es ${WEEKDAYS[now.getDay()]} ${D} de <span class="key">${MONTHS[M]}</span>`;
    const left = s.in - s.out;
    const daysLeft = DIM - D + 1;
    countTo($('#hPerDay'), Math.max(0, left / daysLeft), money);
    const sub = $('#hSub');
    if (!store.db.tx.length) sub.textContent = 'Cargá lo que entra y lo que gastás, y te digo cuánto podés gastar por día.';
    else if (s.in === 0) sub.textContent = `Todavía no cargaste ingresos en ${MONTHS[M]}.`;
    else if (left <= 0) sub.innerHTML = `Este mes ya gastaste ${b(money(-left))} más de lo que entró.`;
    else sub.innerHTML = `por día hasta fin de mes. Te quedan ${b(money(left))} para ${daysLeft === 1 ? 'hoy' : `${daysLeft} días`}.`;

    const today = iso(now);
    const weekAgo = iso(new Date(Y, M, D - 6));
    let todayOut = 0, weekOut = 0;
    for (const t of store.db.tx) {
      if (t.type !== 'out') continue;
      if (t.date === today) todayOut += t.amount;
      if (t.date >= weekAgo && t.date <= today) weekOut += t.amount;
    }
    countTo($('#hToday'), todayOut, money);
    countTo($('#hWeekTotal'), weekOut, money);
    countTo($('#hAvg'), s.out / D, money);
  }

  /* ---- barras de 7 días: se puede volver a semanas anteriores y tocar un día para ver sus movimientos ---- */
  const short = v => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace('.', ',').replace(',0', '')}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v > 0 ? `${Math.round(v)}` : '');
  const TODAY = iso(now);
  const week = { offset: 0, sel: TODAY }; // offset: cuántas semanas para atrás; sel: día elegido
  const dayPanel = $('#hDay');

  function windowDays() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Y, M, D - week.offset * 7 - i);
      const key = iso(d);
      let out = 0;
      for (const t of store.db.tx) if (t.type === 'out' && t.date === key) out += t.amount;
      days.push({ d, key, out, today: key === TODAY });
    }
    return days;
  }

  function weekTitle(days) {
    if (!week.offset) return 'Últimos 7 días';
    const a = days[0].d, z = days[6].d;
    return a.getMonth() === z.getMonth()
      ? `${a.getDate()} al ${z.getDate()} de ${MONTHS[z.getMonth()]}`
      : `${a.getDate()} de ${MONTHS[a.getMonth()].slice(0, 3)} al ${z.getDate()} de ${MONTHS[z.getMonth()].slice(0, 3)}`;
  }

  function renderWeek(mode, dir = 1) {
    const days = windowDays();
    if (!days.some(x => x.key === week.sel)) week.sel = days[6].key;
    const max = Math.max(1, ...days.map(x => x.out));
    weekBox.innerHTML = days.map(x => {
      const label = `${MF.cap(WEEKDAYS[x.d.getDay()])} ${x.d.getDate()}: ${money(x.out)}`;
      return `<button type="button" class="wk-col${x.today ? ' today' : ''}${x.key === week.sel ? ' sel' : ''}"
          data-day="${x.key}" aria-pressed="${x.key === week.sel}" aria-label="${label}" title="${label}">
        <span class="wk-val">${short(x.out)}</span>
        <span class="wk-bar"><span class="wk-fill"></span></span>
        <span class="wk-day">${WEEKDAYS[x.d.getDay()].charAt(0).toUpperCase()}</span>
        ${x.today ? '<span class="dot wk-dot"></span>' : '<span class="wk-dot-space"></span>'}
      </button>`;
    }).join('');

    const to = days.map(x => x.out / max);
    const from = mode === 'data' && prevBars ? prevBars : to.map(() => 0);
    prevBars = to;
    $$('.wk-fill', weekBox).forEach((f, i) => {
      f.style.transform = `scaleY(${from[i]})`;
      animate(f, {
        delay: mode === 'data' ? 0 : mode === 'week' ? i * 0.025 : 0.3 + i * 0.05, w: 13,
        update: p => { f.style.transform = `scaleY(${Math.max(0, lerp(from[i], to[i], p))})`; },
      });
    });
    const dot = $('.wk-dot', weekBox);
    if (dot && mode !== 'data') grow(dot, { delay: mode === 'week' ? 0.2 : 0.75 });

    // título y flechas
    const title = weekTitle(days);
    if (mode === 'week') swapText($('#wkTitle'), title, dir); else $('#wkTitle').textContent = title;
    const earliest = store.db.tx.reduce((m, t) => (t.date < m ? t.date : m), TODAY);
    $('#wkPrev').disabled = earliest >= days[0].key;
    $('#wkNext').disabled = week.offset === 0;

    renderDay(mode !== 'data');
  }

  /* Movimientos del día elegido, para corregir o borrar, y botón para agregar en esa fecha. */
  function renderDay(animated) {
    const list = store.db.tx
      .filter(t => t.date === week.sel)
      .sort((a, b) => (b.created || 0) - (a.created || 0));
    const net = list.reduce((a, t) => a + (t.type === 'in' ? t.amount : -t.amount), 0);
    dayPanel.innerHTML = `
      <div class="mask"><div class="day-h dp-h"><span>${MF.movements.dayLabel(week.sel)}</span><span>${list.length ? MF.plusMinus(net) : ''}</span></div></div>
      ${list.length ? list.map(MF.movements.rowHtml).join('') : '<div class="mask"><p class="dp-empty">No cargaste nada este día.</p></div>'}
      <div class="mask"><button type="button" class="dp-add" data-day-add>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>Agregar a este día</button></div>`;
    if (animated) reveal($$('.mask > *', dayPanel), { delay: 0.05, stagger: 0.03 });
  }

  function selectDay(key) {
    if (key === week.sel) return;
    week.sel = key;
    $$('.wk-col', weekBox).forEach(c => {
      const on = c.dataset.day === key;
      c.classList.toggle('sel', on);
      c.setAttribute('aria-pressed', String(on));
    });
    renderDay(true);
  }

  function shiftWeek(delta) {
    const next = week.offset - delta; // delta -1 = semana anterior
    if (next < 0) return;
    if (delta < 0 && $('#wkPrev').disabled) return;
    week.offset = next;
    week.sel = next === 0 ? TODAY : iso(new Date(Y, M, D - next * 7));
    renderWeek('week', delta < 0 ? -1 : 1);
  }

  $('#wkPrev').addEventListener('click', () => shiftWeek(-1));
  $('#wkNext').addEventListener('click', () => shiftWeek(1));

  // Deslizar el dedo sobre las barras: hacia la derecha va a la semana anterior.
  let swipe = null, swiped = false;
  weekBox.addEventListener('pointerdown', e => { swipe = { x: e.clientX, y: e.clientY }; swiped = false; });
  weekBox.addEventListener('pointerup', e => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = true; shiftWeek(dx > 0 ? -1 : 1); }
  });
  weekBox.addEventListener('click', e => {
    if (swiped) { swiped = false; return; }
    const col = e.target.closest('[data-day]');
    if (col) selectDay(col.dataset.day);
  });

  dayPanel.addEventListener('click', e => {
    const edit = e.target.closest('[data-edit]');
    if (edit) { const t = store.find(edit.dataset.edit); if (t) MF.sheet.open(t); return; }
    const del = e.target.closest('[data-del]');
    if (del) { MF.movements.remove(del.dataset.del); return; }
    if (e.target.closest('[data-day-add]')) MF.sheet.open(null, { date: week.sel });
  });

  /* ---- "Cómo venís": frases cortas con los números en negrita ---- */
  function tips(s) {
    const list = [];
    const hist = history();
    const mine = spentUntil(Y, M, D);

    // 1. Ritmo contra los meses anteriores
    if (hist.length && s.out > 0) {
      const avg = hist.reduce((a, h) => a + h.total, 0) / hist.length;
      if (avg > 0) {
        const diff = s.out - avg;
        const how = Math.abs(diff) < avg * 0.05 ? 'parecido a lo de siempre'
          : diff < 0 ? `un ${b(`${pct(s.out, avg)}% menos`)} que de costumbre` : `un ${b(`${pct(s.out, avg)}% más`)} que de costumbre`;
        list.push(['Ritmo', `Llevás ${b(money(s.out))} gastados. A esta altura del mes solés llevar ${b(money(avg))}: vas ${how}.`]);
      }
    }

    // 2. La categoría que más subió
    if (hist.length) {
      let best = null;
      for (const [cat, v] of Object.entries(mine.cats)) {
        const avg = hist.reduce((a, h) => a + (h.cats[cat] || 0), 0) / hist.length;
        const diff = v - avg;
        if (diff > 5000 && (avg === 0 || v > avg * 1.15) && (!best || diff > best.diff)) best = { cat, v, avg, diff };
      }
      if (best) {
        const vs = best.avg > 0 ? `${b(`${pct(best.v, best.avg)}% más`)} que tu promedio (${money(best.avg)})` : 'y en otros meses a esta altura no gastabas nada ahí';
        list.push(['Subió', `${MF.swatch('out', best.cat)}${b(esc(best.cat))} va ${b(money(best.v))}, ${vs}.`]);
      } else if (mine.total > 0) list.push(['Subió', 'Ninguna categoría viene más alta que de costumbre.']);
    }

    // 3. Cómo cerrarías el mes: lo que falta, según lo que solés gastar del día de hoy en adelante
    if (s.in > 0 && D < DIM) {
      const rest = hist.length ? hist.reduce((a, h) => a + h.rest, 0) / hist.length : (s.out / D) * (DIM - D);
      const end = s.in - s.out - rest;
      list.push(['Cierre', `Si seguís como siempre, terminás ${MONTHS[M]} con ${b(signed(end))} ${end >= 0 ? 'a favor' : 'en contra'}.`]);
    }

    // 4. Topes
    const budgets = Object.entries(store.db.budgets).filter(([, v]) => v > 0);
    if (budgets.length) {
      const risky = budgets
        .map(([n, cap]) => ({ n, cap, s: mine.cats[n] || 0 }))
        .filter(x => x.s >= x.cap * 0.85)
        .sort((a, z) => z.s / z.cap - a.s / a.cap);
      if (!risky.length) list.push(['Topes', 'Vas bien con todos tus topes.']);
      else {
        const x = risky[0];
        const more = risky.length > 1 ? ` Y ${risky.length - 1} más ${risky.length === 2 ? 'está' : 'están'} cerca.` : '';
        list.push(['Topes', x.s > x.cap
          ? `Te pasaste en ${b(esc(x.n))} por ${b(money(x.s - x.cap))}.${more}`
          : `Ojo con ${b(esc(x.n))}: te quedan ${b(money(x.cap - x.s))} de tope.${more}`]);
      }
    }
    return list;
  }

  function renderTips(s) {
    const list = tips(s);
    tipsBox.innerHTML = list.length
      ? list.map(([k, txt]) => `<li class="tip-row"><span class="tip-k">${k}</span><p>${txt}</p></li>`).join('')
      : `<li class="empty"><p class="muted">Cuando tengas un mes cargado, acá te comparo con vos mismo: si gastás más que de costumbre, en qué, y cómo cerrarías el mes.</p></li>`;
  }

  function renderGoals(mode) {
    const open = MF.goals.pending(store.db.goals), done = MF.goals.finished(store.db.goals);
    if (!open.length && !done.length) {
      goalsBox.innerHTML = `<li class="empty">
        <p class="muted">Todavía no tenés metas.</p>
        <div class="actions"><button type="button" class="ghost pad0" data-act="new-goal">Crear una meta</button></div></li>`;
      prevGoals.clear();
      return;
    }
    goalsBox.innerHTML = (open.length ? open.map(g => MF.goals.rowHtml(g, true)).join('')
      : '<li class="empty"><p class="muted">No tenés metas en curso. <button type="button" class="link" data-act="new-goal">Crear una</button></p></li>')
      + (done.length ? `<li class="goal-sep"><span>Cumplidas · ${done.length}</span></li>` + done.map(g => MF.goals.rowHtml(g, true)).join('') : '');
    MF.goals.animateFills(goalsBox, prevGoals, mode);
  }

  function render(mode) {
    const s = store.sum(store.inMonth(Y, M));
    renderHero(s);
    renderWeek(mode);
    renderTips(s);
    renderGoals(mode);
    if (mode !== 'data') reveal($$('.home-grid .reveal-i, .home-grid .tip-row > *', $('#view-inicio')), { delay: 0.25, stagger: 0.025 });
  }

  MF.home = { render };
})(window.MF = window.MF || {});
