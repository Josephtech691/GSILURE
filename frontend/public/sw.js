const CACHE_NAME = 'poissonnerie-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

// Installation : mise en cache des assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activation : nettoyage anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stratégie : Network First pour l'API, Cache First pour les assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API : network first, fallback vers cache si hors ligne
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Mettre en cache les réponses GET réussies
          if (event.request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets statiques : cache first
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
      )
  );
});

// Sync en arrière-plan (Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  // Envoyer un message aux clients pour déclencher la sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'TRIGGER_SYNC' }));
}
