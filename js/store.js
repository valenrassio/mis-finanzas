/* Datos: carga, guardado, mes visible y consultas.
   Hoy guarda en localStorage. Para pasar a un back, solo cambian load() y save(). */
(function (MF) {
  'use strict';
  const { STORAGE_KEY, monthPrefix, now, pad, uid, lerp } = MF;

  const empty = () => ({ tx: [], budgets: {}, sample: false });

  // null = nunca se guardó nada en este navegador (primera visita)
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.tx)) return { tx: d.tx, budgets: d.budgets || {}, sample: !!d.sample };
    } catch (e) { /* almacenamiento bloqueado o dañado */ }
    return empty();
  }

  const store = {
    db: empty(),
    view: { y: now.getFullYear(), m: now.getMonth(), filter: 'all', q: '' },

    init() {
      const d = load();
      if (d === null) { store.db = sampleData(); store.save(); } // primera visita: ejemplo marcado
      else store.db = d;
    },

    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store.db)); return true; }
      catch (e) { MF.toast && MF.toast('Este navegador no permite guardar. Exportá una copia.'); return false; }
    },

    snapshot: () => JSON.parse(JSON.stringify(store.db)),
    reset() { store.db = empty(); },
    loadSample() { store.db = sampleData(); },

    shift(y, m, d) { const x = new Date(y, m + d, 1); return { y: x.getFullYear(), m: x.getMonth() }; },
    inMonth(y, m) { const p = monthPrefix(y, m); return store.db.tx.filter(t => t.date.startsWith(p)); },
    sum: list => list.reduce((a, t) => { a[t.type] += t.amount; return a; }, { in: 0, out: 0 }),

    add(data) { store.db.tx.push({ id: uid(), created: Date.now(), ...data }); },
    remove(id) { store.db.tx = store.db.tx.filter(t => t.id !== id); },
    find(id) { return store.db.tx.find(t => t.id === id); },
    setBudget(cat, value) { if (value > 0) store.db.budgets[cat] = value; else delete store.db.budgets[cat]; },

    /* Valida y normaliza una copia importada. Devuelve null si no sirve. */
    parseBackup(d) {
      const ok = d && Array.isArray(d.tx) && d.tx.every(t =>
        (t.type === 'in' || t.type === 'out') && t.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(t.date));
      if (!ok) return null;
      return {
        tx: d.tx.map(t => ({
          id: t.id || uid(), created: t.created || Date.now(), type: t.type, amount: +t.amount,
          category: String(t.category || 'Otros'), note: String(t.note || ''), date: t.date,
        })),
        budgets: d.budgets && typeof d.budgets === 'object' ? d.budgets : {},
        sample: !!d.sample,
      };
    },
  };

  /* Datos de ejemplo de los últimos 3 meses, marcados con sample: true. */
  function sampleData() {
    let seed = 20261105;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const r100 = v => Math.round(v / 100) * 100;
    const tx = [];
    for (let k = 2; k >= 0; k--) {
      const { y, m } = store.shift(now.getFullYear(), now.getMonth(), -k);
      const days = k === 0 ? now.getDate() : new Date(y, m + 1, 0).getDate();
      const add = (d, type, category, amount, note) => {
        if (d <= days) tx.push({ id: uid(), created: Date.now() + tx.length, type, category, amount: r100(amount), note, date: `${monthPrefix(y, m)}-${pad(d)}` });
      };
      add(1, 'in', 'Sueldo', 980000, 'Sueldo');
      add(2, 'out', 'Vivienda', 340000, 'Alquiler');
      add(4, 'out', 'Servicios', 36000 + rnd() * 9000, 'Luz y gas');
      add(6, 'out', 'Servicios', 24000, 'Internet');
      add(10, 'out', 'Educación', 45000, 'Curso de inglés');
      add(14, 'in', 'Freelance', 150000 + rnd() * 120000, 'Proyecto web');
      const pool = [
        ['Supermercado', 14000, 42000, 'Súper'], ['Comida', 6000, 19000, 'Almuerzo'], ['Transporte', 1500, 8000, 'SUBE'],
        ['Ocio', 8000, 32000, 'Salida'], ['Salud', 9000, 26000, 'Farmacia'], ['Ropa', 25000, 60000, 'Zapatillas'],
      ];
      for (let d = 1; d <= days; d += 1 + Math.floor(rnd() * 2.4)) {
        const p = pool[Math.min(pool.length - 1, Math.floor(Math.pow(rnd(), 1.6) * pool.length))];
        add(d, 'out', p[0], lerp(p[1], p[2], rnd()), p[3]);
      }
    }
    return { tx, budgets: { Supermercado: 200000, Comida: 90000, Ocio: 70000, Transporte: 45000 }, sample: true };
  }

  MF.store = store;
})(window.MF = window.MF || {});
