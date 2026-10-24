// Service worker: оболочка приложения работает офлайн, API и аудио никогда не кэшируем.
const V = 'neo-__BUILD__';
const SHELL = ['/', '/manifest.json', '/icon.svg', '/favicon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('neo-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (r.mode === 'navigate') { // сеть → кэш оболочки
    e.respondWith(fetch(r).then(res => { caches.open(V).then(c => c.put('/', res.clone())); return res; }).catch(() => caches.match('/')));
    return;
  }
  if (u.pathname.startsWith('/assets/')) { // файлы с хэшем в имени: кэш → сеть
    e.respondWith(caches.match(r).then(h => h || fetch(r).then(res => { if (res.ok) caches.open(V).then(c => c.put(r, res.clone())); return res; })));
    return;
  }
  e.respondWith(fetch(r).catch(() => caches.match(r)));
});
