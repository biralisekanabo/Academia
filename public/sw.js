/* Service Worker OPENLU — notifications Web Push (app fermée) + cache PWA. */

const CACHE = "openlu-v1";

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["/offline.html"]))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) =>
        Promise.all(cles.filter((cle) => cle !== CACHE).map((cle) => caches.delete(cle)))
      )
      .then(() => self.clients.claim())
  );
});

/* --- Réception d'une notification poussée depuis le serveur --- */
self.addEventListener("push", (evenement) => {
  let donnees = {
    titre: "OpenLu",
    message: "Nouvelle notification",
    lien: "/tableau-de-bord",
    type: "info",
  };

  try {
    if (evenement.data) donnees = { ...donnees, ...evenement.data.json() };
  } catch {
    if (evenement.data) donnees.message = evenement.data.text();
  }

  const options = {
    body: donnees.message || "",
    icon: "/icones/icon-192.png",
    badge: "/icones/badge-96.png",
    image: donnees.image || undefined,
    tag: donnees.lien || "openlu",
    renotify: true,
    data: { url: donnees.lien || "/tableau-de-bord" },
    vibrate: [80, 40, 80],
    actions: [{ action: "ouvrir", title: "Ouvrir" }],
  };

  evenement.waitUntil(
    self.registration.showNotification(donnees.titre || "OpenLu", options)
  );
});

/* --- Clic sur la notification : focus ou ouverture de l'app --- */
self.addEventListener("notificationclick", (evenement) => {
  evenement.notification.close();
  const cible = evenement.notification.data?.url || "/tableau-de-bord";

  evenement.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(cible);
          return client.focus();
        }
      }
      return self.clients.openWindow(cible);
    })
  );
});

/* --- Navigation : réseau d'abord, repli hors ligne --- */
self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET" || new URL(requete.url).origin !== self.location.origin) {
    return;
  }

  evenement.respondWith(
    fetch(requete).catch(async () => {
      const cache = await caches.open(CACHE);
      const miseEnCache = await cache.match(requete);
      if (miseEnCache) return miseEnCache;
      if (requete.mode === "navigate") {
        return (await cache.match("/offline.html")) || Response.error();
      }
      return Response.error();
    })
  );
});
