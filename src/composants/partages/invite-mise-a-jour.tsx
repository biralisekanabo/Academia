"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Bouton } from "@/composants/ui/bouton";
import { cn } from "@/utilitaires/cn";

const INTERVALLE_VERIFICATION = 60_000;

/**
 * Détecte l'arrivée d'une nouvelle version déployée et propose de recharger
 * l'application. Deux signaux : l'identifiant de version exposé par
 * /api/version, et l'activation d'un nouveau service worker.
 */
export function InviteMiseAJour({ versionInitiale }: { versionInitiale: string }) {
  const t = useTranslations();
  const [disponible, setDisponible] = useState(false);
  const [rechargement, setRechargement] = useState(false);

  const versionIgnoree = useRef<string | null>(null);
  const versionDistante = useRef<string | null>(null);

  const verifier = useCallback(async () => {
    try {
      const reponse = await fetch("/api/version", { cache: "no-store" });
      if (!reponse.ok) return;
      const donnees = (await reponse.json()) as { version?: string };
      if (!donnees.version) return;
      versionDistante.current = donnees.version;
      if (
        donnees.version !== versionInitiale &&
        donnees.version !== versionIgnoree.current
      ) {
        setDisponible(true);
      }
    } catch {
      // Hors ligne : on réessaiera au prochain cycle.
    }
  }, [versionInitiale]);

  useEffect(() => {
    if (versionInitiale === "dev") return;

    const minuterie = window.setInterval(() => {
      if (document.visibilityState === "visible") void verifier();
    }, INTERVALLE_VERIFICATION);

    const auReveil = () => {
      if (document.visibilityState === "visible") void verifier();
    };
    document.addEventListener("visibilitychange", auReveil);
    window.addEventListener("focus", auReveil);

    const premierControle = window.setTimeout(() => void verifier(), 1500);

    return () => {
      window.clearTimeout(premierControle);
      window.clearInterval(minuterie);
      document.removeEventListener("visibilitychange", auReveil);
      window.removeEventListener("focus", auReveil);
    };
  }, [versionInitiale, verifier]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let annule = false;

    void navigator.serviceWorker.getRegistration().then((enregistrement) => {
      if (!enregistrement || annule) return;
      if (enregistrement.waiting && navigator.serviceWorker.controller) {
        setDisponible(true);
      }
      enregistrement.addEventListener("updatefound", () => {
        const nouveau = enregistrement.installing;
        if (!nouveau) return;
        nouveau.addEventListener("statechange", () => {
          if (nouveau.state === "installed" && navigator.serviceWorker.controller) {
            setDisponible(true);
          }
        });
      });
    });

    return () => {
      annule = true;
    };
  }, []);

  const ignorer = useCallback(() => {
    versionIgnoree.current = versionDistante.current;
    setDisponible(false);
  }, []);

  const recharger = useCallback(() => {
    setRechargement(true);
    const rechargementEffectif = () => window.location.reload();
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((enregistrement) => {
          enregistrement?.waiting?.postMessage({ type: "SKIP_WAITING" });
          rechargementEffectif();
        })
        .catch(rechargementEffectif);
    } else {
      rechargementEffectif();
    }
  }, []);

  if (!disponible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[95] flex justify-center p-4 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:justify-end">
      <div className="animate-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-brand-2/30 bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-1/15 text-brand-2">
          <Sparkles className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold">{t("miseAJour.titre")}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("miseAJour.message")}</p>
          <div className="mt-3 flex gap-2">
            <Bouton taille="sm" onClick={recharger} disabled={rechargement}>
              <RefreshCw className={cn("size-3.5", rechargement && "animate-spin")} />
              {t("miseAJour.recharger")}
            </Bouton>
            <Bouton taille="sm" variante="fantome" onClick={ignorer}>
              {t("miseAJour.plusTard")}
            </Bouton>
          </div>
        </div>
        <button
          type="button"
          onClick={ignorer}
          aria-label={t("commun.fermer")}
          className="-mr-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-200 hover:rotate-90 hover:bg-accent hover:text-accent-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
