const CACHE_NAME = 'oficio-v1';
const ASSETS = [
  'index.html',
  'comics.html',
  'manifest.json'
];

// Instala o Service Worker e guarda os ficheiros essenciais em cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Serve os ficheiros a partir da cache quando estiver offline (melhora a velocidade)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});