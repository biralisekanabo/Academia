import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { UserCircle } from "lucide-react";

import { exigerSession } from "@/bibliotheque/autorisation";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { FormulaireProfil } from "@/fonctionnalites/profil/formulaire-profil";

export default async function PageProfil() {
  await connection();
  const session = await exigerSession();
  const t = await getTranslations("profil");

  return (
    <div className="space-y-6">
      <EnTetePage icone={UserCircle} titre={t("titre")} sousTitre={t("sousTitre")} />
      <FormulaireProfil
        nomComplet={session.nomComplet}
        nomUtilisateur={session.nomUtilisateur}
      />
    </div>
  );
}
