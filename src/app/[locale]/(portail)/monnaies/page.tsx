import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Coins } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { GestionMonnaies } from "@/fonctionnalites/monnaies/gestion-monnaies";
import type { Devise, TauxChange } from "@/types/base";

export default async function PageMonnaies() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "MONNAIES.CONSULTER");
  const t = await getTranslations("monnaies");

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const [devisesResultat, tauxResultat] = await Promise.all([
    client
      .from("devises")
      .select("*")
      .in("entreprise_id", perimetre)
      .is("deleted_at", null)
      .order("est_reference", { ascending: false })
      .order("code")
      .returns<Devise[]>(),
    client
      .from("taux_changes")
      .select("*")
      .in("entreprise_id", perimetre)
      .eq("est_courant", true)
      .order("date_effet", { ascending: false })
      .returns<TauxChange[]>(),
  ]);

  return (
    <div className="space-y-6">
      <EnTetePage icone={Coins} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionMonnaies
        devises={devisesResultat.data ?? []}
        tauxCourants={tauxResultat.data ?? []}
      />
    </div>
  );
}
