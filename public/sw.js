/**
 * Steadfast Workbench — Service Worker
 *
 * Strategy:
 *  • Pre-cache the app shell on install (index.html, manifest, logo)
 *  • Cache-first for content-hashed /assets/* (JS/CSS chunks — they never go stale)
 *  • Network-only for all Supabase API and chat-worker calls (never serve stale financial data)
 *  • Network-first for navigation — fall back to cached index.html so the SPA still boots offline
 *  • Old caches are deleted on activate whenever CACHE_VERSION is bumped
 */

const CACHE_VERSION = 'v4';
const CACHE_NAME = `steadfast-shell-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/steadfast-logo.png',
];

// These patterns always go straight to the network — never cache API or live-chat traffic
const NETWORK_ONLY_RE = [
  /supabase\.co/,
  /workers\.dev/,
  /chat-api\./,
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: delete stale caches from previous versions ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('steadfast-shell-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  // Never intercept API / realtime traffic
  if (NETWORK_ONLY_RE.some((re) => re.test(request.url))) return;

  const url = new URL(request.url);

  // Cache-first for content-hashed Vite asset chunks (/assets/*.js, /assets/*.css)
  // These filenames include a hash so they are immutable — safe to cache forever.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(request, response.clone()))
              .catch(() => {});
          }
          return response;
        });
      }),
    );
    return;
  }

  // Network-first for SPA navigation — fall back to cached index.html
  // This keeps the SPA functional on flaky/offline mobile connections.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/').then((cached) => cached ?? Response.error()),
      ),
    );
    return;
  }

  // Stale-while-revalidate for remaining same-origin assets (logo, manifest, etc.)
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()))
            .catch(() => {});
        }
        return response;
      }).catch(() => cached ?? Response.error());
      return cached ?? networkFetch;
    }),
  );
});
