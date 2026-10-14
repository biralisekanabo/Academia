import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { EnTetePage } from "@/composants/partages/en-tete-page";

export const instant = false;

export default async function PageNotes() {
  await connection();
  const t = await getTranslations();
  await obtenirProfilSousControle([
    "administrateur",
    "personnel",
    "enseignant",
    "etudiant",
  ]);

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={ClipboardCheck}
        titre={t("notes.titre")}
        sousTitre={t("notes.sousTitre")}
      />
      <div className="carte-vitrine halo-gradiant animate-entree flex flex-col items-center gap-4 rounded-2xl border bg-card py-20 text-center shadow-sm">
        <span className="degrade-brand grid size-14 place-items-center rounded-2xl text-white shadow-md shadow-brand-1/25">
          <ClipboardCheck className="size-7" />
        </span>
        <p className="text-sm text-muted-foreground">{t("notes.aucun")}</p>
      </div>
    </div>
  );
}