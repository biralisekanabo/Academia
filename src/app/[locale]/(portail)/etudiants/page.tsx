import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { GraduationCap } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { GestionEtudiants } from "@/fonctionnalites/etudiants/gestion-etudiants";
import type { Etudiant } from "@/types/base";

export default async function PageEtudiants() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "ETUDIANTS.CONSULTER");
  const t = await getTranslations("etudiants");

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("etudiants")
    .select("*")
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .order("nom")
    .order("prenom")
    .returns<Etudiant[]>();

  return (
    <div className="space-y-6">
      <EnTetePage icone={GraduationCap} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionEtudiants etudiants={data ?? []} />
    </div>
  );
}
