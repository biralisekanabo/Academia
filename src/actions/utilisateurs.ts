"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import {
  schemaAttributionRoles,
  schemaAttributionSuccursales,
  schemaCreationUtilisateur,
  schemaModificationUtilisateur,
  schemaReinitialisationMotDePasse,
} from "@/schemas/utilisateur";
import type { Utilisateur } from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

function nettoyer(valeur?: string): string | null {
  const v = valeur?.trim();
  return v ? v : null;
}

/** Vérifie que l'utilisateur cible appartient au périmètre courant. */
async function utilisateurDansPerimetre(
  entrepriseId: number,
  utilisateurId: number
): Promise<(Utilisateur & { password_hash: string }) | null> {
  const perimetre = await perimetreEntreprise(entrepriseId);
  const { data } = await bd()
    .from("utilisateurs")
    .select("*")
    .eq("id", utilisateurId)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<Utilisateur & { password_hash: string }>();
  return data ?? null;
}

export async function creerUtilisateur(donnees: {
  nomComplet: string;
  nomUtilisateur: string;
  email?: string;
  telephone?: string;
  motDePasse: string;
  roleIds: number[];
  succursaleIds: number[];
  succursaleId?: number;
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "UTILISATEURS.CREER");

  const parse = schemaCreationUtilisateur.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const entrepriseCible = donnees.succursaleId ?? session.entrepriseId;
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  if (!session.roles.includes("SUPER_ADMIN") && !perimetre.includes(entrepriseCible)) {
    return { erreur: "Succursale hors de votre périmètre." };
  }

  const client = bd();
  const hash = await bcrypt.hash(parse.data.motDePasse, 12);

  const { data: utilisateur, error } = await client
    .from("utilisateurs")
    .insert({
      entreprise_id: entrepriseCible,
      nom_complet: parse.data.nomComplet.trim(),
      nom_utilisateur: parse.data.nomUtilisateur.trim(),
      email: nettoyer(parse.data.email),
      telephone: nettoyer(parse.data.telephone),
      password_hash: hash,
      est_admin_principal: false,
      doit_changer_mot_de_passe: true,
      statut: "ACTIF",
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !utilisateur) {
    const deja = /duplicate|unique/i.test(error?.message ?? "");
    return {
      erreur: deja
        ? "Cet identifiant est déjà utilisé."
        : "Impossible de créer l'utilisateur.",
    };
  }

  await appliquerRoles(session.entrepriseId, utilisateur.id, donnees.roleIds ?? []);
  await appliquerSuccursales(utilisateur.id, donnees.succursaleIds ?? []);

  await journaliser(session.entrepriseId, session.utilisateurId, "CREATION_UTILISATEUR", utilisateur.id);
  revalidatePath("/[locale]/utilisateurs", "page");
  return { ok: true, id: utilisateur.id };
}

export async function modifierUtilisateur(donnees: {
  id: number;
  nomComplet: string;
  email?: string;
  telephone?: string;
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "UTILISATEURS.MODIFIER");

  const parse = schemaModificationUtilisateur.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const cible = await utilisateurDansPerimetre(session.entrepriseId, parse.data.id);
  if (!cible) return { erreur: "Utilisateur introuvable." };

  const { error } = await bd()
    .from("utilisateurs")
    .update({
      nom_complet: parse.data.nomComplet.trim(),
      email: nettoyer(parse.data.email),
      telephone: nettoyer(parse.data.telephone),
    })
    .eq("id", parse.data.id);

  if (error) return { erreur: "Impossible de modifier l'utilisateur." };

  await journaliser(session.entrepriseId, session.utilisateurId, "MODIFICATION_UTILISATEUR", parse.data.id);
  revalidatePath("/[locale]/utilisateurs", "page");
  return { ok: true };
}

export async function definirStatutUtilisateur(
  id: number,
  statut: "ACTIF" | "INACTIF" | "SUSPENDU"
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "UTILISATEURS.MODIFIER");

  const cible = await utilisateurDansPerimetre(session.entrepriseId, id);
  if (!cible) return { erreur: "Utilisateur introuvable." };
  if (cible.id === session.utilisateurId) {
    return { erreur: "Vous ne pouvez pas modifier votre propre statut." };
  }

  const { error } = await bd()
    .from("utilisateurs")
    .update({ statut })
    .eq("id", id);
  if (error) return { erreur: "Impossible de modifier le statut." };

  await journaliser(session.entrepriseId, session.utilisateurId, "STATUT_UTILISATEUR", id, { statut });
  revalidatePath("/[locale]/utilisateurs", "page");
  return { ok: true };
}

