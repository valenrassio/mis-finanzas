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
  const { animate, reveal, countTo, grow } = MF.motion;

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

  /* ---- barras de los últimos 7 días; el punto marca hoy ---- */
  const short = v => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace('.', ',').replace(',0', '')}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v > 0 ? `${Math.round(v)}` : '');

  function renderWeek(mode) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Y, M, D - i);
      const key = iso(d);
      const out = store.db.tx.reduce((a, t) => a + (t.type === 'out' && t.date === key ? t.amount : 0), 0);
      days.push({ d, out, today: i === 0 });
    }
    const max = Math.max(1, ...days.map(x => x.out));
    weekBox.innerHTML = days.map(x => {
      const label = `${MF.cap(WEEKDAYS[x.d.getDay()])} ${x.d.getDate()}: ${money(x.out)}`;
      return `<div class="wk-col${x.today ? ' today' : ''}" role="img" aria-label="${label}" title="${label}">
        <span class="wk-val">${short(x.out)}</span>
        <span class="wk-bar"><span class="wk-fill"></span></span>
        <span class="wk-day">${WEEKDAYS[x.d.getDay()].charAt(0).toUpperCase()}</span>
        ${x.today ? '<span class="dot wk-dot"></span>' : ''}
      </div>`;
    }).join('');

    const to = days.map(x => x.out / max);
    const from = mode === 'data' && prevBars ? prevBars : to.map(() => 0);
    prevBars = to;
    $$('.wk-fill', weekBox).forEach((f, i) => {
      f.style.transform = `scaleY(${from[i]})`;
      animate(f, {
        delay: mode === 'data' ? 0 : 0.3 + i * 0.05, w: 13,
        update: p => { f.style.transform = `scaleY(${Math.max(0, lerp(from[i], to[i], p))})`; },
      });
    });
    const dot = $('.wk-dot', weekBox);
    if (dot && mode !== 'data') grow(dot, { delay: 0.75 });
  }

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
        list.push(['Subió', `${b(esc(best.cat))} va ${b(money(best.v))}, ${vs}.`]);
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
    const top = MF.goals.sorted(store.db.goals).slice(0, 3);
    if (!top.length) {
      goalsBox.innerHTML = `<li class="empty">
        <p class="muted">Todavía no tenés metas.</p>
        <div class="actions"><button type="button" class="ghost pad0" data-act="new-goal">Crear una meta</button></div></li>`;
      prevGoals.clear();
      return;
    }
    goalsBox.innerHTML = top.map(g => MF.goals.rowHtml(g, true)).join('');
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
