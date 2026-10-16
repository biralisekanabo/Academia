"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { genererNumero } from "@/bibliotheque/numerotation";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { schemaEtudiant, schemaStatutEtudiant } from "@/schemas/etudiant";
import type { Etudiant, Session } from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

function nettoyer(valeur?: string): string | null {
  const v = valeur?.trim();
  return v ? v : null;
}

async function etudiantDansPerimetre(
  session: Session,
  id: number
): Promise<Etudiant | null> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("etudiants")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<Etudiant>();
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
    table_concernee: "etudiants",
    enregistrement_id: cibleId,
    details: details ?? null,
  });
}

export async function creerEtudiant(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ETUDIANTS.CREER");

  const parse = schemaEtudiant.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;

  const matricule =
    d.matricule ??
    (await genererNumero(session.entrepriseId, "MATRICULE", "ETU-"));

  const { data, error } = await bd()
    .from("etudiants")
    .insert({
      entreprise_id: session.entrepriseId,
      matricule,
      nom: d.nom.trim(),
      postnom: nettoyer(d.postnom),
      prenom: d.prenom.trim(),
      sexe: d.sexe,
      date_naissance: nettoyer(d.date_naissance),
      lieu_naissance: nettoyer(d.lieu_naissance),
      nationalite: nettoyer(d.nationalite) ?? "Congolaise",
      adresse: nettoyer(d.adresse),
      telephone: nettoyer(d.telephone),
      email: nettoyer(d.email),
      nom_pere: nettoyer(d.nom_pere),
      nom_mere: nettoyer(d.nom_mere),
      nom_tuteur: nettoyer(d.nom_tuteur),
      telephone_tuteur: nettoyer(d.telephone_tuteur),
      contact_urgence: nettoyer(d.contact_urgence),
      type_piece: d.type_piece || null,
      numero_piece: nettoyer(d.numero_piece),
      statut: d.statut ?? "ACTIF",
      observations: nettoyer(d.observations),
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) {
    const deja = /duplicate|unique/i.test(error?.message ?? "");
    return {
      erreur: deja ? "Ce matricule est déjà utilisé." : "Impossible de créer l'étudiant.",
    };
  }

  await journaliser(session, "CREATION_ETUDIANT", data.id);
  revalidatePath("/[locale]/etudiants", "page");
  return { ok: true, id: data.id };
}

export async function modifierEtudiant(
  donnees: Record<string, unknown> & { id: number }
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ETUDIANTS.MODIFIER");

  const parse = schemaEtudiant.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await etudiantDansPerimetre(session, donnees.id))) {
    return { erreur: "Étudiant introuvable." };
  }
  const d = parse.data;

  const { error } = await bd()
    .from("etudiants")
    .update({
      matricule: d.matricule?.trim() || undefined,
      nom: d.nom.trim(),
      postnom: nettoyer(d.postnom),
      prenom: d.prenom.trim(),
      sexe: d.sexe,
      date_naissance: nettoyer(d.date_naissance),
      lieu_naissance: nettoyer(d.lieu_naissance),
      nationalite: nettoyer(d.nationalite),
      adresse: nettoyer(d.adresse),
      telephone: nettoyer(d.telephone),
      email: nettoyer(d.email),
      nom_pere: nettoyer(d.nom_pere),
      nom_mere: nettoyer(d.nom_mere),
      nom_tuteur: nettoyer(d.nom_tuteur),
      telephone_tuteur: nettoyer(d.telephone_tuteur),
      contact_urgence: nettoyer(d.contact_urgence),
      type_piece: d.type_piece || null,
      numero_piece: nettoyer(d.numero_piece),
      observations: nettoyer(d.observations),
    })
    .eq("id", donnees.id);

  if (error) {
    const deja = /duplicate|unique/i.test(error.message ?? "");
    return { erreur: deja ? "Ce matricule est déjà utilisé." : "Impossible de modifier l'étudiant." };
  }

  await journaliser(session, "MODIFICATION_ETUDIANT", donnees.id);
  revalidatePath("/[locale]/etudiants", "page");
  return { ok: true };
}

export async function definirStatutEtudiant(
  id: number,
  statut: Etudiant["statut"]
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ETUDIANTS.MODIFIER");

  const parse = schemaStatutEtudiant.safeParse({ id, statut });
  if (!parse.success) return { erreur: "Statut invalide." };
  if (!(await etudiantDansPerimetre(session, id))) {
    return { erreur: "Étudiant introuvable." };
  }

  const { error } = await bd()
    .from("etudiants")
    .update({ statut: parse.data.statut })
    .eq("id", id);
  if (error) return { erreur: "Impossible de modifier le statut." };

  await journaliser(session, "STATUT_ETUDIANT", id, { statut });
  revalidatePath("/[locale]/etudiants", "page");
  return { ok: true };
}

export async function supprimerEtudiant(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ETUDIANTS.SUPPRIMER");

  if (!(await etudiantDansPerimetre(session, id))) {
    return { erreur: "Étudiant introuvable." };
  }

  const { error } = await bd()
    .from("etudiants")
    .update({ deleted_at: new Date().toISOString(), statut: "INACTIF" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (des inscriptions y sont liées)." };

  await journaliser(session, "SUPPRESSION_ETUDIANT", id);
  revalidatePath("/[locale]/etudiants", "page");
  return { ok: true };
}

export async function televerserPhotoEtudiant(
  id: number,
  donnees: { type: string; base64: string }
): Promise<Resultat & { chemin?: string }> {
  const session = await exigerSession();
  await exigerPermission(session, "ETUDIANTS.MODIFIER");

  if (!(await etudiantDansPerimetre(session, id))) {
    return { erreur: "Étudiant introuvable." };
  }
  if (!donnees.base64) return { erreur: "Fichier manquant." };

  const ext = (donnees.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const chemin = `${session.entrepriseId}/${id}-${Date.now()}.${ext}`;
  const contenu = Buffer.from(donnees.base64, "base64");

  const { error } = await bd()
    .storage.from("photos-etudiants")
    .upload(chemin, contenu, { contentType: donnees.type, upsert: true });

  if (error) return { erreur: "Impossible de téléverser la photo." };

  await bd().from("etudiants").update({ photo: chemin }).eq("id", id);
  await journaliser(session, "PHOTO_ETUDIANT", id);
  revalidatePath("/[locale]/etudiants", "page");
  return { ok: true, chemin };
}
