"use client";

import { useEffect } from "react";

import { abonnerPush, abonnementExistant, supportePush } from "@/utilitaires/push-client";
import { enregistrerAbonnementPush } from "@/actions/notifications";

/**
 * Enregistre le service worker (indispensable pour les notifications Web Push
 * app fermée et l'installation PWA) et rafraîchit silencieusement l'abonnement
 * push si la permission a déjà été accordée.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (enregistrement) => {
        void enregistrement.update().catch(() => undefined);
        if (!supportePush() || Notification.permission !== "granted") return;
        try {
          const abonnement = (await abonnementExistant()) ?? (await abonnerPush());
          if (!abonnement) return;
          const json = abonnement.toJSON();
          if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
          await enregistrerAbonnementPush({
            endpoint: json.endpoint,
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
            userAgent: navigator.userAgent,
          });
        } catch {
          // Silencieux : l'utilisateur pourra réactiver via la cloche.
        }
      })
      .catch(() => undefined);
  }, []);

  return null;
}
