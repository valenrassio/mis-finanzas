/* App instalable: registra el service worker (funciona sin internet), pide que el celular
   no borre los datos y agrega "Instalar en el celular" al menú. */
(function (MF) {
  'use strict';
  const { $ } = MF;

  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // El service worker solo funciona servido por https (o localhost), no con doble clic.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline, la app sigue andando */ });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) MF.toast('Hay una versión nueva', () => location.reload(), 'Recargar');
    });
  }

  // Pide almacenamiento persistente para que el sistema no borre los movimientos si falta espacio.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  /* ---- instalar ---- */
  const btn = $('#menuInstall');
  let deferred = null;

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferred = e;
    btn.hidden = false;
  });
  window.addEventListener('appinstalled', () => { deferred = null; btn.hidden = true; MF.toast('Listo, ya está en tu pantalla de inicio'); });

  if (!standalone && isIOS) btn.hidden = false;

  function install() {
    MF.menu.close();
    if (deferred) { deferred.prompt(); deferred.userChoice.finally(() => { deferred = null; }); return; }
    if (isIOS) MF.toast('Tocá Compartir y después "Agregar a inicio"');
  }

  MF.pwa = { standalone, isIOS, install };
})(window.MF = window.MF || {});
