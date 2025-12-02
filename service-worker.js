const CACHE_NAME = "agenda-em-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json"
];

// Instalar y cachear los archivos básicos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activar (aquí podríamos limpiar caches viejos si cambiamos de versión)
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Responder las peticiones con "cache first"
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si está en cache → lo regreso, si no → voy a la red
      return response || fetch(event.request);
    })
  );
});
