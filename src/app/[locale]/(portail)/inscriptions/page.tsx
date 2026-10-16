import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Layers } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import {
  GestionInscriptions,
} from "@/fonctionnalites/inscriptions/gestion-inscriptions";
import type {
  AnneeAcademique,
  Domaine,
  Etudiant,
  Faculte,
  Inscription,
  Promotion,
} from "@/types/base";

export default async function PageInscriptions() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "INSCRIPTIONS.CONSULTER");
  const t = await getTranslations("inscriptions");

  const client = bd();
  const perimetre = await perimetreEntreprise(session.entrepriseId);

  const [inscriptionsRes, etudiantsRes, anneesRes, facultesRes, domainesRes, promotionsRes] =
    await Promise.all([
      client
        .from("inscriptions")
        .select("*")
        .in("entreprise_id", perimetre)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .returns<Inscription[]>(),
      client
        .from("etudiants")
        .select("id, matricule, nom, postnom, prenom")
        .in("entreprise_id", perimetre)
        .is("deleted_at", null)
        .order("nom")
        .returns<Pick<Etudiant, "id" | "matricule" | "nom" | "postnom" | "prenom">[]>(),
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
        .order("nom")
        .returns<Promotion[]>(),
    ]);

  const etudiants = etudiantsRes.data ?? [];
  const annees = anneesRes.data ?? [];
  const facultes = facultesRes.data ?? [];
  const domaines = domainesRes.data ?? [];
  const promotions = promotionsRes.data ?? [];

  const nomEtudiant = new Map(etudiants.map((e) => [e.id, `${e.nom} ${e.prenom}`]));
  const libelleAnnee = new Map(annees.map((a) => [a.id, a.libelle]));
  const nomDomaine = new Map(domaines.map((d) => [d.id, d.nom]));
  const nomPromotion = new Map(promotions.map((p) => [p.id, p.nom]));

  const inscriptions = (inscriptionsRes.data ?? []).map((i) => ({
    ...i,
    etudiant: nomEtudiant.get(i.etudiant_id) ?? "—",
    annee: libelleAnnee.get(i.annee_academique_id) ?? "—",
    filiere: [nomDomaine.get(i.domaine_id), nomPromotion.get(i.promotion_id)]
      .filter(Boolean)
      .join(" · ") || "—",
  }));

  const anneeActiveId = annees.find((a) => a.est_active)?.id ?? null;

  return (
    <div className="space-y-6">
      <EnTetePage icone={Layers} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionInscriptions
        inscriptions={inscriptions}
        etudiants={etudiants}
        annees={annees}
        facultes={facultes}
        domaines={domaines}
        promotions={promotions}
        anneeActiveId={anneeActiveId}
      />
    </div>
  );
}
