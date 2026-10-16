import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";

import { exigerSuperAdmin } from "@/bibliotheque/autorisation";
import { FormulaireEtablissement } from "@/fonctionnalites/etablissements/formulaire-etablissement";
import { Link } from "@/i18n/navigation";

export default async function PageNouvelEtablissement() {
  await connection();
  await exigerSuperAdmin();
  const t = await getTranslations("etablissements");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/etablissements"
          className="grid size-9 place-items-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent"
          aria-label={t("retour")}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nouveau")}</h1>
          <p className="text-sm text-muted-foreground">{t("nouveauSousTitre")}</p>
        </div>
      </div>

      <FormulaireEtablissement />
    </div>
  );
}
