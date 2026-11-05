/* Categorías: crear, renombrar, ponerle tope y borrar.
   Al renombrar se actualizan todos los movimientos; al borrar, sus movimientos pasan a "Otros". */
(function (MF) {
  'use strict';
  const { $, $$, now, esc, money, nf, parseAmount, store } = MF;
  const { animate, reveal } = MF.motion;

  const MAX = 24;
  const lists = { out: $('#cmOut'), in: $('#cmIn') };

  function usage(type) {
    const all = {}, month = {};
    const p = MF.monthPrefix(now.getFullYear(), now.getMonth());
    for (const t of store.db.tx) {
      if (t.type !== type) continue;
      all[t.category] = (all[t.category] || 0) + 1;
      if (t.date.startsWith(p)) month[t.category] = (month[t.category] || 0) + t.amount;
    }
    return { all, month };
  }

  function rowHtml(type, name, u) {
    const n = u.all[name] || 0;
    const cap = type === 'out' ? store.db.budgets[name] : 0;
    const sub = [`${n} ${n === 1 ? 'movimiento' : 'movimientos'}`];
    if (cap) sub.push(`tope ${money(cap)}`);
    return `<li data-cm="${esc(name)}">
      <button type="button" class="cm" data-cm-btn>
        <span class="cm-top">
          <span class="cm-name reveal"><span class="reveal-i">${esc(name)}</span></span>
          <span class="cm-amt reveal"><span class="reveal-i">${money(u.month[name] || 0)} <span>este mes</span></span></span>
        </span>
        <span class="cm-sub">${sub.join(' · ')}</span>
      </button>
    </li>`;
  }

  function render(mode) {
    for (const type of ['out', 'in']) {
      const u = usage(type);
      lists[type].innerHTML = store.cats(type).map(c => rowHtml(type, c, u)).join('');
      $(`#cmCount-${type}`).textContent = `${store.cats(type).length}`;
    }
    if (mode !== 'data') reveal($$('#view-categorias .grid .reveal-i'), { delay: 0.2, stagger: 0.015 });
  }

  /* ---- editar una categoría (se despliega debajo de la fila) ---- */
  function openEditor(type, name) {
    const li = $(`li[data-cm="${CSS.escape(name)}"]`, lists[type]);
    if (!li) return;
    const already = $('.cm-edit', li);
    $$('.cm-edit').forEach(f => f.remove());
    if (already) return; // tocar de nuevo la misma fila la cierra

    const isOther = name === store.OTHER;
    const cap = type === 'out' ? store.db.budgets[name] : 0;
    const f = document.createElement('form');
    f.className = 'cm-edit';
    f.noValidate = true;
    f.innerHTML = `
      <label class="field"><span class="lbl">Nombre</span>
        <input class="line-input" name="name" maxlength="${MAX}" value="${esc(name)}" ${isOther ? 'disabled' : ''}></label>
      ${type === 'out' ? `<label class="field"><span class="lbl">Tope mensual</span>
        <input class="line-input" name="cap" inputmode="decimal" placeholder="Sin tope" value="${cap ? nf.format(cap) : ''}"></label>` : '<span></span>'}
      <span class="err" aria-live="polite"></span>
      <div class="cm-actions">
        ${isOther ? '<span class="hint">"Otros" no se puede borrar ni renombrar.</span>' : '<button type="button" class="ghost pad0" data-cm-del>Borrar</button>'}
        <button type="submit" class="primary sm">Guardar</button>
      </div>`;
    li.appendChild(f);
    const h = f.scrollHeight;
    f.style.height = '0px';
    animate(f, { w: 14, update: p => { f.style.height = `${Math.max(0, h * p)}px`; }, done: () => { f.style.height = ''; } });

    const nameIn = f.elements.name, capIn = f.elements.cap, err = $('.err', f);
    (isOther ? capIn || nameIn : nameIn).focus();
    f.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); f.remove(); } });
    f.addEventListener('input', () => { err.textContent = ''; });

    f.addEventListener('submit', e => {
      e.preventDefault();
      const next = isOther ? name : nameIn.value.trim().replace(/\s+/g, ' ');
      if (!next) { err.textContent = 'Ponele un nombre.'; nameIn.focus(); return; }
      if (store.hasCat(type, next, name)) { err.textContent = `Ya tenés una categoría "${next}".`; nameIn.focus(); return; }
      const before = store.snapshot();
      store.renameCat(type, name, next);
      if (type === 'out') store.setBudget(next, parseAmount(capIn.value) || 0);
      store.save();
      MF.render('data');
      MF.toast(next !== name ? `"${name}" ahora se llama "${next}"` : 'Categoría guardada',
        () => { store.db = before; store.save(); MF.render('data'); });
    });

    // Borrar pide un segundo toque, y avisa a dónde van los movimientos.
    let armed = false, timer;
    f.addEventListener('click', e => {
      const del = e.target.closest('[data-cm-del]');
      if (!del) return;
      const n = usage(type).all[name] || 0;
      if (!armed) {
        armed = true;
        del.textContent = n ? `Tocá de nuevo: ${n} ${n === 1 ? 'movimiento pasa' : 'movimientos pasan'} a Otros` : 'Tocá de nuevo para borrar';
        timer = setTimeout(() => { armed = false; del.textContent = 'Borrar'; }, 3500);
        return;
      }
      clearTimeout(timer);
      const before = store.snapshot();
      store.removeCat(type, name);
      store.save();
      MF.render('data');
      MF.toast(`Borraste "${name}"`, () => { store.db = before; store.save(); MF.render('data'); });
    });
  }

  for (const type of ['out', 'in']) {
    lists[type].addEventListener('click', e => {
      const b = e.target.closest('[data-cm-btn]');
      if (b) openEditor(type, b.closest('li').dataset.cm);
    });
  }

  /* ---- agregar ---- */
  $$('.cm-add').forEach(f => {
    const type = f.dataset.type;
    const input = $('input', f), err = $('.err', f);
    input.maxLength = MAX;
    input.addEventListener('input', () => { err.textContent = ''; });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = input.value.trim().replace(/\s+/g, ' ');
      if (!name) { input.focus(); return; }
      if (store.hasCat(type, name)) { err.textContent = `Ya tenés "${name}".`; return; }
      store.addCat(type, name);
      store.save();
      input.value = '';
      MF.render('data');
      MF.toast(`Agregaste "${name}"`);
    });
  });

  MF.catManage = { render };
})(window.MF = window.MF || {});
