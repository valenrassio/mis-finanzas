/* Movimiento: resortes y curvas exponenciales en función del tiempo.
   Nada aparece de golpe: se revela con máscara, crece o cuenta. */
(function (MF) {
  'use strict';
  const { lerp } = MF;

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const anims = new Map();

  // Resorte subamortiguado. z = 0.82 da ~1% de rebote.
  function springAt(t, w = 15, z = 0.82) {
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }
  const expoOut = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const expoIn = x => (x <= 0 ? 0 : Math.pow(2, 10 * (x - 1)));

  /* Corre update(p) con p de 0 a 1. Una animación nueva con la misma key cancela la anterior. */
  function animate(key, { dur = 0.8, delay = 0, ease = 'spring', w = 15, update, done }) {
    const token = {};
    anims.set(key, token);
    if (reduceMQ.matches) { update(1); anims.delete(key); if (done) done(); return; }
    const t0 = performance.now() + delay * 1000;
    const step = now => {
      if (anims.get(key) !== token) return;
      const t = (now - t0) / 1000;
      if (t < 0) { requestAnimationFrame(step); return; }
      const fin = t >= dur;
      const p = fin ? 1 : ease === 'spring' ? springAt(t, w) : ease === 'in' ? expoIn(t / dur) : expoOut(t / dur);
      update(p);
      if (fin) { anims.delete(key); if (done) done(); } else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Cada elemento tiene sus propias keys, así revelar y contar no se cancelan entre sí.
  const keyOf = (el, name) => (el['__k_' + name] = el['__k_' + name] || {});

  /* Revela texto desde abajo a través de su máscara (.reveal > .reveal-i). */
  function reveal(els, { delay = 0, stagger = 0.035, dir = 1 } = {}) {
    els.forEach((el, i) => {
      el.style.transform = `translateY(${dir * 110}%)`;
      animate(keyOf(el, 'reveal'), {
        delay: delay + i * stagger,
        update: p => { el.style.transform = `translateY(${(1 - p) * dir * 110}%)`; },
        done: () => { el.style.transform = ''; },
      });
    });
  }

  /* Cambia un texto: el viejo sale primero y el nuevo entra después, las letras nunca se pisan. */
  function swapText(el, text, dir = 1) {
    if (el.textContent === text) return;
    if (reduceMQ.matches || !el.textContent) { el.textContent = text; return; }
    const key = keyOf(el, 'reveal');
    animate(key, {
      dur: 0.16, ease: 'in',
      update: p => { el.style.transform = `translateY(${-dir * 110 * p}%)`; },
      done: () => {
        el.textContent = text;
        el.style.transform = `translateY(${dir * 110}%)`;
        animate(key, {
          update: p => { el.style.transform = `translateY(${dir * 110 * (1 - p)}%)`; },
          done: () => { el.style.transform = ''; },
        });
      },
    });
  }

  /* Cuenta un número desde su valor anterior hasta el nuevo. */
  function countTo(el, to, format) {
    const from = parseFloat(el.dataset.v || '0');
    el.dataset.v = to;
    if (from === to) { el.textContent = format(to); return; }
    animate(keyOf(el, 'count'), { dur: 0.9, ease: 'out', update: p => { el.textContent = format(lerp(from, to, p)); } });
  }

  /* Hace crecer un elemento desde una escala. */
  function grow(el, { delay = 0, from = 0 } = {}) {
    el.style.transform = `scale(${from})`;
    animate(keyOf(el, 'grow'), {
      delay, w: 13,
      update: p => { el.style.transform = `scale(${lerp(from, 1, p)})`; },
      done: () => { el.style.transform = ''; },
    });
  }

  /* Despliega un bloque de arriba hacia abajo con clip-path. */
  function unfold(el, { delay = 0, w = 14, radius = '' } = {}) {
    const r = radius ? ` round ${radius}` : '';
    el.style.clipPath = `inset(0 0 100% 0${r})`;
    animate(keyOf(el, 'unfold'), {
      delay, w,
      update: p => { el.style.clipPath = `inset(0 0 ${MF.clamp(1 - p, 0, 1) * 100}% 0${r})`; },
      done: () => { el.style.clipPath = ''; },
    });
  }

  MF.motion = { reduceMQ, springAt, animate, reveal, swapText, countTo, grow, unfold };
})(window.MF = window.MF || {});
