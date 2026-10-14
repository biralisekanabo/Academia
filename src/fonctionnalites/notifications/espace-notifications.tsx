"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Megaphone,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useNotifications } from "@/crochets/use-notifications";
import { usePush } from "@/crochets/use-push";
import { Bouton } from "@/composants/ui/bouton";
import { useRouter } from "@/i18n/navigation";
import type { TypeNotification } from "@/types/database";
import { cn } from "@/utilitaires/cn";
import { formatTempsRelatif } from "@/utilitaires/format";

const STYLES: Record<TypeNotification, { icone: LucideIcon; fond: string; libelle: string }> = {
  info: { icone: Info, fond: "bg-brand-1/15 text-brand-2", libelle: "info" },
  succes: {
    icone: CheckCircle2,
    fond: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    libelle: "info",
  },
  alerte: {
    icone: AlertTriangle,
    fond: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    libelle: "info",
  },
  paiement: {
    icone: Wallet,
    fond: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    libelle: "info",
  },
  note: {
    icone: ClipboardCheck,
    fond: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    libelle: "info",
  },
  annonce: {
    icone: Megaphone,
    fond: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    libelle: "info",
  },
};

export function EspaceNotifications({ utilisateurId }: { utilisateurId: string }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const [filtre, setFiltre] = useState<"toutes" | "nonLues">("toutes");

  const {
    notifications,
    nonLues,
    chargement,
    marquerLue,
    toutMarquerLues,
    supprimer,
  } = useNotifications(utilisateurId);

  const push = usePush();

  const visibles = useMemo(
    () => (filtre === "nonLues" ? notifications.filter((n) => !n.lue) : notifications),
    [filtre, notifications]
  );

  async function ouvrir(lien: string | null, id: string, lue: boolean) {
    if (!lue) await marquerLue(id);
    if (lien) router.push(lien);
  }

  return (
    <div className="space-y-5">
      {push.supporte && (
        <div className="carte-vitrine flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-2xl",
                push.abonne
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-brand-1/15 text-brand-2"
              )}
            >
              <BellRing className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">
                {push.abonne ? t("pushActif") : t("pushActiver")}
              </p>
              <p className="text-xs text-muted-foreground">
                {push.permission === "denied"
                  ? t("pushRefuse")
                  : push.abonne
                    ? t("pushActifAide")
                    : t("pushActiverAide")}
              </p>
            </div>
          </div>
          <Bouton
            variante={push.abonne ? "contour" : "parDefaut"}
            taille="sm"
            disabled={push.chargement || push.permission === "denied"}
            onClick={() => (push.abonne ? push.desactiver() : push.activer())}
          >
            {push.abonne ? t("supprimer") : t("pushActiver")}
          </Bouton>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border bg-card p-1 shadow-sm">
          {(["toutes", "nonLues"] as const).map((cle) => (
            <button
              key={cle}
              type="button"
              onClick={() => setFiltre(cle)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filtre === cle
                  ? "bg-brand-1/10 text-brand-2"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(`filtres.${cle}`)}
              {cle === "nonLues" && nonLues > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {nonLues}
                </span>
              )}
            </button>
          ))}
        </div>

        {nonLues > 0 && (
          <Bouton variante="fantome" taille="sm" onClick={() => toutMarquerLues()}>
            <CheckCircle2 className="size-4" />
            {t("toutMarquerLu")}
          </Bouton>
        )}
      </div>

      {chargement ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-2xl border bg-card"
            />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <div className="carte-vitrine animate-entree flex flex-col items-center gap-4 rounded-2xl border bg-card py-20 text-center shadow-sm">
          <span className="degrade-brand grid size-14 place-items-center rounded-2xl text-white shadow-md shadow-brand-1/25">
            <BellRing className="size-7" />
          </span>
          <p className="text-sm text-muted-foreground">
            {filtre === "nonLues" ? t("aucuneFiltre") : t("aucune")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visibles.map((notification) => {
            const config = STYLES[notification.type] ?? STYLES.info;
            const Icone = config.icone;
            return (
              <li
                key={notification.id}
                className={cn(
                  "carte-vitrine group relative flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
                  !notification.lue && "border-brand-2/30 bg-brand-1/[0.04]"
                )}
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    config.fond
                  )}
                >
                  <Icone className="size-5" />
                </span>
                <button
                  type="button"
                  onClick={() => ouvrir(notification.lien, notification.id, notification.lue)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">
                      {notification.titre}
                    </span>
                    {!notification.lue && (
                      <span className="size-1.5 shrink-0 rounded-full bg-brand-2" />
                    )}
                  </span>
                  {notification.message && (
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {notification.message}
                    </span>
                  )}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatTempsRelatif(notification.cree_le, locale)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => supprimer(notification.id)}
                  aria-label={t("supprimer")}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
