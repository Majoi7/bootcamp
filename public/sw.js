const CACHE_NAME = 'amphix-v1';
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/connexion',
    '/favicon-96x96.png',
    '/favicon.svg',
    '/favicon.ico',
    '/apple-touch-icon.png',
    '/web-app-manifest-192x192.png',
    '/web-app-manifest-512x512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                .filter((name) => name !== CACHE_NAME)
                .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ne jamais intercepter/cacher :
    // - les méthodes autres que GET
    // - les requêtes vers Supabase (données dynamiques)
    // - les schémas autres que http/https (chrome-extension:, moz-extension:, data:, etc.)
    //   -> c'est ce dernier cas qui causait l'erreur "Request scheme 'chrome-extension'
    //   is unsupported" : le Cache API ne sait tout simplement pas stocker ces requêtes.
    if (
        event.request.method !== 'GET' ||
        event.request.url.includes('supabase.co') ||
        (url.protocol !== 'http:' && url.protocol !== 'https:')
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
        .then((response) => {
            if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
        })
        .catch(() =>
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                if (event.request.mode === 'navigate') return caches.match('/');
                return new Response('Offline', { status: 503 });
            })
        )
    );
});

// ═══════════════════════════════════════════════════
// Notifications push — Amphix PWA
// ═══════════════════════════════════════════════════

self.addEventListener('push', (event) => {
    let data = { title: 'Amphix', body: 'Nouvelle notification' };
    try {
        data = event.data ? event.data.json() : data;
    } catch (e) {
        data.body = event.data ? event.data.text() : data.body;
    }

    const title = data.title || 'Amphix';
    const options = {
        body: data.body || '',
        icon: '/web-app-manifest-192x192.png',
        badge: '/web-app-manifest-192x192.png',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/dashboard' },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/dashboard';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
            const existing = clientsArr.find((c) => c.url.includes(url));
            if (existing) return existing.focus();
            return self.clients.openWindow(url);
        })
    );
});