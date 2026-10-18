"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Monitor, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Modale } from "@/composants/partages/modale";
import { Bouton } from "@/composants/ui/bouton";
import { cn } from "@/utilitaires/cn";

type EvenementInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Plateforme = "android" | "ios" | "desktop";

function detecterPlateforme(): Plateforme {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "desktop";
}

export function BoutonTelechargerApp({ className }: { className?: string }) {
  const t = useTranslations();
  const [evenement, setEvenement] = useState<EvenementInstallation | null>(null);
  const [installe, setInstalle] = useState(false);
  const [plateforme, setPlateforme] = useState<Plateforme>("desktop");
  const [aideOuverte, setAideOuverte] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    // Détection de la plateforme après montage (nécessite le navigateur).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlateforme(detecterPlateforme());
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setInstalle(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvenement(e as EvenementInstallation);
    };
    const onInstalle = () => {
      setInstalle(true);
      setEvenement(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalle);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalle);
    };
  }, []);

  const installer = useCallback(async () => {
    if (!evenement) {
      setAideOuverte(true);
      return;
    }
    setEnCours(true);
    try {
      await evenement.prompt();
      const choix = await evenement.userChoice;
      if (choix.outcome === "accepted") setInstalle(true);
    } finally {
      setEvenement(null);
      setEnCours(false);
    }
  }, [evenement]);

  if (installe) return null;

  const Icone = plateforme === "desktop" ? Monitor : Smartphone;

  return (
    <>
      <button
        type="button"
        onClick={installer}
        disabled={enCours}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-brand-2/30 bg-brand-1/10 px-3 py-2 text-xs font-medium text-brand-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-1/20 hover:shadow-md disabled:opacity-50",
          className
        )}
      >
        <Icone className="size-4" />
        {t("installation.telecharger")}
        <Download className={cn("size-3.5", enCours && "animate-pulse")} />
      </button>

      <Modale
        ouvert={aideOuverte}
        titre={t("installation.titre")}
        sousTitre={t("installation.sousTitre")}
        onFermer={() => setAideOuverte(false)}
      >
        <ol className="space-y-3 text-sm text-muted-foreground">
          {plateforme === "ios" ? (
            <>
              <li>{t("installation.iosEtape1")}</li>
              <li>{t("installation.iosEtape2")}</li>
              <li>{t("installation.iosEtape3")}</li>
            </>
          ) : plateforme === "android" ? (
            <>
              <li>{t("installation.androidEtape1")}</li>
              <li>{t("installation.androidEtape2")}</li>
              <li>{t("installation.androidEtape3")}</li>
            </>
          ) : (
            <>
              <li>{t("installation.desktopEtape1")}</li>
              <li>{t("installation.desktopEtape2")}</li>
              <li>{t("installation.desktopEtape3")}</li>
            </>
          )}
        </ol>
        <div className="mt-6 flex justify-end">
          <Bouton onClick={() => setAideOuverte(false)}>
            {t("commun.terminer")}
          </Bouton>
        </div>
      </Modale>
    </>
  );
}