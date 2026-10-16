"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { genererNumero } from "@/bibliotheque/numerotation";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { schemaPaiement } from "@/schemas/paiement";
import type {
  Devise,
  Dette,
  Paiement,
  PaiementDette,
  Session,
} from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number; numero?: string };

async function journaliser(
  session: Session,
  action: string,
  cibleId: number,
  details?: Record<string, unknown>
): Promise<void> {
  await bd().from("journal_audit").insert({
    entreprise_id: session.entrepriseId,
    utilisateur_id: session.utilisateurId,
    action,
    table_concernee: "paiements",
    enregistrement_id: cibleId,
    details: details ?? null,
  });
}

export async function enregistrerPaiement(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.CREER");

  const parse = schemaPaiement.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const { data: etudiant } = await client
    .from("etudiants")
    .select("id")
    .eq("id", d.etudiant_id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle();
  if (!etudiant) return { erreur: "Étudiant introuvable." };

  const { data: caisse } = await client
    .from("caisses")
    .select("*")
    .eq("id", d.caisse_id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caisse) return { erreur: "Caisse introuvable." };
  if (caisse.statut !== "OUVERTE") {
    return { erreur: "Ouvrez une session de caisse avant d'encaisser." };
  }

  const idsDettes = d.allocations.map((a) => a.dette_id);
  const { data: dettes } = await client
    .from("dettes")
    .select("*")
    .in("id", idsDettes)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .returns<Dette[]>();

  const parId = new Map((dettes ?? []).map((x) => [x.id, x]));
  if (parId.size !== idsDettes.length) {
    return { erreur: "Une dette sélectionnée est introuvable." };
  }

  const devisions = new Set<number>();
  let total = 0;
  for (const a of d.allocations) {
    const dette = parId.get(a.dette_id)!;
    if (dette.etudiant_id !== d.etudiant_id) {
      return { erreur: "La dette ne appartient pas à cet étudiant." };
    }
    if (dette.statut === "ANNULEE") {
      return { erreur: "Une dette annulée ne peut pas être réglée." };
    }
    if (Number(dette.solde) <= 0) {
      return { erreur: "Une dette sélectionnée est déjà soldée." };
    }
    if (a.montant > Number(dette.solde) + 0.001) {
      return { erreur: `Le montant dépasse le solde (${dette.solde}).` };
    }
    devisions.add(dette.devise_id);
    total += a.montant;
  }

  if (devisions.size > 1) {
    return { erreur: "Les dettes sélectionnées n'ont pas la même devise." };
  }
  const deviseId = [...devisions][0];

  const { data: devises } = await client
    .from("devises")
    .select("id, est_reference")
    .eq("entreprise_id", session.entrepriseId)
    .returns<Devise[]>();
  const estReference = devises?.find((x) => x.id === deviseId)?.est_reference ?? false;

  let tauxApplique: number | null = null;
  let montantReference: number | null = null;
  if (!estReference) {
    const ref = devises?.find((x) => x.est_reference);
    if (ref) {
      const { data: taux } = await client
        .from("taux_changes")
        .select("taux")
        .eq("entreprise_id", session.entrepriseId)
        .eq("devise_source_id", deviseId)
        .eq("devise_cible_id", ref.id)
        .eq("est_courant", true)
        .maybeSingle<{ taux: number }>();
      if (taux) {
        tauxApplique = Number(taux.taux);
        montantReference = Math.round(total * tauxApplique * 100) / 100;
      }
    }
  }

  const { data: sessionCaisse } = await client
    .from("sessions_caisse")
    .select("id")
    .eq("caisse_id", caisse.id)
    .eq("statut", "OUVERTE")
    .maybeSingle<{ id: number }>();

  let numero: string;
  try {
    numero = await genererNumero(
      session.entrepriseId,
      "RECU",
      "REC",
      new Date().getFullYear(),
      5
    );
  } catch {
    return { erreur: "Numérotation des reçus indisponible." };
  }

  const { data: paiement, error } = await client
    .from("paiements")
    .insert({
      entreprise_id: session.entrepriseId,
      etudiant_id: d.etudiant_id,
      caisse_id: caisse.id,
      session_caisse_id: sessionCaisse?.id ?? null,
      numero_recu: numero,
      montant: total,
      devise_id: deviseId,
      taux_applique: tauxApplique,
      montant_reference: montantReference,
      methode: d.methode,
      reference_transaction: d.reference_transaction?.trim() || null,
      date_paiement: d.date_paiement || new Date().toISOString(),
      statut: "VALIDE",
      enregistre_par: session.utilisateurId,
      valide_par: session.utilisateurId,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !paiement) return { erreur: "Impossible d'enregistrer le paiement." };

  const { error: erreurAlloc } = await client.from("paiement_dettes").insert(
    d.allocations.map((a) => ({
      paiement_id: paiement.id,
      dette_id: a.dette_id,
      montant: a.montant,
    }))
  );
  if (erreurAlloc) {
    await client.from("paiements").delete().eq("id", paiement.id);
    return { erreur: "Impossible d'affecter le paiement aux dettes." };
  }

  await journaliser(session, "ENREGISTREMENT_PAIEMENT", paiement.id, {
    numero,
    montant: total,
    allocations: d.allocations.length,
  });
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true, id: paiement.id, numero };
}

export async function annulerPaiement(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.ANNULER");

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const { data: paiement } = await client
    .from("paiements")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<Paiement>();
  if (!paiement) return { erreur: "Paiement introuvable." };
  if (paiement.statut !== "VALIDE") {
    return { erreur: "Seul un paiement validé peut être annulé." };
  }

  const { error } = await client
    .from("paiements")
    .update({ statut: "ANNULE" })
    .eq("id", id);
  if (error) return { erreur: "Impossible d'annuler le paiement." };

  const { data: liens } = await client
    .from("paiement_dettes")
    .select("dette_id")
    .eq("paiement_id", id)
    .returns<PaiementDette[]>();

  for (const lien of liens ?? []) {
    await client.rpc("recalculer_dette", { p_dette: lien.dette_id });
  }

  await journaliser(session, "ANNULATION_PAIEMENT", id, { numero: paiement.numero_recu });
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true };
}
