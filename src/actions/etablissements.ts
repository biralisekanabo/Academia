"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import bcrypt from "bcryptjs";

import { exigerSuperAdmin } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import {
  baseIdentifiant,
  genererMotDePasse,
  identifiantUnique,
} from "@/bibliotheque/identifiants";
import {
  schemaAdminPrincipal,
  schemaEtablissement,
  schemaModificationEtablissement,
  schemaSuccursale,
  type DonneesEtablissement,
  type DonneesSuccursale,
} from "@/schemas/etablissement";
import type { Entreprise } from "@/types/base";

export type ResultatEtablissement = {
  erreur?: string;
  ok?: boolean;
  id?: number;
  /** Identifiant de connexion de l'administrateur principal. */
  identifiant?: string;
  /** Mot de passe généré automatiquement (si non fourni). */
  motDePasse?: string;
};

export type DonneesAdminOptionnel = {
  nomComplet?: string;
  nomUtilisateur?: string;
  email?: string;
  motDePasse?: string;
};

function nettoyer(valeur?: string): string | null {
  const v = valeur?.trim();
  return v ? v : null;
}

export async function creerEtablissement(donnees: {
  etablissement: DonneesEtablissement;
  admin: DonneesAdminOptionnel;
  succursales: DonneesSuccursale[];
}): Promise<ResultatEtablissement> {
  const t = await getTranslations();
  const session = await exigerSuperAdmin();

  const etab = schemaEtablissement.safeParse(donnees.etablissement);
  const admin = schemaAdminPrincipal.safeParse(donnees.admin);
  if (!etab.success || !admin.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const succursales: DonneesSuccursale[] = [];
  for (const brute of donnees.succursales ?? []) {
    if (!brute.nom?.trim()) continue;
    const parse = schemaSuccursale.safeParse(brute);
    if (!parse.success) return { erreur: t("commun.erreurFormulaire") };
    succursales.push(parse.data);
  }

  const client = bd();

  const { data: mere, error: erreurMere } = await client
    .from("entreprises")
    .insert({
      nom: etab.data.nom.trim(),
      sigle: nettoyer(etab.data.sigle),
      type_entreprise: etab.data.typeEntreprise,
      telephone: nettoyer(etab.data.telephone),
      email: nettoyer(etab.data.email),
      adresse: nettoyer(etab.data.adresse),
      pays: nettoyer(etab.data.pays),
      province: nettoyer(etab.data.province),
      ville: nettoyer(etab.data.ville),
      est_mere: true,
      statut: "ACTIVE",
    })
    .select("*")
    .single<Entreprise>();

  if (erreurMere || !mere) {
    const deja = /duplicate|unique/i.test(erreurMere?.message ?? "");
    return { erreur: deja ? t("etablissements.sigleDejaUtilise") : t("etablissements.erreurCreation") };
  }

  for (const succursale of succursales) {
    await client.from("entreprises").insert({
      nom: succursale.nom.trim(),
      sigle: nettoyer(succursale.sigle),
      type_entreprise: etab.data.typeEntreprise,
      ville: nettoyer(succursale.ville),
      telephone: nettoyer(succursale.telephone),
      est_mere: false,
      entreprise_mere_id: mere.id,
      statut: "ACTIVE",
    });
  }

  const motDePasseAdmin =
    admin.data.motDePasse?.trim() || genererMotDePasse();
  const nomUtilisateurAdmin = admin.data.nomUtilisateur
    ? await identifiantUnique(baseIdentifiant([admin.data.nomUtilisateur]))
    : await identifiantUnique(
        baseIdentifiant([admin.data.email, admin.data.nomComplet, etab.data.nom])
      );
  const nomCompletAdmin =
    admin.data.nomComplet?.trim() ||
    nomUtilisateurAdmin ||
    nettoyer(admin.data.email) ||
    `Admin ${etab.data.nom}`;

  const hash = await bcrypt.hash(motDePasseAdmin, 12);
  const { data: utilisateur, error: erreurAdmin } = await client
    .from("utilisateurs")
    .insert({
      entreprise_id: mere.id,
      nom_complet: nomCompletAdmin,
      nom_utilisateur: nomUtilisateurAdmin,
      email: nettoyer(admin.data.email),
      password_hash: hash,
      est_admin_principal: true,
      doit_changer_mot_de_passe: true,
      statut: "ACTIF",
    })
    .select("id")
    .single<{ id: number }>();

  if (erreurAdmin || !utilisateur) {
    await client.from("entreprises").delete().eq("id", mere.id);
    const deja = /duplicate|unique/i.test(erreurAdmin?.message ?? "");
    return {
      erreur: deja ? t("etablissements.identifiantDejaUtilise") : t("etablissements.erreurAdmin"),
    };
  }

  const { data: roleAdmin } = await client
    .from("roles")
    .select("id")
    .eq("code", "ADMIN_PRINCIPAL")
    .is("entreprise_id", null)
    .maybeSingle<{ id: number }>();

  if (roleAdmin) {
    await client
      .from("utilisateur_roles")
      .insert({ utilisateur_id: utilisateur.id, role_id: roleAdmin.id });
  }

  await client.from("journal_audit").insert({
    entreprise_id: mere.id,
    utilisateur_id: session.utilisateurId,
    action: "CREATION_ETABLISSEMENT",
    table_concernee: "entreprises",
    enregistrement_id: mere.id,
    details: { nom: mere.nom, sigle: mere.sigle },
  });

  revalidatePath("/[locale]/etablissements", "page");
  revalidatePath("/[locale]/accueil", "page");
  return {
    ok: true,
    id: mere.id,
    identifiant: nomUtilisateurAdmin,
    motDePasse: admin.data.motDePasse?.trim() ? undefined : motDePasseAdmin,
  };
}

export async function modifierEtablissement(
  donnees: DonneesEtablissement & { id: number }
): Promise<ResultatEtablissement> {
  const t = await getTranslations();
  const session = await exigerSuperAdmin();

  const parse = schemaModificationEtablissement.safeParse(donnees);
  if (!parse.success || !Number.isInteger(donnees.id)) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const client = bd();
  const { error } = await client
    .from("entreprises")
    .update({
      nom: parse.data.nom?.trim(),
      sigle: nettoyer(parse.data.sigle),
      type_entreprise: parse.data.typeEntreprise,
      telephone: nettoyer(parse.data.telephone),
      email: nettoyer(parse.data.email),
      adresse: nettoyer(parse.data.adresse),
      pays: nettoyer(parse.data.pays),
      province: nettoyer(parse.data.province),
      ville: nettoyer(parse.data.ville),
    })
    .eq("id", donnees.id);

  if (error) {
    const deja = /duplicate|unique/i.test(error.message);
    return { erreur: deja ? t("etablissements.sigleDejaUtilise") : t("etablissements.erreurMiseAJour") };
  }

  await client.from("journal_audit").insert({
    entreprise_id: donnees.id,
    utilisateur_id: session.utilisateurId,
    action: "MODIFICATION_ETABLISSEMENT",
    table_concernee: "entreprises",
    enregistrement_id: donnees.id,
  });

  revalidatePath("/[locale]/etablissements", "page");
  revalidatePath(`/[locale]/etablissements/${donnees.id}`, "page");
  return { ok: true };
}

export async function definirStatutEtablissement(
  id: number,
  statut: "ACTIVE" | "SUSPENDUE" | "INACTIVE"
): Promise<ResultatEtablissement> {
  const t = await getTranslations();
  const session = await exigerSuperAdmin();

  if (!Number.isInteger(id)) return { erreur: t("commun.erreurFormulaire") };

  const client = bd();
  const { error } = await client
    .from("entreprises")
    .update({ statut })
    .eq("id", id);

  if (error) return { erreur: t("etablissements.erreurStatut") };

  await client.from("journal_audit").insert({
    entreprise_id: id,
    utilisateur_id: session.utilisateurId,
    action: "STATUT_ETABLISSEMENT",
    table_concernee: "entreprises",
    enregistrement_id: id,
    details: { statut },
  });

  revalidatePath("/[locale]/etablissements", "page");
  revalidatePath(`/[locale]/etablissements/${id}`, "page");
  return { ok: true };
}

export async function supprimerEtablissement(
  id: number
): Promise<ResultatEtablissement> {
  const t = await getTranslations();
  const session = await exigerSuperAdmin();

  if (!Number.isInteger(id)) return { erreur: t("commun.erreurFormulaire") };

  const client = bd();
  const { error } = await client
    .from("entreprises")
    .update({ deleted_at: new Date().toISOString(), statut: "INACTIVE" })
    .eq("id", id);

  if (error) return { erreur: t("etablissements.erreurSuppression") };

  await client.from("journal_audit").insert({
    entreprise_id: id,
    utilisateur_id: session.utilisateurId,
    action: "SUPPRESSION_ETABLISSEMENT",
    table_concernee: "entreprises",
    enregistrement_id: id,
  });

  revalidatePath("/[locale]/etablissements", "page");
  return { ok: true };
}
