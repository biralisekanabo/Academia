"use client";

import { useEffect, useState } from "react";
import { BellRing, Check, Download, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Bouton } from "@/composants/ui/bouton";
import { usePush } from "@/crochets/use-push";

type EvenementInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Invite l'utilisateur à installer l'app (PWA) et à activer les notifications.
 * Affiche l'installation uniquement lorsque le navigateur le permet.
 */
export function InvitationApp({
  className,
  connecte = true,
}: {
  className?: string;
  connecte?: boolean;
}) {
  const t = useTranslations();
  const { supporte, permission, abonne, chargement, activer } = usePush();

  const [evenement, setEvenement] = useState<EvenementInstallation | null>(null);
  const [installe, setInstalle] = useState(false);

  useEffect(() => {
    const surInvite = (e: Event) => {
      e.preventDefault();
      setEvenement(e as EvenementInstallation);
    };
    const surInstalle = () => {
      setInstalle(true);
      setEvenement(null);
    };
    window.addEventListener("beforeinstallprompt", surInvite);
    window.addEventListener("appinstalled", surInstalle);

    const autonome =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (autonome) {
      queueMicrotask(() => setInstalle(true));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", surInvite);
      window.removeEventListener("appinstalled", surInstalle);
    };
  }, []);

  async function installer() {
    if (!evenement) return;
    await evenement.prompt();
    const choix = await evenement.userChoice;
    if (choix.outcome === "accepted") setInstalle(true);
    setEvenement(null);
  }

  const afficherInstallation = !installe && Boolean(evenement);
  const peutNotifier = connecte && supporte;
  const notificationsActives = abonne && permission === "granted";

  if (!afficherInstallation && !peutNotifier) return null;

  return (
    <section
      className={`carte-vitrine flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-1/10 text-brand-2">
          <Smartphone className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">{t("installer.titre")}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {t("installer.aide")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {afficherInstallation && (
          <Bouton type="button" variante="contour" taille="sm" onClick={() => void installer()}>
            <Download />
            {t("installer.bouton")}
          </Bouton>
        )}
        {peutNotifier && (
          <Bouton
            type="button"
            variante={notificationsActives ? "secondaire" : "parDefaut"}
            taille="sm"
            disabled={chargement || notificationsActives}
            onClick={() => void activer()}
          >
            {notificationsActives ? <Check /> : <BellRing />}
            {notificationsActives ? t("installer.notificationsActives") : t("installer.activerNotifications")}
          </Bouton>
        )}
      </div>
    </section>
  );
}
