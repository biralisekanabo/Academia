"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";
import {
  schemaEtudiant,
  schemaModificationEtudiant,
} from "@/schemas/etudiant";
import type {
  DonneesEtudiant,
  DonneesModificationEtudiant,
} from "@/schemas/etudiant";

export type ResultatInscription = {
  erreur?: string;
  matricule?: string;
  ok?: boolean;
};

export async function inscrireEtudiant(
  donnees: DonneesEtudiant
): Promise<ResultatInscription> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["administrateur", "reception", "personnel"]);

  const resultat = schemaEtudiant.safeParse(donnees);
  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { prenom, nom, email, filiereId, niveau, anneeUniversitaire } =
    resultat.data;

  const admin = creerClientAdmin();

  // Création du compte Auth via la clé service_role : aucun e-mail de
  // confirmation n'est envoyé et la session courante n'est pas remplacée.
  const { data: cree, error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: "openlu-initial",
    email_confirm: true,
    user_metadata: { prenom, nom, role: "etudiant" },
  });

  if (erreurAuth || !cree.user) {
    const deja = /already|existe|registered/i.test(erreurAuth?.message ?? "");
    return { erreur: deja ? t("etudiants.emailDejaUtilise") : t("etudiants.erreurCompte") };
  }

  const idUtilisateur = cree.user.id;

  const { count } = await admin
    .from("openlu_etudiants")
    .select("*", { count: "exact", head: true })
    .eq("annee_universitaire", anneeUniversitaire);

  const annee = anneeUniversitaire.split("-")[0];
  let matricule = "";
  let erreurInsert: string | null = null;

  for (let tentative = 0; tentative < 5; tentative++) {
    const numero = (count ?? 0) + 1 + tentative;
    matricule = `OL-${annee}-${String(numero).padStart(4, "0")}`;

    const { error } = await admin.from("openlu_etudiants").insert({
      id: idUtilisateur,
      matricule,
      filiere_id: filiereId,
      niveau,
      annee_universitaire: anneeUniversitaire,
      statut: "actif",
    });

    if (!error) break;
    erreurInsert = error.message;
    matricule = "";
  }

  if (!matricule) {
    // Évite d'orpheliner un compte Auth si l'insertion du dossier échoue.
    await admin.auth.admin.deleteUser(idUtilisateur).catch(() => undefined);
    return { erreur: erreurInsert ?? t("etudiants.erreurMatricule") };
  }

  revalidatePath("/[locale]/etudiants", "page");
  revalidatePath("/[locale]/tableau-de-bord", "page");
  return { ok: true, matricule };
}

export async function modifierEtudiant(
  donnees: DonneesModificationEtudiant
): Promise<{ erreur?: string; ok?: boolean }> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["administrateur", "reception", "personnel"]);

  const resultat = schemaModificationEtudiant.safeParse(donnees);
  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { id, prenom, nom, faculteId, filiereId, niveau, statut } =
    resultat.data;
  const admin = creerClientAdmin();
  const { data: filiere, error: erreurFiliere } = await admin
    .from("openlu_filieres")
    .select("faculte_id")
    .eq("id", filiereId)
    .maybeSingle();

  if (erreurFiliere || !filiere || filiere.faculte_id !== faculteId) {
    return { erreur: t("etudiants.erreurFiliereFaculte") };
  }

  const { data: etudiant, error: erreurLecture } = await admin
    .from("openlu_etudiants")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (erreurLecture || !etudiant) {
    return { erreur: t("etudiants.erreurMiseAJour") };
  }

  const { error: erreurProfil } = await admin
    .from("openlu_profils")
    .update({ prenom, nom })
    .eq("id", id)
    .eq("role", "etudiant");

  if (erreurProfil) {
    return { erreur: t("etudiants.erreurMiseAJour") };
  }

  const { error: erreurDossier } = await admin
    .from("openlu_etudiants")
    .update({ filiere_id: filiereId, niveau, statut })
    .eq("id", id);

  if (erreurDossier) {
    return { erreur: t("etudiants.erreurMiseAJourPartielle") };
  }

  revalidatePath("/[locale]/etudiants", "page");
  return { ok: true };
}

export async function definirStatutEtudiant(
  id: string,
  statut: "actif" | "inactif"
): Promise<{ erreur?: string; ok?: boolean }> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["administrateur", "reception", "personnel"]);

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || (statut !== "actif" && statut !== "inactif")
  ) {
    return { erreur: t("etudiants.erreurStatut") };
  }

  const admin = creerClientAdmin();
  const { error } = await admin
    .from("openlu_etudiants")
    .update({ statut })
    .eq("id", id);

  if (error) {
    return { erreur: t("etudiants.erreurStatut") };
  }

  revalidatePath("/[locale]/etudiants", "page");
  return { ok: true };
}
