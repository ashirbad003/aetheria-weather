/**
 * Aetheria Weather Intelligence — Service Worker
 * Provides offline caching for core static app shell while maintaining
 * live fresh requests for meteorological & geographic APIs.
 */

const CACHE_NAME = "aetheria-weather-v2.1.0";
const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./config.js",
    "./locationService.js",
    "./weatherService.js",
    "./imageService.js",
    "./placesService.js",
    "./storageService.js",
    "./script.js",
    "./manifest.json"
];

// Install Event — Cache App Shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event — Clean up stale caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event — Network-first for live weather & external APIs, cache-first for static shell
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Live weather, geocoding, tile, and Wikipedia APIs should always hit network
    const isLiveApi = url.origin !== self.location.origin ||
                      url.pathname.includes("api") ||
                      url.pathname.includes("search") ||
                      url.pathname.includes("forecast") ||
                      url.pathname.includes("tile");

    if (isLiveApi) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // If offline and request is an image, provide empty/placeholder fallback
                return new Response(JSON.stringify({ offline: true, error: "Network unavailable" }), {
                    status: 503,
                    headers: { "Content-Type": "application/json" }
                });
            })
        );
        return;
    }

    // Static Assets — Stale-while-revalidate / Cache-first
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch in background to update cache
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                if (!response || response.status !== 200 || response.type !== "basic") {
                    return response;
                }
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return response;
            });
        })
    );
});
