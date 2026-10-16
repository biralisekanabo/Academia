import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Wallet } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import {
  GestionFrais,
  type LigneDette,
} from "@/fonctionnalites/frais/gestion-frais";
import type {
  AnneeAcademique,
  Devise,
  Dette,
  Domaine,
  Etudiant,
  Faculte,
  FraisAcademique,
  Promotion,
} from "@/types/base";

export default async function PageFrais() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "FRAIS.CONSULTER");
  const t = await getTranslations("frais");

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const [
    anneesR,
    facultesR,
    domainesR,
    promotionsR,
    devisesR,
    fraisR,
    dettesR,
    etudiantsR,
  ] = await Promise.all([
    client.from("annees_academiques").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("date_debut", { ascending: false }).returns<AnneeAcademique[]>(),
    client.from("facultes").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("nom").returns<Faculte[]>(),
    client.from("domaines").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("nom").returns<Domaine[]>(),
    client.from("promotions").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("nom").returns<Promotion[]>(),
    client.from("devises").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("code").returns<Devise[]>(),
    client.from("frais_academiques").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("libelle").returns<FraisAcademique[]>(),
    client.from("dettes").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("created_at", { ascending: false }).returns<Dette[]>(),
    client.from("etudiants").select("*").in("entreprise_id", perimetre).is("deleted_at", null).returns<Etudiant[]>(),
  ]);

  const frais = fraisR.data ?? [];
  const etudiants = etudiantsR.data ?? [];
  const dettes = dettesR.data ?? [];

  const etudiantsParId = new Map(etudiants.map((e) => [e.id, e]));
  const fraisParId = new Map(frais.map((f) => [f.id, f]));
  const devisesParId = new Map((devisesR.data ?? []).map((d) => [d.id, d]));

  const lignesDettes: LigneDette[] = dettes.map((d) => {
    const etudiant = etudiantsParId.get(d.etudiant_id);
    const fraisLie = fraisParId.get(d.frais_academique_id);
    return {
      id: d.id,
      etudiant: etudiant ? `${etudiant.nom} ${etudiant.prenom}` : "—",
      matricule: etudiant?.matricule ?? "—",
      frais: fraisLie?.libelle ?? "—",
      montant_initial: d.montant_initial,
      montant_reduction: d.montant_reduction,
      montant_paye: d.montant_paye,
      solde: d.solde,
      devise: devisesParId.get(d.devise_id)?.code ?? "",
      date_echeance: d.date_echeance,
      statut: d.statut,
    };
  });

  return (
    <div className="space-y-6">
      <EnTetePage icone={Wallet} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionFrais
        annees={anneesR.data ?? []}
        facultes={facultesR.data ?? []}
        domaines={domainesR.data ?? []}
        promotions={promotionsR.data ?? []}
        devises={devisesR.data ?? []}
        frais={frais}
        dettes={lignesDettes}
      />
    </div>
  );
}
