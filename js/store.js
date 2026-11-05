/* Datos: carga, guardado, mes visible y consultas.
   Hoy guarda en localStorage. Para pasar a un back, solo cambian load() y save(). */
(function (MF) {
  'use strict';
  const { STORAGE_KEY, DEFAULT_CATS, COLORS, monthPrefix, now, pad, uid, lerp, iso } = MF;

  const OTHER = 'Otros';
  const defaultCats = () => ({ out: [...DEFAULT_CATS.out], in: [...DEFAULT_CATS.in] });
  const empty = () => normalize({ tx: [], budgets: {}, cats: defaultCats(), goals: [], sample: false });
  const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

  /* Completa lo que falte en datos viejos: categorías propias y metas.
     Toda categoría usada en un movimiento queda en la lista, y "Otros" siempre va última. */
  function normalize(d) {
    const db = {
      tx: d.tx,
      budgets: d.budgets && typeof d.budgets === 'object' ? d.budgets : {},
      cats: d.cats && Array.isArray(d.cats.out) && Array.isArray(d.cats.in)
        ? { out: d.cats.out.map(String), in: d.cats.in.map(String) } : defaultCats(),
      goals: Array.isArray(d.goals) ? d.goals : [],
      colors: { out: { ...(d.colors && d.colors.out) }, in: { ...(d.colors && d.colors.in) } },
      sample: !!d.sample,
    };
    // Metas viejas sin la marca: cuentan como cumplidas si ya juntaron el objetivo.
    for (const g of db.goals) if (typeof g.done !== 'boolean') g.done = g.saved >= g.target;
    for (const type of ['out', 'in']) {
      const list = db.cats[type].filter((c, i, a) => c && c !== OTHER && a.findIndex(x => same(x, c)) === i);
      for (const t of db.tx) if (t.type === type && t.category !== OTHER && !list.includes(t.category)) list.push(t.category);
      list.push(OTHER);
      db.cats[type] = list;
      // Colores: cada categoría tiene uno; las nuevas toman el menos usado. "Otros" siempre gris.
      const prev = db.colors[type];
      db.colors[type] = {};
      for (const c of list) {
        if (c === OTHER) db.colors[type][c] = 'gray';
        else db.colors[type][c] = COLORS.includes(prev[c]) ? prev[c] : leastUsed(db.colors[type], type);
      }
    }
    return db;
  }

  /* Orden en que se reparten los colores. Los ingresos arrancan por verde (plata que entra). */
  const ORDER = { out: COLORS, in: ['green', 'aqua', 'blue', 'violet', 'yellow', 'magenta', 'orange', 'red'] };
  function leastUsed(map, type = 'out') {
    const order = ORDER[type];
    const count = Object.fromEntries(order.map(c => [c, 0]));
    for (const v of Object.values(map)) if (v in count) count[v]++;
    return order.reduce((best, c) => (count[c] < count[best] ? c : best), order[0]);
  }

  // null = nunca se guardó nada en este navegador (primera visita)
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return null;
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.tx)) return normalize(d);
    } catch (e) { /* almacenamiento bloqueado o dañado */ }
    return empty();
  }

  const store = {
    db: empty(),
    view: { y: now.getFullYear(), m: now.getMonth(), filter: 'all', q: '' },
    OTHER,
    empty,

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

    /* ---- movimientos ---- */
    add(data) { store.db.tx.push({ id: uid(), created: Date.now(), ...data }); },
    remove(id) { store.db.tx = store.db.tx.filter(t => t.id !== id); },
    find(id) { return store.db.tx.find(t => t.id === id); },
    setBudget(cat, value) { if (value > 0) store.db.budgets[cat] = value; else delete store.db.budgets[cat]; },

    /* ---- categorías ---- */
    cats: type => store.db.cats[type],
    hasCat: (type, name, except) => store.db.cats[type].some(c => same(c, name) && c !== except),

    addCat(type, name) {
      const list = store.db.cats[type];
      list.splice(Math.max(0, list.indexOf(OTHER)), 0, name);
      store.db.colors[type][name] = leastUsed(store.db.colors[type], type);
    },
    color: (type, name) => (store.db.colors[type] && store.db.colors[type][name]) || 'gray',
    setColor(type, name, color) { if (name !== OTHER && COLORS.includes(color)) store.db.colors[type][name] = color; },

    /* Renombra en la lista, en todos los movimientos de ese tipo y en el tope. */
    renameCat(type, from, to) {
      if (from === to || from === OTHER) return;
      const list = store.db.cats[type];
      list[list.indexOf(from)] = to;
      for (const t of store.db.tx) if (t.type === type && t.category === from) t.category = to;
      store.db.colors[type][to] = store.db.colors[type][from];
      delete store.db.colors[type][from];
      if (type === 'out' && from in store.db.budgets) { store.db.budgets[to] = store.db.budgets[from]; delete store.db.budgets[from]; }
    },

    /* Borra la categoría: sus movimientos pasan a "Otros". Devuelve cuántos se movieron. */
    removeCat(type, name) {
      if (name === OTHER) return 0;
      store.db.cats[type] = store.db.cats[type].filter(c => c !== name);
      delete store.db.colors[type][name];
      let moved = 0;
      for (const t of store.db.tx) if (t.type === type && t.category === name) { t.category = OTHER; moved++; }
      if (type === 'out') delete store.db.budgets[name];
      return moved;
    },

    /* ---- metas ---- */
    findGoal: id => store.db.goals.find(g => g.id === id),
    addGoal({ name, target, saved = 0, deadline = '' }) {
      const g = { id: uid(), created: Date.now(), name, target, saved: Math.max(0, saved), deadline, history: [], done: false, doneAt: '' };
      if (g.saved >= g.target) { g.done = true; g.doneAt = iso(new Date()); }
      if (g.saved > 0) g.history.push({ date: iso(new Date()), amount: g.saved });
      store.db.goals.push(g);
      return g;
    },
    updateGoal(id, data) {
      const g = store.findGoal(id);
      if (!g) return;
      if ('saved' in data && data.saved !== g.saved) g.history.push({ date: iso(new Date()), amount: data.saved - g.saved });
      Object.assign(g, data);
      if (!g.done && g.saved >= g.target) { g.done = true; g.doneAt = iso(new Date()); }
    },
    removeGoal(id) { store.db.goals = store.db.goals.filter(g => g.id !== id); },
    /* Suma (o resta, si amount < 0) plata a una meta. Nunca baja de cero. Devuelve lo que realmente se movió. */
    contribute(id, amount) {
      const g = store.findGoal(id);
      if (!g) return 0;
      const real = Math.max(-g.saved, amount);
      g.saved = Math.round((g.saved + real) * 100) / 100;
      if (real) g.history.push({ date: iso(new Date()), amount: real });
      if (!g.done && g.saved >= g.target) { g.done = true; g.doneAt = iso(new Date()); } // llegó al objetivo
      return real;
    },
    /* Marcar una meta como cumplida (aunque no se haya juntado todo) o volver a abrirla. */
    setGoalDone(id, done) {
      const g = store.findGoal(id);
      if (!g) return;
      g.done = done;
      g.doneAt = done ? iso(new Date()) : '';
    },

    /* Valida y normaliza una copia importada. Devuelve null si no sirve. */
    parseBackup(d) {
      const ok = d && Array.isArray(d.tx) && d.tx.every(t =>
        (t.type === 'in' || t.type === 'out') && t.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(t.date));
      if (!ok) return null;
      const goals = (Array.isArray(d.goals) ? d.goals : [])
        .filter(g => g && g.name && g.target > 0)
        .map(g => ({
          id: g.id || uid(), created: g.created || Date.now(), name: String(g.name).slice(0, 40), target: +g.target,
          saved: Math.max(0, +g.saved || 0), deadline: /^\d{4}-\d{2}$/.test(g.deadline) ? g.deadline : '',
          history: Array.isArray(g.history) ? g.history : [],
          ...(typeof g.done === 'boolean' ? { done: g.done } : {}),
          doneAt: /^\d{4}-\d{2}-\d{2}$/.test(g.doneAt) ? g.doneAt : '',
        }));
      return normalize({
        tx: d.tx.map(t => ({
          id: t.id || uid(), created: t.created || Date.now(), type: t.type, amount: +t.amount,
          category: String(t.category || OTHER), note: String(t.note || ''), date: t.date,
        })),
        budgets: d.budgets,
        cats: d.cats,
        colors: d.colors,
        goals,
        sample: !!d.sample,
      });
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
    const monthsAhead = k => { const x = store.shift(now.getFullYear(), now.getMonth(), k); return `${x.y}-${pad(x.m + 1)}`; };
    const goal = (name, target, saved, deadline, k) => ({
      id: uid(), created: Date.now() - k, name, target, saved, deadline, history: [{ date: iso(now), amount: saved }],
    });
    const goals = [
      goal('Fondo de emergencia', 1500000, 620000, monthsAhead(8), 3),
      goal('Viaje a Bariloche', 900000, 310000, monthsAhead(5), 2),
      goal('Notebook nueva', 1200000, 1200000, '', 1),
    ];
    return normalize({ tx, budgets: { Supermercado: 200000, Comida: 90000, Ocio: 70000, Transporte: 45000 }, goals, sample: true });
  }

  MF.store = store;
})(window.MF = window.MF || {});
