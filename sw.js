/* =========================================
   Service Worker - Clock & Weather PWA
   ========================================= */

const CACHE = 'clock-weather-v2';
const STATIC = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icons/icon.svg',
];

// --- Install ---
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => {
            return cache.addAll(STATIC).then(() => self.skipWaiting());
        }),
    );
});

// --- Activate ---
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
        ).then(() => self.clients.claim()),
    );
});

// --- Fetch ---
self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // API requests => network first
    if (url.hostname.includes('open-meteo.com') || url.hostname === 'nominatim.openstreetmap.org') {
        event.respondWith(networkFirst(request));
        return;
    }

    // Same-origin static assets => cache first
    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Cross-origin (fonts, etc.) => network first
    event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const res = await fetch(request);
        if (res.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, res.clone());
        }
        return res;
    } catch {
        return new Response(null, { status: 503, statusText: 'Offline' });
    }
}

async function networkFirst(request) {
    try {
        const res = await fetch(request);
        if (res.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, res.clone());
        }
        return res;
    } catch {
        const cached = await caches.match(request);
        return cached || new Response(null, { status: 503, statusText: 'Offline' });
    }
}
