import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { Link } from "@/i18n/navigation";
import { FormulaireEnseignant } from "@/fonctionnalites/enseignants/formulaire-enseignant";

export default async function PageNouvelEnseignant() {
  await connection();
  const t = await getTranslations();
  await obtenirProfilSousControle(["administrateur", "reception", "personnel"]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/enseignants"
          className="lien-anime mb-2 items-center gap-1 text-sm font-medium text-brand-2 hover:text-brand-3"
        >
          â† {t("commun.retour")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("enseignants.nouveau")}
        </h1>
      </div>

      <FormulaireEnseignant />
    </div>
  );
}
