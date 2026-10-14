"use client";

import { useCallback, useEffect, useState } from "react";

import {
  enregistrerAbonnementPush,
  supprimerAbonnementPush,
} from "@/actions/notifications";
import { abonnerPush, abonnementExistant, supportePush } from "@/utilitaires/push-client";

export function usePush() {
  const [supporte, setSupporte] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [abonne, setAbonne] = useState(false);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    let actif = true;
    const initialiser = async () => {
      await Promise.resolve();
      if (!actif) return;
      const ok = supportePush();
      setSupporte(ok);
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
      if (ok && Notification.permission === "granted") {
        try {
          const abonnement = await abonnementExistant();
          if (actif) setAbonne(Boolean(abonnement));
        } catch {
          // Silencieux : l'utilisateur peut réactiver manuellement.
        }
      }
    };
    void initialiser();
    return () => {
      actif = false;
    };
  }, []);

  const activer = useCallback(async (): Promise<boolean> => {
    if (!supportePush()) return false;
    setChargement(true);
    try {
      const resultat = await Notification.requestPermission();
      setPermission(resultat);
      if (resultat !== "granted") return false;

      const abonnement = await abonnerPush();
      if (!abonnement) return false;

      const json = abonnement.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

      const reponse = await enregistrerAbonnementPush({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        userAgent: navigator.userAgent,
      });
      if (reponse.erreur) return false;

      setAbonne(true);
      return true;
    } catch {
      return false;
    } finally {
      setChargement(false);
    }
  }, []);

  const desactiver = useCallback(async (): Promise<void> => {
    setChargement(true);
    try {
      const abonnement = await abonnementExistant();
      if (abonnement) {
        await supprimerAbonnementPush(abonnement.endpoint);
        await abonnement.unsubscribe();
      }
      setAbonne(false);
    } finally {
      setChargement(false);
    }
  }, []);

  return { supporte, permission, abonne, chargement, activer, desactiver };
}
