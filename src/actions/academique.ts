"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import {
  schemaAnnee,
  schemaDomaine,
  schemaFaculte,
  schemaPromotion,
} from "@/schemas/academique";
import type { Session } from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

type TableAcad = "annees_academiques" | "facultes" | "domaines" | "promotions";

function nettoyer(valeur?: string): string | null {
  const v = valeur?.trim();
  return v ? v : null;
}

/** Vérifie qu'un enregistrement appartient au périmètre de l'utilisateur. */
async function dansPerimetre(
  session: Session,
  table: TableAcad,
  id: number
): Promise<boolean> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from(table)
    .select("id")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

async function journaliser(
  session: Session,
  action: string,
  table: string,
  cibleId: number,
  details?: Record<string, unknown>
): Promise<void> {
  await bd().from("journal_audit").insert({
    entreprise_id: session.entrepriseId,
    utilisateur_id: session.utilisateurId,
    action,
    table_concernee: table,
    enregistrement_id: cibleId,
    details: details ?? null,
  });
}

function msgErreur(error: { message?: string } | null, defaut: string): string {
  if (error && /duplicate|unique/i.test(error.message ?? "")) {
    return "Un enregistrement avec ce code existe déjà.";
  }
  return defaut;
}

// --- Années académiques ---------------------------------------

