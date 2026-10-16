import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Wallet } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { GestionCaisse } from "@/fonctionnalites/caisse/gestion-caisses";
import type {
  Caisse,
  Devise,
  Dette,
  Etudiant,
  FraisAcademique,
  MouvementCaisse,
  Paiement,
  SessionCaisse,
} from "@/types/base";

export default async function PageCaisse() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.CONSULTER");
  const t = await getTranslations("caisse");

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const [
    caissesR,
    devisesR,
    utilisateursR,
    sessionsR,
    mouvementsR,
    paiementsR,
    dettesR,
    etudiantsR,
    fraisR,
  ] = await Promise.all([
    client.from("caisses").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("nom").returns<Caisse[]>(),
    client.from("devises").select("*").in("entreprise_id", perimetre).is("deleted_at", null).eq("statut", "ACTIVE").order("code").returns<Devise[]>(),
    client.from("utilisateurs").select("id, nom, prenom").in("entreprise_id", perimetre).is("deleted_at", null).order("nom").returns<{ id: number; nom: string; prenom: string }[]>(),
    client.from("sessions_caisse").select("*").in("entreprise_id", perimetre).order("ouverte_le", { ascending: false }).limit(100).returns<SessionCaisse[]>(),
    client.from("mouvements_caisse").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("date_mouvement", { ascending: false }).limit(200).returns<MouvementCaisse[]>(),
    client.from("paiements").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("date_paiement", { ascending: false }).limit(200).returns<Paiement[]>(),
    client.from("dettes").select("*").in("entreprise_id", perimetre).is("deleted_at", null).returns<Dette[]>(),
    client.from("etudiants").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("nom").returns<Etudiant[]>(),
    client.from("frais_academiques").select("*").in("entreprise_id", perimetre).is("deleted_at", null).returns<FraisAcademique[]>(),
  ]);

  return (
    <div className="space-y-6">
      <EnTetePage icone={Wallet} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionCaisse
        caisses={caissesR.data ?? []}
        devises={devisesR.data ?? []}
        utilisateurs={utilisateursR.data ?? []}
        sessions={sessionsR.data ?? []}
        mouvements={mouvementsR.data ?? []}
        paiements={paiementsR.data ?? []}
        dettes={dettesR.data ?? []}
        etudiants={etudiantsR.data ?? []}
        frais={fraisR.data ?? []}
      />
    </div>
  );
}
