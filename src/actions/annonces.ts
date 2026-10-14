"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerNotificationPourTous } from "@/bibliotheque/notifications";
import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";

const TAILLE_MAX_FICHIER = 4 * 1024 * 1024;
const NOMBRE_MAX_FICHIERS = 5;

const TYPES_FICHIERS = new Map([
  [".pdf", "application/pdf"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [
    ".docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  [
    ".xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
]);

type ResultatAction = { erreur?: string; ok?: boolean };

async function retirerFichiersDuStockage(
  admin: ReturnType<typeof creerClientAdmin>,
  chemins: string[]
) {
  if (!chemins.length) return true;
  const { error } = await admin.storage.from("openlu_annonces").remove(chemins);
  if (error) {
    console.error("Échec du nettoyage des fichiers d’annonce.", error);
    return false;
  }
  return true;
}

function nettoyerNomFichier(nom: string) {
  const sansChemin = nom.split(/[\\/]/).pop() ?? "fichier";
  return sansChemin.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || "fichier";
}

function validerFichiers(fichiers: File[]): string | null {
  if (fichiers.length > NOMBRE_MAX_FICHIERS) {
    return "annonces.erreurNombreFichiers";
  }

  for (const fichier of fichiers) {
    const extension = fichier.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    const typeAutorise = TYPES_FICHIERS.get(extension);
    if (
      !typeAutorise ||
      fichier.type !== typeAutorise ||
      fichier.size < 1 ||
      fichier.size > TAILLE_MAX_FICHIER
    ) {
      return "annonces.erreurTypeOuTaille";
    }
  }

  return null;
}

async function televerserFichiers(
  annonceId: string,
  fichiers: File[]
): Promise<ResultatAction> {
  const erreurValidation = validerFichiers(fichiers);
  if (erreurValidation) return { erreur: erreurValidation };

  const admin = creerClientAdmin();
  const chemins: string[] = [];
  const lignes = [];

  for (const fichier of fichiers) {
    const extension = fichier.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    const chemin = `${annonceId}/${randomUUID()}${extension}`;
    const { error } = await admin.storage
      .from("openlu_annonces")
      .upload(chemin, fichier, {
        contentType: TYPES_FICHIERS.get(extension),
        upsert: false,
      });

    if (error) {
        const nettoyageReussi = await retirerFichiersDuStockage(admin, chemins);
        if (!nettoyageReussi) return { erreur: "annonces.erreurNettoyage" };
        return { erreur: "annonces.erreurTeleversement" };
      }

    chemins.push(chemin);
    lignes.push({
      annonce_id: annonceId,
      nom: nettoyerNomFichier(fichier.name),
      chemin,
      type_mime: TYPES_FICHIERS.get(extension)!,
      taille_octets: fichier.size,
    });
  }

  if (lignes.length) {
    const { error } = await admin.from("openlu_annonces_fichiers").insert(lignes);
    if (error) {
      const nettoyageReussi = await retirerFichiersDuStockage(admin, chemins);
      if (!nettoyageReussi) return { erreur: "annonces.erreurNettoyage" };
      return { erreur: "annonces.erreurEnregistrementFichiers" };
    }
  }

  return { ok: true };
}

export async function creerAnnonce(formulaire: FormData): Promise<ResultatAction> {
  const profil = await obtenirProfilSousControle(["administrateur"]);
  const titre = String(formulaire.get("titre") ?? "").trim();
  const contenu = String(formulaire.get("contenu") ?? "").trim();
  const publiee = formulaire.get("publiee") === "true";
  const fichiers = formulaire.getAll("fichiers").filter((value): value is File => value instanceof File && value.size > 0);

  if (titre.length < 3 || titre.length > 160 || contenu.length < 3 || contenu.length > 12000) {
    return { erreur: "annonces.erreurValidation" };
  }
  const erreurFichiers = validerFichiers(fichiers);
  if (erreurFichiers) return { erreur: erreurFichiers };

  const admin = creerClientAdmin();
  const { data: annonce, error } = await admin
    .from("openlu_annonces")
    .insert({
      titre,
      contenu,
      publiee,
      publiee_le: publiee ? new Date().toISOString() : null,
      auteur_id: profil.id,
    })
    .select("id")
    .single();

  if (error || !annonce) return { erreur: "annonces.erreurCreation" };

  const resultatFichiers = await televerserFichiers(annonce.id, fichiers);
  if (resultatFichiers.erreur) {
    const { error: erreurNettoyage } = await admin
      .from("openlu_annonces")
      .delete()
      .eq("id", annonce.id);
    if (erreurNettoyage) {
      console.error("Échec du nettoyage de l’annonce après un téléversement incomplet.", erreurNettoyage);
      return { erreur: "annonces.erreurNettoyage" };
    }
    return resultatFichiers;
  }

  if (publiee) {
    await notifierAnnonce(titre);
  }

  revaliderAnnonces();
  return { ok: true };
}

async function notifierAnnonce(titre: string) {
  const t = await getTranslations();
  await creerNotificationPourTous({
    titre: t("notifications.evenements.annonceTitre"),
    message: t("notifications.evenements.annonceMessage", { titre }),
    type: "annonce",
    lien: "/annonces-publiques",
  });
}

export async function modifierAnnonce(formulaire: FormData): Promise<ResultatAction> {
  await obtenirProfilSousControle(["administrateur"]);
  const id = String(formulaire.get("id") ?? "");
  const titre = String(formulaire.get("titre") ?? "").trim();
  const contenu = String(formulaire.get("contenu") ?? "").trim();
  const fichiers = formulaire.getAll("fichiers").filter((value): value is File => value instanceof File && value.size > 0);

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { erreur: "annonces.erreurModification" };
  }
  if (titre.length < 3 || titre.length > 160 || contenu.length < 3 || contenu.length > 12000) {
    return { erreur: "annonces.erreurValidation" };
  }
  const erreurFichiers = validerFichiers(fichiers);
  if (erreurFichiers) return { erreur: erreurFichiers };

  const admin = creerClientAdmin();
  const { error } = await admin
    .from("openlu_annonces")
    .update({ titre, contenu })
    .eq("id", id);
  if (error) return { erreur: "annonces.erreurModification" };

  const resultatFichiers = await televerserFichiers(id, fichiers);
  if (resultatFichiers.erreur) return resultatFichiers;

  revaliderAnnonces();
  return { ok: true };
}

export async function definirPublicationAnnonce(
  id: string,
  publiee: boolean
): Promise<ResultatAction> {
  await obtenirProfilSousControle(["administrateur"]);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    typeof publiee !== "boolean"
  ) {
    return { erreur: "annonces.erreurPublication" };
  }

  const admin = creerClientAdmin();
  const { data: annonce, error } = await admin
    .from("openlu_annonces")
    .update({
      publiee,
      publiee_le: publiee ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("titre")
    .maybeSingle();

  if (error) return { erreur: "annonces.erreurPublication" };

  if (publiee && annonce) {
    await notifierAnnonce(annonce.titre);
  }

  revaliderAnnonces();
  return { ok: true };
}

export async function supprimerAnnonce(id: string): Promise<ResultatAction> {
  await obtenirProfilSousControle(["administrateur"]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { erreur: "annonces.erreurSuppression" };
  }

  const admin = creerClientAdmin();
  const { data: fichiers, error: erreurLecture } = await admin
    .from("openlu_annonces_fichiers")
    .select("chemin")
    .eq("annonce_id", id);
  if (erreurLecture) return { erreur: "annonces.erreurSuppression" };

  const chemins = (fichiers ?? []).map((fichier) => fichier.chemin);
  if (chemins.length) {
    const { error } = await admin.storage.from("openlu_annonces").remove(chemins);
    if (error) return { erreur: "annonces.erreurSuppressionFichiers" };
  }

  const { error } = await admin.from("openlu_annonces").delete().eq("id", id);
  if (error) {
    console.error("Échec de la suppression de l’annonce après retrait de ses fichiers.", error);
    return { erreur: "annonces.erreurNettoyage" };
  }
  revaliderAnnonces();
  return { ok: true };
}

function revaliderAnnonces() {
  revalidatePath("/[locale]/annonces", "page");
  revalidatePath("/[locale]/annonces-publiques", "page");
}
