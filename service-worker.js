// service-worker.js — MAF v5 PWA
const CACHE_NAME = 'maf-v5-cache-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/css/styles.css',
  '/js/utils.js',
  '/js/nav.js',
  '/js/firebase-config.js',
  '/js/firebase-service.js',
  '/js/mock-service.js',
  '/js/username.js',
  '/pages/workbook_setup.html',
  '/pages/workbook.html',
  '/pages/tutor.html',
  '/pages/tutorials.html',
  '/pages/leaderboard.html',
  '/pages/redeem.html',
  '/pages/parent.html',
  '/pages/profile.html',
  '/assets/avatars/a1.svg',
  '/assets/avatars/a2.svg',
  '/assets/avatars/a3.svg',
  '/assets/avatars/a4.svg',
  '/assets/avatars/a5.svg',
  '/assets/avatars/a6.svg',
  '/assets/avatars/a7.svg',
  '/assets/avatars/a8.svg',
  '/assets/avatars/a9.svg',
  '/assets/avatars/a10.svg',
  '/assets/avatars/a11.svg',
  '/assets/avatars/a12.svg',
  '/assets/sfx/correct.wav',
  '/assets/sfx/wrong.wav',
  '/assets/logo.svg',
  '/manifest.json'
];

// INSTALL — cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

// FETCH — network first for API, cache first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept external API calls
  const bypass = [
    'firestore.googleapis.com', 'firebase.googleapis.com',
    'identitytoolkit.googleapis.com', 'workers.dev',
    'gstatic.com', 'googleapis.com', 'anthropic.com'
  ];
  if (bypass.some(h => url.hostname.includes(h))) return;

  // Navigation — network first, cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match('/index.html')))
    );
    return;
  }

  // Static assets — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      }).catch(() => {
        if (event.request.destination === 'image') return caches.match('/assets/avatars/a1.svg');
      });
    })
  );
});

// PUSH NOTIFICATIONS — foundation for future use
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'MAF', {
      body: data.body || '',
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
