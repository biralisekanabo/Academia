"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker (indispensable pour l'installation PWA et,
 * plus tard, les notifications Web Push app fermée).
 */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((enregistrement) => {
        void enregistrement.update().catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);

  return null;
}
