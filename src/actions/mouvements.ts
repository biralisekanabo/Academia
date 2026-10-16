"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { genererNumero } from "@/bibliotheque/numerotation";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { schemaMouvement } from "@/schemas/mouvement";
import type { MouvementCaisse, Session } from "@/types/base";

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
    table_concernee: "mouvements_caisse",
    enregistrement_id: cibleId,
    details: details ?? null,
  });
}

export async function creerMouvement(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.CREER");

  const parse = schemaMouvement.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const { data: caisse } = await client
    .from("caisses")
    .select("*")
    .eq("id", d.caisse_id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle();
  if (!caisse) return { erreur: "Caisse introuvable." };

  if (d.type === "TRANSFERT") {
    if (!d.caisse_destination_id) {
      return { erreur: "Choisissez la caisse de destination." };
    }
    if (d.caisse_destination_id === d.caisse_id) {
      return { erreur: "La caisse de destination doit être différente." };
    }
    const { data: destination } = await client
      .from("caisses")
      .select("id")
      .eq("id", d.caisse_destination_id)
      .in("entreprise_id", perimetre)
      .is("deleted_at", null)
      .maybeSingle();
    if (!destination) return { erreur: "Caisse de destination introuvable." };
  }

  const { data: sessionCaisse } = await client
    .from("sessions_caisse")
    .select("id")
    .eq("caisse_id", d.caisse_id)
    .eq("statut", "OUVERTE")
    .maybeSingle<{ id: number }>();

  let numero: string;
  try {
    numero = await genererNumero(session.entrepriseId, "MOUVEMENT", "MVT", null, 5);
  } catch {
    return { erreur: "Numérotation des pièces indisponible." };
  }

  const { data, error } = await client
    .from("mouvements_caisse")
    .insert({
      entreprise_id: session.entrepriseId,
      caisse_id: d.caisse_id,
      type: d.type,
      numero_piece: numero,
      montant: d.montant,
      devise_id: d.devise_id,
      motif: d.motif.trim(),
      beneficiaire: d.beneficiaire?.trim() || null,
      categorie: d.categorie?.trim() || null,
      reference: d.reference?.trim() || null,
      caisse_destination_id: d.type === "TRANSFERT" ? d.caisse_destination_id : null,
      session_caisse_id: sessionCaisse?.id ?? null,
      date_mouvement: d.date_mouvement || new Date().toISOString(),
      statut: "VALIDE",
      enregistre_par: session.utilisateurId,
      valide_par: session.utilisateurId,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: "Impossible d'enregistrer le mouvement." };

  await journaliser(session, "ENREGISTREMENT_MOUVEMENT", data.id, {
    numero,
    type: d.type,
    montant: d.montant,
  });
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true, id: data.id, numero };
}

export async function annulerMouvement(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.ANNULER");

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const { data: mouvement } = await client
    .from("mouvements_caisse")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<MouvementCaisse>();
  if (!mouvement) return { erreur: "Mouvement introuvable." };
  if (mouvement.statut !== "VALIDE") {
    return { erreur: "Seul un mouvement validé peut être annulé." };
  }

  const { error } = await client
    .from("mouvements_caisse")
    .update({ statut: "ANNULE" })
    .eq("id", id);
  if (error) return { erreur: "Impossible d'annuler le mouvement." };

  await journaliser(session, "ANNULATION_MOUVEMENT", id, {
    numero: mouvement.numero_piece,
  });
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true };
}
