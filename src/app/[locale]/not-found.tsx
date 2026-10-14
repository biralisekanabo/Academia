import { Compass, Home } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { boutonVariantes } from "@/composants/ui/bouton";
import { Link } from "@/i18n/navigation";
import { cn } from "@/utilitaires/cn";

export default async function Introuvable() {
  const t = await getTranslations("erreurs");

  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="carte-vitrine animate-entree flex max-w-md flex-col items-center gap-4 rounded-3xl border bg-card p-8 text-center shadow-sm">
        <span className="degrade-brand degrade-anime grid size-14 place-items-center rounded-2xl text-white shadow-lg shadow-brand-1/25">
          <Compass className="size-7" />
        </span>
        <p className="font-mono text-5xl font-bold tracking-tight text-muted-foreground/40">
          404
        </p>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">{t("introuvableTitre")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("introuvableDescription")}
          </p>
        </div>
        <Link href="/accueil" className={cn(boutonVariantes())}>
          <Home className="size-4" />
          {t("retourAccueil")}
        </Link>
      </div>
    </div>
  );
}
