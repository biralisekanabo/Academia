"use server";

import { getLocale, getTranslations } from "next-intl/server";
import bcrypt from "bcryptjs";

import { bd } from "@/bibliotheque/bd";
import { effacerSession, ecrireSession } from "@/bibliotheque/session";
import { redirect } from "@/i18n/navigation";
import type { Entreprise, Utilisateur } from "@/types/base";

export type ResultatConnexion = { erreur: string | null };

export async function seConnecter(donnees: {
  etablissement: string;
  identifiant: string;
  motDePasse: string;
}): Promise<ResultatConnexion> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth" });

  const client = bd();

  const { data: entreprise } = await client
    .from("entreprises")
    .select("*")
    .is("deleted_at", null)
    .or(
      `sigle.ilike.${donnees.etablissement.trim()},nom.ilike.${donnees.etablissement.trim()}`
    )
    .maybeSingle<Entreprise>();

  if (!entreprise || entreprise.statut !== "ACTIVE") {
    return { erreur: t("erreurIdentifiants") };
  }

  const { data: utilisateur } = await client
    .from("utilisateurs")
    .select("*")
    .eq("entreprise_id", entreprise.id)
    .ilike("nom_utilisateur", donnees.identifiant.trim())
    .is("deleted_at", null)
    .maybeSingle<Utilisateur & { password_hash: string }>();

  if (!utilisateur) {
    return { erreur: t("erreurIdentifiants") };
  }

  const valide = await bcrypt.compare(
    donnees.motDePasse,
    utilisateur.password_hash
  );
  if (!valide) {
    return { erreur: t("erreurIdentifiants") };
  }

  if (utilisateur.statut !== "ACTIF") {
    return { erreur: t("compteInactif") };
  }

  const roles = await chargerCodesRoles(utilisateur.id);

  await ecrireSession({
    utilisateurId: utilisateur.id,
    entrepriseId: entreprise.id,
    nomComplet: utilisateur.nom_complet,
    nomUtilisateur: utilisateur.nom_utilisateur,
    roles,
    estAdminPrincipal: utilisateur.est_admin_principal,
    doitChangerMotDePasse: utilisateur.doit_changer_mot_de_passe,
  });

  await client
    .from("utilisateurs")
    .update({ derniere_connexion: new Date().toISOString() })
    .eq("id", utilisateur.id);

  await client.from("journal_audit").insert({
    entreprise_id: entreprise.id,
    utilisateur_id: utilisateur.id,
    action: "CONNEXION",
    table_concernee: "utilisateurs",
    enregistrement_id: utilisateur.id,
  });

  return { erreur: null };
}

export async function seDeconnecter(): Promise<void> {
  await effacerSession();
  const locale = await getLocale();
  redirect({ href: "/connexion", locale });
}

export async function chargerCodesRoles(utilisateurId: number): Promise<string[]> {
  const { data } = await bd()
    .from("utilisateur_roles")
    .select("roles!inner(code)")
    .eq("utilisateur_id", utilisateurId);

  type Ligne = { roles: { code: string } | null };
  return ((data ?? []) as unknown as Ligne[])
    .map((ligne) => ligne.roles?.code)
    .filter((code): code is string => Boolean(code));
}
