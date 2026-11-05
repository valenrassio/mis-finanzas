/* Menú "Opciones" (en la compu) y las mismas opciones dentro del menú de hamburguesa (en el celular):
   instalar, exportar, importar, datos de ejemplo y borrar todo. */
(function (MF) {
  'use strict';
  const { $, $$, iso, store } = MF;
  const { unfold } = MF.motion;

  const menu = $('#menu'), btn = $('#menuBtn'), fileInput = $('#importFile');
  let wipeArmed = false, wipeTimer;

  function open() {
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    unfold(menu, { w: 16, radius: '14px' });
  }
  function close() {
    if (menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    disarmWipe();
  }
  function disarmWipe() {
    wipeArmed = false;
    clearTimeout(wipeTimer);
    $$('[data-act="wipe"]').forEach(b => { b.textContent = 'Borrar todo'; });
  }
  /* Cierra el menú que esté abierto, el de la compu o el de la hamburguesa. */
  const closeAll = () => { close(); MF.nav.closeDrawer(); };

  btn.addEventListener('click', e => { e.stopPropagation(); menu.hidden ? open() : close(); });
  document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) close(); });

  /* Reemplaza todos los datos y ofrece deshacer. */
  function replaceAll(next, msg) {
    const before = store.snapshot();
    store.db = next;
    store.save();
    MF.render('view');
    MF.toast(msg, () => { store.db = before; store.save(); MF.render('view'); });
  }

  async function exportData() {
    const name = `mis-finanzas-${iso(new Date())}.json`;
    const blob = new Blob([JSON.stringify(store.db, null, 2)], { type: 'application/json' });
    // En el celular abre el menú de compartir (guardar en Archivos, Drive, WhatsApp...).
    const file = typeof File === 'function' ? new File([blob], name, { type: 'application/json' }) : null;
    const touch = matchMedia('(pointer: coarse)').matches;
    if (touch && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Copia de Mis finanzas' }); return; }
      catch (err) { if (err.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  fileInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let next = null;
    try { next = store.parseBackup(JSON.parse(await file.text())); } catch (err) { /* JSON inválido */ }
    if (!next) { MF.toast('Ese archivo no es una copia válida'); return; }
    replaceAll(next, `Importados ${next.tx.length} movimientos`);
  });

  /* Acciones con data-act, en cualquier parte de la página. */
  const actions = {
    new: () => MF.sheet.open(),
    'new-goal': () => MF.sheet.openGoal(),
    install: () => MF.pwa.install(),
    export: () => { exportData(); closeAll(); },
    import: () => { fileInput.click(); closeAll(); },
    sample: () => { closeAll(); store.loadSample(); store.save(); MF.render('view'); },
    'wipe-sample': () => replaceAll(store.empty(), 'Datos de ejemplo borrados'),
    wipe: el => {
      if (!wipeArmed) {
        wipeArmed = true;
        el.textContent = 'Tocá de nuevo para confirmar';
        wipeTimer = setTimeout(disarmWipe, 3500);
        return;
      }
      disarmWipe();
      closeAll();
      replaceAll(store.empty(), 'Se borró todo');
    },
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (el && actions[el.dataset.act]) actions[el.dataset.act](el);
  });

  MF.menu = { open, close };
})(window.MF = window.MF || {});
