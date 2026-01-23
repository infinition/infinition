const CACHE_NAME = 'infinition-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/csslib.css',
    '/css/terminal.css',
    '/css/acid_pages.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/api.js',
    '/js/ui.js',
    '/js/main.js',
    '/js/portal.js',
    '/js/csslib.js',
    '/js/terminal.js',
    '/js/acid_pages.js',
    '/manifest.webmanifest',
    '/img/icon-180.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Stale-While-Revalidate strategy
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(response => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fallback if network fails and not in cache
                    return response;
                });
                return response || fetchPromise;
            });
        })
    );
});
