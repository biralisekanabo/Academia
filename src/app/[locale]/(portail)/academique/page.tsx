import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { CalendarDays } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { GestionAcademique } from "@/fonctionnalites/academique/gestion-academique";
import type {
  AnneeAcademique,
  Domaine,
  Faculte,
  Promotion,
} from "@/types/base";

export default async function PageAcademique() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.CONSULTER");
  const t = await getTranslations("academique");

  const client = bd();
  const perimetre = await perimetreEntreprise(session.entrepriseId);

  const [anneesRes, facultesRes, domainesRes, promotionsRes] = await Promise.all([
    client
      .from("annees_academiques")
      .select("*")
      .in("entreprise_id", perimetre)
      .is("deleted_at", null)
      .order("date_debut", { ascending: false })
      .returns<AnneeAcademique[]>(),
    client
      .from("facultes")
      .select("*")
      .in("entreprise_id", perimetre)
      .is("deleted_at", null)
      .order("ordre")
      .order("nom")
      .returns<Faculte[]>(),
    client
      .from("domaines")
      .select("*")
      .in("entreprise_id", perimetre)
      .is("deleted_at", null)
      .order("nom")
      .returns<Domaine[]>(),
    client
      .from("promotions")
      .select("*")
      .in("entreprise_id", perimetre)
      .is("deleted_at", null)
      .order("ordre")
      .order("nom")
      .returns<Promotion[]>(),
  ]);

  return (
    <div className="space-y-6">
      <EnTetePage icone={CalendarDays} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionAcademique
        annees={anneesRes.data ?? []}
        facultes={facultesRes.data ?? []}
        domaines={domainesRes.data ?? []}
        promotions={promotionsRes.data ?? []}
      />
    </div>
  );
}
