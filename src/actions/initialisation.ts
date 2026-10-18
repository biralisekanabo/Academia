"use server";

import { getTranslations } from "next-intl/server";
import bcrypt from "bcryptjs";

import { bd } from "@/bibliotheque/bd";
import type { Entreprise } from "@/types/base";

export type ResultatInitialisation = { erreur: string | null; ok?: boolean };

/**
 * Crée le tout premier super administrateur de la plateforme.
 * N'est autorisé que si aucun super administrateur n'existe encore.
 */
export async function creerSuperAdminInitial(donnees: {
  nomComplet: string;
  nomUtilisateur: string;
  motDePasse: string;
}): Promise<ResultatInitialisation> {
  const t = await getTranslations("auth");
  const client = bd();

  const { data: existant } = await client
    .from("roles")
    .select("id")
    .eq("code", "SUPER_ADMIN")
    .is("entreprise_id", null)
    .maybeSingle<{ id: number }>();

  if (existant) {
    const { count } = await client
      .from("utilisateur_roles")
      .select("utilisateur_id", { count: "exact", head: true })
      .eq("role_id", existant.id);
    if ((count ?? 0) > 0) {
      return { erreur: t("initDejaFait") };
    }
  }

  const { data: plateforme } = await client
    .from("entreprises")
    .select("*")
    .eq("type_entreprise", "PLATEFORME")
    .is("deleted_at", null)
    .maybeSingle<Entreprise>();

  let entrepriseId = plateforme?.id ?? null;

  if (!entrepriseId) {
    const { data: cree, error } = await client
      .from("entreprises")
      .insert({
        nom: "Plateforme Eduplex",
        sigle: "EDUPLEX",
        type_entreprise: "PLATEFORME",
        statut: "ACTIVE",
      })
      .select("id")
      .single<{ id: number }>();

    if (error || !cree) {
      return { erreur: error?.message ?? t("initErreur") };
    }
    entrepriseId = cree.id;
  }

  const hash = await bcrypt.hash(donnees.motDePasse, 12);

  const { data: utilisateur, error: erreurUtilisateur } = await client
    .from("utilisateurs")
    .insert({
      entreprise_id: entrepriseId,
      nom_complet: donnees.nomComplet.trim(),
      nom_utilisateur: donnees.nomUtilisateur.trim(),
      password_hash: hash,
      est_admin_principal: false,
      doit_changer_mot_de_passe: false,
      statut: "ACTIF",
    })
    .select("id")
    .single<{ id: number }>();

  if (erreurUtilisateur || !utilisateur) {
    const deja = /duplicate|unique/i.test(erreurUtilisateur?.message ?? "");
    return {
      erreur: deja ? t("serviceDejaUtilise") : t("initErreur"),
    };
  }

  if (existant) {
    await client
      .from("utilisateur_roles")
      .insert({ utilisateur_id: utilisateur.id, role_id: existant.id });
  }

  return { erreur: null, ok: true };
}

/** Indique s'il reste à initialiser le super administrateur. */
export async function initialisationRequise(): Promise<boolean> {
  const client = bd();
  const { data: role } = await client
    .from("roles")
    .select("id")
    .eq("code", "SUPER_ADMIN")
    .is("entreprise_id", null)
    .maybeSingle<{ id: number }>();

  if (!role) return true;

  const { count } = await client
    .from("utilisateur_roles")
    .select("utilisateur_id", { count: "exact", head: true })
    .eq("role_id", role.id);

  return (count ?? 0) === 0;
}
