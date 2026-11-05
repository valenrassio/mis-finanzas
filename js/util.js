/* Helpers compartidos: DOM, formato de dinero y fechas, constantes. */
(function (MF) {
  'use strict';

  MF.$ = (s, r = document) => r.querySelector(s);
  MF.$$ = (s, r = document) => [...r.querySelectorAll(s)];

  MF.STORAGE_KEY = 'misfinanzas.v1';

  MF.DEFAULT_CATS = {
    out: ['Supermercado', 'Comida', 'Transporte', 'Vivienda', 'Servicios', 'Salud', 'Ocio', 'Ropa', 'Educación', 'Otros'],
    in: ['Sueldo', 'Freelance', 'Ventas', 'Regalos', 'Otros'],
  };
  MF.MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  MF.WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  MF.now = new Date();

  const nf = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  MF.nf = nf;
  MF.money = v => '$ ' + nf.format(Math.abs(Math.round(v)));
  MF.signed = v => (Math.round(v) < 0 ? '−' : '') + MF.money(v);
  MF.plusMinus = v => (Math.round(v) < 0 ? '−' : '+') + MF.money(v);

  MF.pad = n => String(n).padStart(2, '0');
  MF.iso = d => `${d.getFullYear()}-${MF.pad(d.getMonth() + 1)}-${MF.pad(d.getDate())}`;
  MF.monthPrefix = (y, m) => `${y}-${MF.pad(m + 1)}`;
  MF.cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  MF.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  MF.lerp = (a, b, p) => a + (b - a) * p;
  MF.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MF.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Acepta "12.500", "12500,50", "12500.5", "$ 1.200.000"
  MF.parseAmount = function (s) {
    s = String(s).trim().replace(/[\s$]/g, '');
    if (!s) return NaN;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  };
})(window.MF = window.MF || {});
