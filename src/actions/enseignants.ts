"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerNotifications } from "@/bibliotheque/notifications";
import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";
import { debloquerCompteBloque } from "@/bibliotheque/supabase/comptes";
import {
  schemaEnseignant,
  schemaModificationEnseignant,
} from "@/schemas/enseignant";
import type {
  DonneesEnseignant,
  DonneesModificationEnseignant,
} from "@/schemas/enseignant";

export type ResultatEnseignant = {
  erreur?: string;
  ok?: boolean;
};

export async function inscrireEnseignant(
  donnees: DonneesEnseignant
): Promise<ResultatEnseignant> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["administrateur", "reception", "personnel"]);

  const resultat = schemaEnseignant.safeParse(donnees);
  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { prenom, nom, email, specialite, statut, dateEmbauche } = resultat.data;

  const admin = creerClientAdmin();

  // Compte Auth créé via service_role : pas d'e-mail de confirmation, la
  // session de l'agent de réception n'est pas remplacée.
  const metadata = { prenom, nom, role: "enseignant" };
  const { data: cree, error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: "openlu-initial",
    email_confirm: true,
    user_metadata: metadata,
  });

  let idUtilisateur = cree?.user?.id ?? null;

  if (erreurAuth || !idUtilisateur) {
    const deja = /already|existe|registered/i.test(erreurAuth?.message ?? "");

    // Un compte resté non confirmé par l'ancien flux est débloqué au lieu
    // de renvoyer « déjà utilisé » : personne ne peut s'en servir.
    if (deja) {
      idUtilisateur = await debloquerCompteBloque(admin, email, {
        motDePasse: "openlu-initial",
        metadata,
      });
    }

    if (!idUtilisateur) {
      return {
        erreur: deja
          ? t("enseignants.emailDejaUtilise")
          : t("enseignants.erreurCompte"),
      };
    }
  }

  const { error: erreurDossier } = await admin
    .from("openlu_enseignants")
    .insert({
      id: idUtilisateur,
      specialite: specialite?.trim() ? specialite.trim() : null,
      statut,
      date_embauche: dateEmbauche?.trim() ? dateEmbauche : null,
    });

  if (erreurDossier) {
    await admin.auth.admin.deleteUser(idUtilisateur).catch(() => undefined);
    return { erreur: t("enseignants.erreurDossier") };
  }

  await creerNotifications([idUtilisateur], {
    titre: t("notifications.evenements.enseignantTitre"),
    message: t("notifications.evenements.enseignantMessage", {
      nom: `${prenom} ${nom}`.trim(),
    }),
    type: "succes",
    lien: "/cours",
  });

  revalidatePath("/[locale]/enseignants", "page");
  revalidatePath("/[locale]/finances", "page");
  revalidatePath("/[locale]/tableau-de-bord", "page");
  return { ok: true };
}

export async function modifierEnseignant(
  donnees: DonneesModificationEnseignant
): Promise<ResultatEnseignant> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["administrateur", "reception", "personnel"]);

  const resultat = schemaModificationEnseignant.safeParse(donnees);
  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { id, prenom, nom, specialite, statut } = resultat.data;
  const admin = creerClientAdmin();

  const { data: enseignant, error: erreurLecture } = await admin
    .from("openlu_enseignants")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (erreurLecture || !enseignant) {
    return { erreur: t("enseignants.erreurMiseAJour") };
  }

  const { error: erreurProfil } = await admin
    .from("openlu_profils")
    .update({ prenom, nom })
    .eq("id", id)
    .eq("role", "enseignant");

  if (erreurProfil) {
    return { erreur: t("enseignants.erreurMiseAJour") };
  }

  const { error: erreurDossier } = await admin
    .from("openlu_enseignants")
    .update({
      specialite: specialite?.trim() ? specialite.trim() : null,
      statut,
    })
    .eq("id", id);

  if (erreurDossier) {
    return { erreur: t("enseignants.erreurMiseAJourPartielle") };
  }

  revalidatePath("/[locale]/enseignants", "page");
  return { ok: true };
}

export async function definirStatutEnseignant(
  id: string,
  statut: "actif" | "inactif"
): Promise<ResultatEnseignant> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["administrateur", "reception", "personnel"]);

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    (statut !== "actif" && statut !== "inactif")
  ) {
    return { erreur: t("enseignants.erreurStatut") };
  }

  const admin = creerClientAdmin();
  const { error } = await admin
    .from("openlu_enseignants")
    .update({ statut })
    .eq("id", id);

  if (error) {
    return { erreur: t("enseignants.erreurStatut") };
  }

  revalidatePath("/[locale]/enseignants", "page");
  return { ok: true };
}
