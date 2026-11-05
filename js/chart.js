/* Gráfico: balance acumulado del mes. El punto azul es siempre su último valor. */
(function (MF) {
  'use strict';
  const { $, MONTHS, now, lerp, clamp, signed, store } = MF;
  const { animate } = MF.motion;

  const plot = $('#plot'), line = $('#line'), zero = $('#zero'), dot = $('#chartDot');
  const rule = $('#rule'), tip = $('#tip'), hoverDot = $('#hoverDot');
  const state = { vals: null, days: 0 };

  function series(list) {
    const { y, m } = store.view;
    const days = new Date(y, m + 1, 0).getDate();
    const isNow = y === now.getFullYear() && m === now.getMonth();
    const future = new Date(y, m, 1) > now;
    let last = isNow ? now.getDate() : future ? 1 : days;
    const daily = new Array(days + 1).fill(0);
    for (const t of list) {
      const d = +t.date.slice(8, 10);
      daily[d] += t.type === 'in' ? t.amount : -t.amount;
      if (d > last) last = d;
    }
    const vals = [];
    let acc = 0;
    for (let d = 1; d <= last; d++) { acc += daily[d]; vals.push(acc); }
    return { days, vals };
  }

  // viewBox 1000 x 100; el eje Y deja 10% de aire arriba y abajo
  function geo(vals, days) {
    const lo = Math.min(0, ...vals);
    let hi = Math.max(0, ...vals);
    if (hi - lo < 1) hi = lo + 1;
    return {
      X: i => (days > 1 ? (i / (days - 1)) * 1000 : 0),
      Y: v => 90 - ((v - lo) / (hi - lo)) * 80,
    };
  }

  /* reach: fracción de la línea revelada (0..1). El punto viaja en el frente. */
  function draw(vals, days, reach = 1) {
    const g = geo(vals, days);
    const n = vals.length;
    const end = reach * (n - 1);
    const k = Math.floor(end);
    let d = '';
    for (let i = 0; i <= k; i++) d += `${i ? 'L' : 'M'}${g.X(i).toFixed(2)} ${g.Y(vals[i]).toFixed(3)}`;
    let fx = g.X(k), fy = g.Y(vals[k]);
    if (k < n - 1) {
      const f = end - k;
      fx = lerp(g.X(k), g.X(k + 1), f);
      fy = lerp(g.Y(vals[k]), g.Y(vals[k + 1]), f);
      d += `L${fx.toFixed(2)} ${fy.toFixed(3)}`;
    }
    if (n === 1 || end === 0) d += `L${(fx + 0.01).toFixed(2)} ${fy.toFixed(3)}`;
    line.setAttribute('d', d);
    zero.setAttribute('y1', g.Y(0));
    zero.setAttribute('y2', g.Y(0));
    dot.style.left = `${fx / 10}%`;
    dot.style.top = `${fy}%`;
  }

  function renderAxis(days) {
    const mon = MONTHS[store.view.m].slice(0, 3);
    $('#axis').innerHTML = [1, 8, 15, 22, days]
      .map(d => `<span style="left:${((d - 1) / (days - 1)) * 100}%">${d} ${mon}</span>`).join('');
  }

  /* mode 'data': la línea se transforma desde la anterior. Otro modo: se dibuja de izquierda a derecha. */
  function render(list, mode) {
    const { days, vals } = series(list);
    const prev = state.vals;
    const morph = mode === 'data' && prev && state.days === days;
    state.vals = vals;
    state.days = days;
    renderAxis(days);
    if (morph) {
      const from = vals.map((_, i) => prev[Math.min(i, prev.length - 1)]);
      animate('chart', { w: 12, update: p => draw(vals.map((v, i) => lerp(from[i], v, p)), days) });
    } else {
      draw(vals, days, 0);
      animate('chart', {
        dur: 1.1, ease: 'out', delay: mode === 'intro' ? 0.25 : 0,
        update: p => draw(vals, days, clamp(p, 0, 1)),
      });
    }
  }

  function hover(e) {
    if (!state.vals) return;
    const r = plot.getBoundingClientRect();
    const i = clamp(Math.round(((e.clientX - r.left) / r.width) * (state.days - 1)), 0, state.vals.length - 1);
    const g = geo(state.vals, state.days);
    const x = g.X(i) / 10, y = g.Y(state.vals[i]);
    rule.hidden = tip.hidden = hoverDot.hidden = false;
    rule.style.left = hoverDot.style.left = tip.style.left = `${x}%`;
    hoverDot.style.top = tip.style.top = `${y}%`;
    tip.style.transform = `translate(${x < 12 ? '-12%' : x > 88 ? '-88%' : '-50%'}, calc(-100% - 14px))`;
    tip.textContent = `${i + 1} ${MONTHS[store.view.m].slice(0, 3)} · ${signed(state.vals[i])}`;
  }
  plot.addEventListener('pointermove', hover);
  plot.addEventListener('pointerdown', hover);
  plot.addEventListener('pointerleave', () => { rule.hidden = tip.hidden = hoverDot.hidden = true; });

  MF.chart = { render };
})(window.MF = window.MF || {});
