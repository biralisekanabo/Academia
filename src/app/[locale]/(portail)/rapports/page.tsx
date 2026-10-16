import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { BarChart3 } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { GestionRapports } from "@/fonctionnalites/rapports/gestion-rapports";

export default async function PageRapports() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "RAPPORTS.CONSULTER");
  const t = await getTranslations("rapports");

  return (
    <div className="space-y-6">
      <EnTetePage icone={BarChart3} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionRapports />
    </div>
  );
}
