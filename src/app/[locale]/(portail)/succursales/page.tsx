import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Building2 } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { succursalesDe } from "@/bibliotheque/portee";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { GestionSuccursales } from "@/fonctionnalites/succursales/gestion-succursales";
import { bd } from "@/bibliotheque/bd";
import type { Entreprise } from "@/types/base";

export default async function PageSuccursales() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "SUCCURSALES.CONSULTER");
  const t = await getTranslations("succursales");

  const lite = await succursalesDe(session.entrepriseId);
  const ids = lite.map((s) => s.id);
  const { data } = ids.length
    ? await bd()
        .from("entreprises")
        .select("*")
        .in("id", ids)
        .order("nom")
        .returns<Entreprise[]>()
    : { data: [] as Entreprise[] };

  return (
    <div className="space-y-6">
      <EnTetePage icone={Building2} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionSuccursales succursales={data ?? []} />
    </div>
  );
}
