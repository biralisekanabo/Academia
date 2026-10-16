import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Plus } from "lucide-react";

import { exigerSuperAdmin } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { boutonVariantes } from "@/composants/ui/bouton";
import { ListeEtablissements } from "@/fonctionnalites/etablissements/liste-etablissements";
import { Link } from "@/i18n/navigation";
import type { Entreprise } from "@/types/base";
import { cn } from "@/utilitaires/cn";

export default async function PageEtablissements() {
  await connection();
  await exigerSuperAdmin();
  const t = await getTranslations("etablissements");

  const { data } = await bd()
    .from("entreprises")
    .select("*")
    .is("deleted_at", null)
    .neq("type_entreprise", "PLATEFORME")
    .order("created_at", { ascending: false });

  const etablissements = (data ?? []) as Entreprise[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("titre")}</h1>
          <p className="text-sm text-muted-foreground">{t("sousTitre")}</p>
        </div>
        <Link
          href="/etablissements/nouveau"
          className={cn(
            boutonVariantes({ variante: "parDefaut" }),
            "degrade-brand border-0 text-white shadow-lg shadow-brand-1/20"
          )}
        >
          <Plus />
          {t("nouveau")}
        </Link>
      </div>

      <ListeEtablissements etablissements={etablissements} />
    </div>
  );
}
