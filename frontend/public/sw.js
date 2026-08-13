/*
 * Service Worker — Poissonnerie
 *
 * IMPORTANT :
 * - index.html est toujours demandé au réseau en priorité.
 * - Les fichiers JS/CSS/images générés par Vite peuvent être mis en cache.
 * - Les anciennes versions du cache sont supprimées à l'activation.
 * - Le SW prend immédiatement le contrôle des pages.
 */

const CACHE_NAME = 'poissonnerie-static-v3';
const APP_SHELL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(APP_SHELL))
  );

  // Active immédiatement le nouveau Service Worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // On ne traite que les requêtes GET.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ne jamais intercepter les API, uploads ou Socket.IO.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/uploads/')) return;
  if (url.pathname.startsWith('/socket.io/')) return;

  // ============================================================
  // NAVIGATION / index.html
  // ============================================================
  // C'est la partie la plus importante :
  // toujours chercher la dernière version sur Vercel.
  if (request.mode === 'navigate' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(APP_SHELL, copy);
            });
          }

          return response;
        })
        .catch(() => caches.match(APP_SHELL))
    );

    return;
  }

  // ============================================================
  // ASSETS VITE : JS / CSS / images / fonts
  // ============================================================
  // Vite donne normalement des noms hashés aux assets de production
  // (ex: index-Bx8a12.js). On peut donc les mettre en cache.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((response) => {
        if (!response || !response.ok) return response;

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, copy);
        });

        return response;
      });
    })
  );
});

// Synchronisation de la file offline.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'TRIGGER_SYNC' });
        });
      })
    );
  }
});
