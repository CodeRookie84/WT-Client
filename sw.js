// sw.js - CORRECTED VERSION THAT IGNORES EXTERNAL REQUESTS

const CACHE_NAME = 'walkie-talkie-cache-v2'; // Increment the version to force an update
const FILES_TO_CACHE = [
  '/',
  'index.html',
  'style.css',
  'script.js'
  // 'icon.png' // Add your icon if you have one
];

// Install the service worker and cache the app shell
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

// Clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// Intercept network requests
self.addEventListener('fetch', (e) => {
  // *** THIS IS THE FIX ***
  // We check if the request is for a page in our app (same origin).
  // We use the 'navigate' mode to ensure we only cache the main page loads.
  if (e.request.mode === 'navigate') {
    // If it is, we try to get it from the network first,
    // and if the network fails (offline), we serve the cached index.html.
    e.respondWith(
      fetch(e.request).catch(() => caches.match('index.html'))
    );
  } else if (FILES_TO_CACHE.includes(new URL(e.request.url).pathname.slice(1))) {
    // For other files in our cache list (like script.js, style.css),
    // we use a "cache-first" strategy.
    e.respondWith(
      caches.match(e.request).then((response) => {
        return response || fetch(e.request);
      })
    );
  }
  // For any other request (like Socket.IO connections to Render, Google Fonts, etc.),
  // we DO NOT call e.respondWith(). This lets the browser handle it normally, fixing the bug.
});
