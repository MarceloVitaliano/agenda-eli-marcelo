const CACHE_NAME = "agenda-em-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Cache básico para trabajar offline
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Manejo de notificaciones push desde el servidor
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "Agenda", body: event.data.text() };
  }

  const title = data.title || "Agenda";
  const body = data.body || "";

  const options = {
    body,
    icon: "icon-192.png",
    badge: "icon-192.png"
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
