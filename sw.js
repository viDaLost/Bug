/* sw.js */
const CACHE_NAME = 'accbook-cache-v4';

const ASSETS = [
  './',
  './index.html',
  './sw.js',
  './manifest.webmanifest',
  // внешние зависимости
  'https://cdn.tailwindcss.com',
  'https://telegram.org/js/telegram-web-app.js',
];

// Установка: кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация: чистим старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Стратегия: cache-first для статики из ASSETS, network-first для остального GET
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isAsset = ASSETS.some((a) => {
    try { return new URL(a, self.location).href === url.href; }
    catch { return a === req.url || a === req.referrer; }
  });

  if (isAsset) {
    // cache-first для неизменяемых ассетов
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // network-first для всего остального (страницы, данные)
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        return cached || new Response('Офлайн-режим: ресурс недоступен.', {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});

// Опционально: фоновое обновление критичных ресурсов
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-core-assets') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) =>
        Promise.all(ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) await cache.put(url, res.clone());
          } catch (_) {}
        }))
      )
    );
  }
});
