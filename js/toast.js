/* Aviso inferior, con un botón opcional ("Deshacer" por defecto). Se abre desde el centro con una máscara. */
(function (MF) {
  'use strict';
  const { $, esc, clamp } = MF;
  const { animate } = MF.motion;

  const el = $('#toast');
  let timer;
  const clip = open => { const v = clamp(1 - open, 0, 1) * 50; el.style.clipPath = `inset(0 ${v}% 0 ${v}% round 999px)`; };

  function toast(msg, undo, label = 'Deshacer') {
    clearTimeout(timer);
    el.className = `toast${undo ? '' : ' solo'}`;
    el.innerHTML = `<span>${esc(msg)}</span>${undo ? `<button type="button">${esc(label)}</button>` : ''}`;
    el.hidden = false;
    if (undo) $('button', el).addEventListener('click', () => { undo(); hide(); });
    clip(0);
    animate(el, { w: 14, update: clip, done: () => { el.style.clipPath = ''; } });
    timer = setTimeout(hide, undo ? 6000 : 2800);
  }

  function hide() {
    clearTimeout(timer);
    animate(el, {
      dur: 0.3, ease: 'in',
      update: p => clip(1 - p),
      done: () => { el.hidden = true; el.style.clipPath = ''; },
    });
  }

  MF.toast = toast;
})(window.MF = window.MF || {});