export async function supprimerUtilisateur(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "UTILISATEURS.SUPPRIMER");

  const cible = await utilisateurDansPerimetre(session.entrepriseId, id);
  if (!cible) return { erreur: "Utilisateur introuvable." };
  if (cible.est_admin_principal) {
    return { erreur: "L'administrateur principal ne peut pas être supprimé." };
  }
  if (cible.id === session.utilisateurId) {
    return { erreur: "Vous ne pouvez pas supprimer votre propre compte." };
  }

  const { error } = await bd()
    .from("utilisateurs")
    .update({ deleted_at: new Date().toISOString(), statut: "INACTIF" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer l'utilisateur." };

  await journaliser(session.entrepriseId, session.utilisateurId, "SUPPRESSION_UTILISATEUR", id);
  revalidatePath("/[locale]/utilisateurs", "page");
  return { ok: true };
}

export async function reinitialiserMotDePasse(
  utilisateurId: number,
  motDePasse: string
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "UTILISATEURS.MODIFIER");

  const parse = schemaReinitialisationMotDePasse.safeParse({
    utilisateurId,
    motDePasse,
  });
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const cible = await utilisateurDansPerimetre(session.entrepriseId, utilisateurId);
  if (!cible) return { erreur: "Utilisateur introuvable." };

  const hash = await bcrypt.hash(parse.data.motDePasse, 12);
  const { error } = await bd()
    .from("utilisateurs")
    .update({ password_hash: hash, doit_changer_mot_de_passe: true })
    .eq("id", utilisateurId);
  if (error) return { erreur: "Impossible de réinitialiser le mot de passe." };

  await journaliser(session.entrepriseId, session.utilisateurId, "REINITIALISATION_MOT_DE_PASSE", utilisateurId);
  return { ok: true };
}

export async function attribuerRoles(
  utilisateurId: number,
  roleIds: number[]
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "UTILISATEURS.MODIFIER");

  const parse = schemaAttributionRoles.safeParse({ utilisateurId, roleIds });
  if (!parse.success) return { erreur: "Formulaire invalide." };

  const cible = await utilisateurDansPerimetre(session.entrepriseId, utilisateurId);
  if (!cible) return { erreur: "Utilisateur introuvable." };

  await appliquerRoles(session.entrepriseId, utilisateurId, parse.data.roleIds);
  await journaliser(session.entrepriseId, session.utilisateurId, "ATTRIBUTION_ROLES", utilisateurId, { roleIds });
  revalidatePath("/[locale]/utilisateurs", "page");
  return { ok: true };
}

export async function attribuerSuccursales(
  utilisateurId: number,
  succursaleIds: number[]
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "UTILISATEURS.MODIFIER");

  const parse = schemaAttributionSuccursales.safeParse({ utilisateurId, succursaleIds });
  if (!parse.success) return { erreur: "Formulaire invalide." };

  const cible = await utilisateurDansPerimetre(session.entrepriseId, utilisateurId);
  if (!cible) return { erreur: "Utilisateur introuvable." };

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const valides = (parse.data.succursaleIds ?? []).filter((s) =>
    perimetre.includes(s)
  );

  await appliquerSuccursales(utilisateurId, valides);
  await journaliser(session.entrepriseId, session.utilisateurId, "ATTRIBUTION_SUCCURSALES", utilisateurId, { succursaleIds: valides });
  revalidatePath("/[locale]/utilisateurs", "page");
  return { ok: true };
}

// --- Helpers internes -----------------------------------------

async function appliquerRoles(
  entrepriseId: number,
  utilisateurId: number,
  roleIds: number[]
): Promise<void> {
  const client = bd();
  await client.from("utilisateur_roles").delete().eq("utilisateur_id", utilisateurId);
  if (roleIds.length === 0) return;

  const { data: rolesValides } = await client
    .from("roles")
    .select("id")
    .in("id", roleIds)
    .is("entreprise_id", null)
    .neq("code", "SUPER_ADMIN");

  const { data: rolesEntreprise } = await client
    .from("roles")
    .select("id")
    .in("id", roleIds)
    .eq("entreprise_id", entrepriseId);

  const ids = [
    ...(rolesValides ?? []).map((r) => (r as { id: number }).id),
    ...(rolesEntreprise ?? []).map((r) => (r as { id: number }).id),
  ];
  if (ids.length === 0) return;

  await client.from("utilisateur_roles").insert(
    ids.map((roleId) => ({ utilisateur_id: utilisateurId, role_id: roleId }))
  );
}

async function appliquerSuccursales(
  utilisateurId: number,
  succursaleIds: number[]
): Promise<void> {
  const client = bd();
  await client
    .from("utilisateur_succursales")
    .delete()
    .eq("utilisateur_id", utilisateurId);
  if (succursaleIds.length === 0) return;
  await client.from("utilisateur_succursales").insert(
    succursaleIds.map((s) => ({
      utilisateur_id: utilisateurId,
      succursale_id: s,
    }))
  );
}

async function journaliser(
  entrepriseId: number,
  utilisateurId: number,
  action: string,
  cibleId: number,
  details?: Record<string, unknown>
): Promise<void> {
  await bd().from("journal_audit").insert({
    entreprise_id: entrepriseId,
    utilisateur_id: utilisateurId,
    action,
    table_concernee: "utilisateurs",
    enregistrement_id: cibleId,
    details: details ?? null,
  });
}
