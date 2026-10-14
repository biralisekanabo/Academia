"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Bouton, boutonVariantes } from "@/composants/ui/bouton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/utilitaires/cn";

export function EcranErreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("erreurs");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="carte-vitrine animate-entree flex max-w-md flex-col items-center gap-4 rounded-3xl border bg-card p-8 text-center shadow-sm">
        <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </span>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">{t("titre")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
          <Bouton variante="contour" onClick={() => reset()}>
            <RotateCw className="size-4" />
            {t("reessayer")}
          </Bouton>
          <Link href="/accueil" className={cn(boutonVariantes())}>
            <Home className="size-4" />
            {t("retourAccueil")}
          </Link>
        </div>
      </div>
    </div>
  );
}
