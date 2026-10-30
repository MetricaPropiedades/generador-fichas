/* Necesario para poder instalarla como app. No guarda copias: siempre muestra la versión publicada. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
