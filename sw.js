// sw.js - UPGRADED FOR OFFLINE CACHING

const CACHE_NAME = 'walkie-talkie-cache-v1';
const FILES_TO_CACHE = [
  '/',
  'index.html',
  'style.css',
  'script.js'
  // NOTE: You would also add your icon.png here if you have one
  // 'icon.png' 
];

// 1. Install the service worker and cache the app shell
self.addEventListener('install', (e) => {
  console.log('[ServiceWorker] Install');
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Intercept network requests and serve from cache first
self.addEventListener('fetch', (e) => {
  console.log(`[ServiceWorker] Fetching ${e.request.url}`);
  e.respondWith(
    caches.match(e.request).then((response) => {
      // If the file is in the cache, serve it. Otherwise, fetch from the network.
      return response || fetch(e.request);
    })
  );
});
