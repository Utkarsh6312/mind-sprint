const CACHE_NAME = 'mindsprint-v1.1.0';

// Relative assets to cache
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './js/storage.js',
  './js/sound.js',
  './js/generators.js',
  './js/engine.js',
  './js/ui.js',
  './manifest.json',
  './favicon.svg',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png'
];

// Install: cache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Fetch each asset individually so one failing doesn't break entire cache
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => {
          return fetch(asset, { cache: 'no-cache' }).then((response) => {
            if (response.ok) {
              return cache.put(asset, response);
            }
          }).catch((err) => {
            console.warn(`[SW] Failed to cache: ${asset}`, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log(`[SW] Deleting obsolete cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for local assets, network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Only handle GET requests from same-origin
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // If offline and not in cache, fallback
        if (cachedResponse) return cachedResponse;
        if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
        throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// Listen for message to skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
