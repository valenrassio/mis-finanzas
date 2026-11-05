/* Service worker: guarda todos los archivos de la app para que abra sin internet.
   Cada vez que cambies un archivo, subí el número de VERSION así el celular baja la versión nueva. */
const VERSION = 'v2';
const CACHE = `misfinanzas-${VERSION}`;
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'fonts/inter-tight-latin.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'css/fonts.css',
  'css/tokens.css',
  'css/base.css',
  'css/header.css',
  'css/nav.css',
  'css/hero.css',
  'css/lists.css',
  'css/views.css',
  'css/sheet.css',
  'css/responsive.css',
  'css/app.css',
  'js/util.js',
  'js/motion.js',
  'js/store.js',
  'js/toast.js',
  'js/chart.js',
  'js/categories.js',
  'js/movements.js',
  'js/goals.js',
  'js/home.js',
  'js/cat-manage.js',
  'js/nav.js',
  'js/sheet.js',
  'js/menu.js',
  'js/pwa.js',
  'js/main.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('misfinanzas-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Primero lo guardado; si no está, la red. Al abrir la app sin conexión siempre responde index.html. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
});
