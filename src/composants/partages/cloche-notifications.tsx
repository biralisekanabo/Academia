"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
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
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { TypeNotification } from "@/types/database";
import { cn } from "@/utilitaires/cn";
import { formatTempsRelatif } from "@/utilitaires/format";

const STYLES: Record<
  TypeNotification,
  { icone: LucideIcon; fond: string }
> = {
  info: { icone: Info, fond: "bg-brand-1/15 text-brand-2" },
  succes: { icone: CheckCircle2, fond: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  alerte: { icone: AlertTriangle, fond: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  paiement: { icone: Wallet, fond: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  note: { icone: ClipboardCheck, fond: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  annonce: { icone: Megaphone, fond: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
};

export function ClocheNotifications({ utilisateurId }: { utilisateurId: string }) {
  const t = useTranslations("notifications");
  const locale = useLocale();
  const router = useRouter();
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);

  const {
    notifications,
    nonLues,
    marquerLue,
    toutMarquerLues,
    supprimer,
  } = useNotifications(utilisateurId);

  const push = usePush();
  const zoneRef = useRef<HTMLDivElement>(null);
  const [cheminPrecedent, setCheminPrecedent] = useState(chemin);

  if (cheminPrecedent !== chemin) {
    setCheminPrecedent(chemin);
    setOuvert(false);
  }

  useEffect(() => {
    if (!ouvert) return;
    function surClic(evenement: MouseEvent) {
      if (zoneRef.current && !zoneRef.current.contains(evenement.target as Node)) {
        setOuvert(false);
      }
    }
    function surEchap(evenement: KeyboardEvent) {
      if (evenement.key === "Escape") setOuvert(false);
    }
    document.addEventListener("mousedown", surClic);
    document.addEventListener("keydown", surEchap);
    return () => {
      document.removeEventListener("mousedown", surClic);
      document.removeEventListener("keydown", surEchap);
    };
  }, [ouvert]);

  async function ouvrir(notification: (typeof notifications)[number]) {
    if (!notification.lue) await marquerLue(notification.id);
    setOuvert(false);
    if (notification.lien) router.push(notification.lien);
  }

  return (
    <div ref={zoneRef} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((etat) => !etat)}
        aria-label={t("titre")}
        aria-expanded={ouvert}
        className={cn(
          "relative grid size-9 place-items-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
          ouvert && "bg-accent text-accent-foreground"
        )}
      >
        {nonLues > 0 ? (
          <BellRing className="size-5 animate-[flottement_2.5s_ease-in-out_infinite]" />
        ) : (
          <Bell className="size-5" />
        )}
        {nonLues > 0 && (
          <span className="onde-lueur absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="animate-apparition absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border bg-popover/95 text-popover-foreground shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{t("titre")}</h3>
              {nonLues > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                  {nonLues}
                </span>
              )}
            </div>
            {nonLues > 0 && (
              <button
                type="button"
                onClick={() => toutMarquerLues()}
                className="text-xs font-medium text-brand-2 transition-colors hover:text-brand-3"
              >
                {t("toutMarquerLu")}
              </button>
            )}
          </div>

          {push.supporte && (
            <button
              type="button"
              disabled={push.chargement}
              onClick={() => (push.abonne ? push.desactiver() : push.activer())}
              className="flex w-full items-center gap-3 border-b bg-muted/30 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:opacity-60"
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  push.abonne
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-brand-1/15 text-brand-2"
                )}
              >
                <BellRing className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">
                  {push.abonne ? t("pushActif") : t("pushActiver")}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {push.abonne ? t("pushActifAide") : t("pushActiverAide")}
                </span>
              </span>
              <span
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  push.abonne ? "bg-emerald-500" : "bg-muted-foreground/30"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
                    push.abonne ? "left-4.5" : "left-0.5"
                  )}
                />
              </span>
            </button>
          )}

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {t("aucune")}
              </p>
            ) : (
              <ul className="divide-y">
                {notifications.map((notification) => {
                  const config = STYLES[notification.type] ?? STYLES.info;
                  const Icone = config.icone;
                  return (
                    <li key={notification.id}>
                      <div
                        className={cn(
                          "group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/50",
                          !notification.lue && "bg-brand-1/[0.06]"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => ouvrir(notification)}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <span
                            className={cn(
                              "grid size-8 shrink-0 place-items-center rounded-lg",
                              config.fond
                            )}
                          >
                            <Icone className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">
                                {notification.titre}
                              </span>
                              {!notification.lue && (
                                <span className="size-1.5 shrink-0 rounded-full bg-brand-2" />
                              )}
                            </span>
                            {notification.message && (
                              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                                {notification.message}
                              </span>
                            )}
                            <span className="mt-1 block text-[11px] text-muted-foreground">
                              {formatTempsRelatif(notification.cree_le, locale)}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => supprimer(notification.id)}
                          aria-label={t("supprimer")}
                          className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t p-2">
            <Link
              href="/notifications"
              onClick={() => setOuvert(false)}
              className="block rounded-lg px-3 py-2 text-center text-xs font-medium text-brand-2 transition-colors hover:bg-accent"
            >
              {t("voirTout")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