export async function creerAnnee(donnees: {
  libelle: string;
  date_debut: string;
  date_fin: string;
  est_active?: boolean;
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.CREER");

  const parse = schemaAnnee.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (parse.data.date_fin <= parse.data.date_debut) {
    return { erreur: "La date de fin doit être postérieure à la date de début." };
  }

  const client = bd();
  if (parse.data.est_active) {
    await client
      .from("annees_academiques")
      .update({ est_active: false })
      .eq("entreprise_id", session.entrepriseId)
      .eq("est_active", true);
  }

  const { data, error } = await client
    .from("annees_academiques")
    .insert({
      entreprise_id: session.entrepriseId,
      libelle: parse.data.libelle.trim(),
      date_debut: parse.data.date_debut,
      date_fin: parse.data.date_fin,
      est_active: parse.data.est_active ?? false,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: msgErreur(error, "Impossible de créer l'année académique.") };

  await journaliser(session, "CREATION_ANNEE", "annees_academiques", data.id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true, id: data.id };
}

export async function modifierAnnee(donnees: {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.MODIFIER");

  const parse = schemaAnnee.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await dansPerimetre(session, "annees_academiques", donnees.id))) {
    return { erreur: "Année académique introuvable." };
  }
  if (parse.data.date_fin <= parse.data.date_debut) {
    return { erreur: "La date de fin doit être postérieure à la date de début." };
  }

  const { error } = await bd()
    .from("annees_academiques")
    .update({
      libelle: parse.data.libelle.trim(),
      date_debut: parse.data.date_debut,
      date_fin: parse.data.date_fin,
    })
    .eq("id", donnees.id);
  if (error) return { erreur: msgErreur(error, "Impossible de modifier l'année académique.") };

  await journaliser(session, "MODIFICATION_ANNEE", "annees_academiques", donnees.id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true };
}

export async function activerAnnee(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.MODIFIER");

  if (!(await dansPerimetre(session, "annees_academiques", id))) {
    return { erreur: "Année académique introuvable." };
  }

  const client = bd();
  await client
    .from("annees_academiques")
    .update({ est_active: false })
    .eq("entreprise_id", session.entrepriseId)
    .eq("est_active", true);
  const { error } = await client
    .from("annees_academiques")
    .update({ est_active: true })
    .eq("id", id);
  if (error) return { erreur: "Impossible d'activer l'année." };

  await journaliser(session, "ACTIVATION_ANNEE", "annees_academiques", id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true };
}

export async function supprimerAnnee(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.SUPPRIMER");

  if (!(await dansPerimetre(session, "annees_academiques", id))) {
    return { erreur: "Année académique introuvable." };
  }

  const { error } = await bd()
    .from("annees_academiques")
    .update({ deleted_at: new Date().toISOString(), est_active: false })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (des inscriptions peuvent y être liées)." };

  await journaliser(session, "SUPPRESSION_ANNEE", "annees_academiques", id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true };
}

// --- Facultés -------------------------------------------------

export async function creerFaculte(donnees: {
  code: string;
  nom: string;
  description?: string;
  ordre?: number;
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.CREER");

  const parse = schemaFaculte.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { data, error } = await bd()
    .from("facultes")
    .insert({
      entreprise_id: session.entrepriseId,
      code: parse.data.code.trim().toUpperCase(),
      nom: parse.data.nom.trim(),
      description: nettoyer(parse.data.description),
      ordre: parse.data.ordre ?? 0,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: msgErreur(error, "Impossible de créer la faculté.") };

  await journaliser(session, "CREATION_FACULTE", "facultes", data.id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true, id: data.id };
}

export async function modifierFaculte(donnees: {
  id: number;
  code: string;
  nom: string;
  description?: string;
  ordre?: number;
  statut?: "ACTIVE" | "INACTIVE" | "ARCHIVEE";
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.MODIFIER");

  const parse = schemaFaculte.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await dansPerimetre(session, "facultes", donnees.id))) {
    return { erreur: "Faculté introuvable." };
  }

  const { error } = await bd()
    .from("facultes")
    .update({
      code: parse.data.code.trim().toUpperCase(),
      nom: parse.data.nom.trim(),
      description: nettoyer(parse.data.description),
      ordre: parse.data.ordre ?? 0,
      statut: parse.data.statut ?? "ACTIVE",
    })
    .eq("id", donnees.id);
  if (error) return { erreur: msgErreur(error, "Impossible de modifier la faculté.") };

  await journaliser(session, "MODIFICATION_FACULTE", "facultes", donnees.id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true };
}

export async function supprimerFaculte(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.SUPPRIMER");

  if (!(await dansPerimetre(session, "facultes", id))) {
    return { erreur: "Faculté introuvable." };
  }

  const { error } = await bd()
    .from("facultes")
    .update({ deleted_at: new Date().toISOString(), statut: "ARCHIVEE" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (des domaines y sont rattachés)." };

  await journaliser(session, "SUPPRESSION_FACULTE", "facultes", id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true };
}

// --- Domaines -------------------------------------------------

export async function creerDomaine(donnees: {
  faculte_id: number;
  code: string;
  nom: string;
  description?: string;
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.CREER");

  const parse = schemaDomaine.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await dansPerimetre(session, "facultes", parse.data.faculte_id))) {
    return { erreur: "Faculté introuvable dans votre périmètre." };
  }

  const { data, error } = await bd()
    .from("domaines")
    .insert({
      entreprise_id: session.entrepriseId,
      faculte_id: parse.data.faculte_id,
      code: parse.data.code.trim().toUpperCase(),
      nom: parse.data.nom.trim(),
      description: nettoyer(parse.data.description),
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: msgErreur(error, "Impossible de créer le domaine.") };

  await journaliser(session, "CREATION_DOMAINE", "domaines", data.id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true, id: data.id };
}

export async function modifierDomaine(donnees: {
  id: number;
  faculte_id: number;
  code: string;
  nom: string;
  description?: string;
  statut?: "ACTIVE" | "INACTIVE" | "ARCHIVEE";
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.MODIFIER");

  const parse = schemaDomaine.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await dansPerimetre(session, "domaines", donnees.id))) {
    return { erreur: "Domaine introuvable." };
  }
  if (!(await dansPerimetre(session, "facultes", parse.data.faculte_id))) {
    return { erreur: "Faculté introuvable dans votre périmètre." };
  }

  const { error } = await bd()
    .from("domaines")
    .update({
      faculte_id: parse.data.faculte_id,
      code: parse.data.code.trim().toUpperCase(),
      nom: parse.data.nom.trim(),
      description: nettoyer(parse.data.description),
      statut: parse.data.statut ?? "ACTIVE",
    })
    .eq("id", donnees.id);
  if (error) return { erreur: msgErreur(error, "Impossible de modifier le domaine.") };

  await journaliser(session, "MODIFICATION_DOMAINE", "domaines", donnees.id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true };
}

export async function supprimerDomaine(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.SUPPRIMER");

  if (!(await dansPerimetre(session, "domaines", id))) {
    return { erreur: "Domaine introuvable." };
  }

  const { error } = await bd()
    .from("domaines")
    .update({ deleted_at: new Date().toISOString(), statut: "ARCHIVEE" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (des promotions y sont rattachées)." };

  await journaliser(session, "SUPPRESSION_DOMAINE", "domaines", id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true };
}

// --- Promotions -----------------------------------------------

export async function creerPromotion(donnees: {
  faculte_id: number;
  domaine_id: number;
  code?: string;
  nom: string;
  niveau?: string;
  ordre?: number;
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.CREER");

  const parse = schemaPromotion.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await dansPerimetre(session, "domaines", parse.data.domaine_id))) {
    return { erreur: "Domaine introuvable dans votre périmètre." };
  }

  const { data, error } = await bd()
    .from("promotions")
    .insert({
      entreprise_id: session.entrepriseId,
      faculte_id: parse.data.faculte_id,
      domaine_id: parse.data.domaine_id,
      code: nettoyer(parse.data.code),
      nom: parse.data.nom.trim(),
      niveau: nettoyer(parse.data.niveau),
      ordre: parse.data.ordre ?? 0,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: msgErreur(error, "Impossible de créer la promotion.") };

  await journaliser(session, "CREATION_PROMOTION", "promotions", data.id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true, id: data.id };
}

export async function modifierPromotion(donnees: {
  id: number;
  faculte_id: number;
  domaine_id: number;
  code?: string;
  nom: string;
  niveau?: string;
  ordre?: number;
  statut?: "ACTIVE" | "INACTIVE" | "ARCHIVEE";
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.MODIFIER");

  const parse = schemaPromotion.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await dansPerimetre(session, "promotions", donnees.id))) {
    return { erreur: "Promotion introuvable." };
  }
  if (!(await dansPerimetre(session, "domaines", parse.data.domaine_id))) {
    return { erreur: "Domaine introuvable dans votre périmètre." };
  }

  const { error } = await bd()
    .from("promotions")
    .update({
      faculte_id: parse.data.faculte_id,
      domaine_id: parse.data.domaine_id,
      code: nettoyer(parse.data.code),
      nom: parse.data.nom.trim(),
      niveau: nettoyer(parse.data.niveau),
      ordre: parse.data.ordre ?? 0,
      statut: parse.data.statut ?? "ACTIVE",
    })
    .eq("id", donnees.id);
  if (error) return { erreur: msgErreur(error, "Impossible de modifier la promotion.") };

  await journaliser(session, "MODIFICATION_PROMOTION", "promotions", donnees.id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true };
}

export async function supprimerPromotion(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ACADEMIQUE.SUPPRIMER");

  if (!(await dansPerimetre(session, "promotions", id))) {
    return { erreur: "Promotion introuvable." };
  }

  const { error } = await bd()
    .from("promotions")
    .update({ deleted_at: new Date().toISOString(), statut: "ARCHIVEE" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (des inscriptions y sont rattachées)." };

  await journaliser(session, "SUPPRESSION_PROMOTION", "promotions", id);
  revalidatePath("/[locale]/academique", "page");
  return { ok: true };
}
