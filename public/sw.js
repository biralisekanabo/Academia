/* Service Worker ACADEMIA — notifications Web Push (app fermée) + installation PWA. */

const CACHE = "academia-v1";

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
    titre: "Academia",
    message: "Nouvelle notification",
    lien: "/accueil",
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
    tag: donnees.lien || "academia",
    renotify: true,
    data: { url: donnees.lien || "/accueil" },
    vibrate: [80, 40, 80],
    actions: [{ action: "ouvrir", title: "Ouvrir" }],
  };

  evenement.waitUntil(
    self.registration.showNotification(donnees.titre || "Academia", options)
  );
});

/* --- Clic sur la notification : focus ou ouverture de l'app --- */
self.addEventListener("notificationclick", (evenement) => {
  evenement.notification.close();
  const cible = evenement.notification.data?.url || "/accueil";

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

/* --- Navigations : réseau d'abord, repli hors ligne ---
   On n'intercepte QUE les navigations de page. Les autres requêtes (JS, CSS,
   images, données RSC) sont laissées au navigateur afin de ne jamais casser
   le chargement de l'application en cas de pépin réseau. */
self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET" || requete.mode !== "navigate") return;

  let origine;
  try {
    origine = new URL(requete.url).origin;
  } catch {
    return;
  }
  if (origine !== self.location.origin) return;

  evenement.respondWith(
    fetch(requete).catch(async () => {
      const cache = await caches.open(CACHE);
      const horsLigne = await cache.match("/offline.html");
      if (horsLigne) return horsLigne;
      throw new Error("Réseau indisponible");
    })
  );
});
