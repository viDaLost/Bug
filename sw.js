/* sw.js */
const CACHE_NAME = 'accbook-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './sw.js',
  './manifest.webmanifest',
  'https://cdn.tailwindcss.com',
  'https://telegram.org/js/telegram-web-app.js',
];

self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=> cache.addAll(ASSETS))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys()
      .then(keys=> Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(networkRes => {
        const copy = networkRes.clone();
        caches.open(CACHE_NAME).then(cache=> cache.put(req, copy)).catch(()=>{});
        return networkRes;
      }).catch(()=> cached || new Response('Офлайн', {status: 200}));
      return cached || fetchPromise;
    })
  );
});
