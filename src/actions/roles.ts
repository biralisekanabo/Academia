"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { schemaPermissionsRole, schemaRole } from "@/schemas/role";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

export async function creerRole(donnees: {
  code: string;
  nom: string;
  description?: string;
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ROLES.CREER");

  const parse = schemaRole.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { data, error } = await bd()
    .from("roles")
    .insert({
      entreprise_id: session.entrepriseId,
      code: parse.data.code.trim().toUpperCase(),
      nom: parse.data.nom.trim(),
      description: parse.data.description?.trim() || null,
      est_systeme: false,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) {
    const deja = /duplicate|unique/i.test(error?.message ?? "");
    return { erreur: deja ? "Ce code de rôle existe déjà." : "Impossible de créer le rôle." };
  }

  await journaliser(session.entrepriseId, session.utilisateurId, "CREATION_ROLE", data.id);
  revalidatePath("/[locale]/roles", "page");
  return { ok: true, id: data.id };
}

export async function modifierRole(donnees: {
  id: number;
  code: string;
  nom: string;
  description?: string;
}): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ROLES.MODIFIER");

  const parse = schemaRole.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { data: role } = await bd()
    .from("roles")
    .select("id, est_systeme, entreprise_id")
    .eq("id", donnees.id)
    .maybeSingle<{ id: number; est_systeme: boolean; entreprise_id: number | null }>();

  if (!role) return { erreur: "Rôle introuvable." };
  if (role.est_systeme) return { erreur: "Un rôle système ne peut pas être modifié." };
  if (role.entreprise_id !== session.entrepriseId && !session.roles.includes("SUPER_ADMIN")) {
    return { erreur: "Rôle hors de votre périmètre." };
  }

  const { error } = await bd()
    .from("roles")
    .update({
      nom: parse.data.nom.trim(),
      description: parse.data.description?.trim() || null,
    })
    .eq("id", donnees.id);
  if (error) return { erreur: "Impossible de modifier le rôle." };

  await journaliser(session.entrepriseId, session.utilisateurId, "MODIFICATION_ROLE", donnees.id);
  revalidatePath("/[locale]/roles", "page");
  return { ok: true };
}

export async function supprimerRole(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ROLES.SUPPRIMER");

  const { data: role } = await bd()
    .from("roles")
    .select("id, est_systeme, entreprise_id")
    .eq("id", id)
    .maybeSingle<{ id: number; est_systeme: boolean; entreprise_id: number | null }>();

  if (!role) return { erreur: "Rôle introuvable." };
  if (role.est_systeme) return { erreur: "Un rôle système ne peut pas être supprimé." };
  if (role.entreprise_id !== session.entrepriseId && !session.roles.includes("SUPER_ADMIN")) {
    return { erreur: "Rôle hors de votre périmètre." };
  }

  const { error } = await bd().from("roles").delete().eq("id", id);
  if (error) {
    return { erreur: "Impossible de supprimer le rôle (il est peut-être utilisé)." };
  }

  await journaliser(session.entrepriseId, session.utilisateurId, "SUPPRESSION_ROLE", id);
  revalidatePath("/[locale]/roles", "page");
  return { ok: true };
}

export async function definirPermissionsRole(
  roleId: number,
  permissionIds: number[]
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "ROLES.MODIFIER");

  const parse = schemaPermissionsRole.safeParse({ roleId, permissionIds });
  if (!parse.success) return { erreur: "Formulaire invalide." };

  const { data: role } = await bd()
    .from("roles")
    .select("id, est_systeme, entreprise_id")
    .eq("id", roleId)
    .maybeSingle<{ id: number; est_systeme: boolean; entreprise_id: number | null }>();

  if (!role) return { erreur: "Rôle introuvable." };
  if (role.est_systeme) return { erreur: "Les permissions d'un rôle système ne sont pas modifiables." };
  if (role.entreprise_id !== session.entrepriseId && !session.roles.includes("SUPER_ADMIN")) {
    return { erreur: "Rôle hors de votre périmètre." };
  }

  const client = bd();
  await client.from("role_permissions").delete().eq("role_id", roleId);

  const ids = parse.data.permissionIds ?? [];
  if (ids.length > 0) {
    await client
      .from("role_permissions")
      .insert(ids.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })));
  }

  await journaliser(session.entrepriseId, session.utilisateurId, "PERMISSIONS_ROLE", roleId, { permissionIds: ids });
  revalidatePath("/[locale]/roles", "page");
  return { ok: true };
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
    table_concernee: "roles",
    enregistrement_id: cibleId,
    details: details ?? null,
  });
}
