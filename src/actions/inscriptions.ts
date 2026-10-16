"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { genererNumero } from "@/bibliotheque/numerotation";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { schemaInscription } from "@/schemas/inscription";
import type { Inscription, Session } from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

function nettoyer(valeur?: string): string | null {
  const v = valeur?.trim();
  return v ? v : null;
}

async function inscriptionDansPerimetre(
  session: Session,
  id: number
): Promise<Inscription | null> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("inscriptions")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<Inscription>();
  return data ?? null;
}

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
    table_concernee: "inscriptions",
    enregistrement_id: cibleId,
    details: details ?? null,
  });
}

export async function creerInscription(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "INSCRIPTIONS.CREER");

  const parse = schemaInscription.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;

  const numero =
    d.numero_inscription ??
    (await genererNumero(
      session.entrepriseId,
      "INSCRIPTION",
      "INS-",
      new Date().getFullYear()
    ));

  const { data, error } = await bd()
    .from("inscriptions")
    .insert({
      entreprise_id: session.entrepriseId,
      etudiant_id: d.etudiant_id,
      annee_academique_id: d.annee_academique_id,
      faculte_id: d.faculte_id,
      domaine_id: d.domaine_id,
      promotion_id: d.promotion_id,
      numero_inscription: numero,
      date_inscription: d.date_inscription || new Date().toISOString().slice(0, 10),
      type_inscription: d.type_inscription ?? "INITIALE",
      statut: "EN_ATTENTE",
      enregistre_par: session.utilisateurId,
      observations: nettoyer(d.observations),
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) {
    const deja = /duplicate|unique/i.test(error?.message ?? "");
    return {
      erreur: deja
        ? "Cet étudiant est déjà inscrit dans ce périmètre pour cette année."
        : `Impossible de créer l'inscription.`,
    };
  }

  await journaliser(session, "CREATION_INSCRIPTION", data.id);
  revalidatePath("/[locale]/inscriptions", "page");
  return { ok: true, id: data.id };
}

export async function changerStatutInscription(
  id: number,
  statut: "EN_ATTENTE" | "VALIDEE" | "REFUSEE" | "ANNULEE"
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "INSCRIPTIONS.VALIDER");

  const inscription = await inscriptionDansPerimetre(session, id);
  if (!inscription) return { erreur: "Inscription introuvable." };

  const maj: Record<string, unknown> = { statut };
  if (statut === "VALIDEE") {
    maj.validee_par = session.utilisateurId;
    maj.validee_le = new Date().toISOString();
  }

  const { error } = await bd().from("inscriptions").update(maj).eq("id", id);
  if (error) return { erreur: "Impossible de modifier le statut." };

  await journaliser(session, "STATUT_INSCRIPTION", id, { statut });
  revalidatePath("/[locale]/inscriptions", "page");
  return { ok: true };
}

export async function supprimerInscription(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "INSCRIPTIONS.SUPPRIMER");

  if (!(await inscriptionDansPerimetre(session, id))) {
    return { erreur: "Inscription introuvable." };
  }

  const { error } = await bd()
    .from("inscriptions")
    .update({ deleted_at: new Date().toISOString(), statut: "ANNULEE" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer l'inscription." };

  await journaliser(session, "SUPPRESSION_INSCRIPTION", id);
  revalidatePath("/[locale]/inscriptions", "page");
  return { ok: true };
}
