// A raiz publicada no Vercel é a pasta frontend/, então os caminhos aqui partem dela.
const CACHE_NAME = 'oficio-v2';
const ASSETS = [
  '/index.html',
  '/login-aluno.html',
  '/style.css',
  '/papyrus-theme.css',
  '/assets/app-icon.png',
  '/manifest.json'
];

// Instala o Service Worker e guarda os ficheiros essenciais em cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Remove caches de versões antigas ao ativar
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(
        nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Nunca cacheia chamadas de API: os dados precisam vir sempre do servidor.
  if (req.method !== 'GET' || req.url.includes('/api/')) return;

  const ehPagina = req.mode === 'navigate' || req.destination === 'document';

  if (ehPagina) {
    // Páginas: rede primeiro, para o aluno sempre ver a versão publicada mais recente.
    // Só cai para o cache se estiver offline.
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copia));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Demais arquivos (CSS, imagens): cache primeiro, por velocidade.
  e.respondWith(
    caches.match(req).then((res) => res || fetch(req))
  );
});
