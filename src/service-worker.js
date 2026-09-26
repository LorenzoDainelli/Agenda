/* Agenda — service worker.
 *
 * Serve a due cose: far partire l'app anche senza connessione, e sostituirla
 * con la versione nuova quando ce n'è una, senza che l'utente debba fare
 * niente.
 *
 * CACHE_VERSION non va aggiornata a mano: al momento della pubblicazione il
 * workflow ci scrive l'identificativo del commit, così ogni versione nuova
 * arriva davvero sul telefono. In locale resta "dev".
 *
 * Un file .js nuovo va aggiunto a CORE_ASSETS, se no l'app non parte offline
 * (regola 8 del piano).
 */

const CACHE_VERSION = "dev";
const CACHE_NAME = `agenda-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./css/app.css",
  "./css/components.css",
  "./css/tokens/colors.css",
  "./css/tokens/typography.css",
  "./css/tokens/space.css",
  "./js/app.js",
  "./js/backup.js",
  "./js/calendar.js",
  "./js/compose.js",
  "./js/days.js",
  "./js/i18n.js",
  "./js/model.js",
  "./js/planner.js",
  "./js/review.js",
  "./js/settings.js",
  "./js/shopping.js",
  "./js/shopping-view.js",
  "./js/storage.js",
  "./js/subjects.js",
  "./js/tasks.js",
  "./js/timetable.js",
  "./js/timetable-view.js",
  "./js/ui.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/*
 * Dalla cache si parte subito (l'app si apre anche offline), e intanto in
 * sottofondo si controlla se il file è cambiato: la versione nuova sarà
 * pronta alla riapertura successiva.
 */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
