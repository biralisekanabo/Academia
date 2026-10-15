"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerNotifications } from "@/bibliotheque/notifications";
import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";
import type { SupportCours } from "@/types/database";

const BUCKET = "openlu_supports";
const TAILLE_MAX_FICHIER = 8 * 1024 * 1024;

const TYPES_FICHIERS = new Map([
  [".pdf", "application/pdf"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".txt", "text/plain"],
  ["", "text/plain"],
  [".doc", "application/msword"],
  [".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  [".xls", "application/vnd.ms-excel"],
  [".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  [".ppt", "application/vnd.ms-powerpoint"],
  [".pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  [".zip", "application/zip"],
  [".mp4", "video/mp4"],
]);

type ResultatAction = { erreur?: string; ok?: boolean; id?: string };

const TYPES_SUPPORT = new Set(["document", "video", "exercice", "lien"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// function nettoyerNomFichier(nom: string) {
//   const sansChemin = nom.split(/[\\/]/).pop() ?? "fichier";
//   return sansChemin.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || "fichier";
// }

async function chargerCoursAutorise(coursId: string, idUtilisateur: string, role: string) {
  if (!UUID.test(coursId)) return null;
  const admin = creerClientAdmin();
  const { data: cours } = await admin
    .from("openlu_cours")
    .select("id, titre, enseignant_id")
    .eq("id", coursId)
    .maybeSingle();
  if (!cours) return null;
  if (role === "enseignant" && cours.enseignant_id !== idUtilisateur) return null;
  return cours;
}

export async function ajouterSupport(formulaire: FormData): Promise<ResultatAction> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const coursId = String(formulaire.get("coursId") ?? "");
  const titre = String(formulaire.get("titre") ?? "").trim();
  const typeSupportBrut = String(formulaire.get("typeSupport") ?? "document");
  const lien = String(formulaire.get("lien") ?? "").trim();
  const description = String(formulaire.get("description") ?? "").trim();
  const fichier = formulaire.get("fichier");

  if (
    titre.length < 2 ||
    titre.length > 200 ||
    !TYPES_SUPPORT.has(typeSupportBrut)
  ) {
    return { erreur: t("classe.erreurSupport") };
  }

  const typeSupport = typeSupportBrut as SupportCours["type_support"];
  const cours = await chargerCoursAutorise(coursId, profil.id, profil.role);
  if (!cours) return { erreur: t("classe.erreurSupport") };

  const admin = creerClientAdmin();
  let url: string | null = null;

  if (fichier instanceof File && fichier.size > 0) {
    const extension = fichier.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    const typeAutorise = TYPES_FICHIERS.get(extension);
    if (fichier.size > TAILLE_MAX_FICHIER || !typeAutorise) {
      return { erreur: t("classe.erreurFichier") };
    }
    const chemin = `${coursId}/${randomUUID()}${extension}`;
    const { error } = await admin.storage.from(BUCKET).upload(chemin, fichier, {
      contentType: typeAutorise,
      upsert: false,
    });
    if (error) return { erreur: t("classe.erreurTeleversement") };
    url = chemin;
  } else if (lien && /^https?:\/\//i.test(lien)) {
    url = lien.slice(0, 2000);
  } else {
    return { erreur: t("classe.erreurSupport") };
  }

  const { data, error } = await admin
    .from("openlu_supports_cours")
    .insert({
      cours_id: coursId,
      titre,
      type_support: typeSupport,
      url,
      description: description ? description.slice(0, 2000) : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (url && !url.startsWith("http")) {
      await admin.storage.from(BUCKET).remove([url]);
    }
    return { erreur: t("classe.erreurSupport") };
  }

  await notifierClasse(coursId, {
    titre: t("notifications.evenements.supportTitre"),
    message: t("notifications.evenements.supportMessage", {
      cours: cours.titre,
      titre,
    }),
    lien: `/cours/${coursId}`,
  });

  revalidPathClasse(coursId);
  return { ok: true, id: data.id };
}

export async function supprimerSupport(id: string): Promise<ResultatAction> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);
  if (!UUID.test(id)) return { erreur: t("classe.erreurSupport") };

  const admin = creerClientAdmin();
  const { data: support } = await admin
    .from("openlu_supports_cours")
    .select("id, cours_id, url")
    .eq("id", id)
    .maybeSingle();

  if (!support) return { erreur: t("classe.erreurSupport") };

  const cours = await chargerCoursAutorise(support.cours_id, profil.id, profil.role);
  if (!cours) return { erreur: t("classe.erreurSupport") };

  if (support.url && !support.url.startsWith("http")) {
    await admin.storage.from(BUCKET).remove([support.url]);
  }

  const { error } = await admin.from("openlu_supports_cours").delete().eq("id", id);
  if (error) return { erreur: t("classe.erreurSupport") };

  revalidPathClasse(support.cours_id);
  return { ok: true };
}

export async function publierMessage(donnees: {
  coursId: string;
  contenu: string;
}): Promise<ResultatAction> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const contenu = donnees.contenu?.trim();
  if (!contenu || contenu.length > 8000) {
    return { erreur: t("classe.erreurMessage") };
  }

  const cours = await chargerCoursAutorise(donnees.coursId, profil.id, profil.role);
  if (!cours) return { erreur: t("classe.erreurMessage") };

  const admin = creerClientAdmin();
  const { error } = await admin.from("openlu_messages_cours").insert({
    cours_id: cours.id,
    auteur_id: profil.id,
    contenu,
  });

  if (error) return { erreur: t("classe.erreurMessage") };

  await notifierClasse(cours.id, {
    titre: t("notifications.evenements.messageClasseTitre"),
    message: t("notifications.evenements.messageClasseMessage", {
      cours: cours.titre,
    }),
    lien: `/cours/${cours.id}`,
  });

  revalidPathClasse(cours.id);
  return { ok: true };
}

export async function supprimerMessage(id: string): Promise<ResultatAction> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);
  if (!UUID.test(id)) return { erreur: t("classe.erreurMessage") };

  const admin = creerClientAdmin();
  const { data: message } = await admin
    .from("openlu_messages_cours")
    .select("id, cours_id")
    .eq("id", id)
    .maybeSingle();
  if (!message) return { erreur: t("classe.erreurMessage") };

  const cours = await chargerCoursAutorise(message.cours_id, profil.id, profil.role);
  if (!cours) return { erreur: t("classe.erreurMessage") };

  const { error } = await admin.from("openlu_messages_cours").delete().eq("id", id);
  if (error) return { erreur: t("classe.erreurMessage") };

  revalidPathClasse(message.cours_id);
  return { ok: true };
}

export async function basculerInscriptionOuverte(
  coursId: string,
  ouverte: boolean
): Promise<ResultatAction> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);
  if (typeof ouverte !== "boolean") return { erreur: t("classe.erreurPartage") };

  const cours = await chargerCoursAutorise(coursId, profil.id, profil.role);
  if (!cours) return { erreur: t("classe.erreurPartage") };

  const admin = creerClientAdmin();
  const { error } = await admin
    .from("openlu_cours")
    .update({ inscription_ouverte: ouverte })
    .eq("id", coursId);
  if (error) return { erreur: t("classe.erreurPartage") };

  revalidPathClasse(coursId);
  return { ok: true };
}

export async function regenererJetonCours(coursId: string): Promise<ResultatAction> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const cours = await chargerCoursAutorise(coursId, profil.id, profil.role);
  if (!cours) return { erreur: t("classe.erreurPartage") };

  const jeton = randomUUID().replace(/-/g, "");
  const admin = creerClientAdmin();
  const { error } = await admin
    .from("openlu_cours")
    .update({ jeton_inscription: jeton })
    .eq("id", coursId);
  if (error) return { erreur: t("classe.erreurPartage") };

  revalidPathClasse(coursId);
  return { ok: true };
}

async function notifierClasse(
  coursId: string,
  entree: { titre: string; message: string; lien: string }
) {
  const admin = creerClientAdmin();
  const { data } = await admin
    .from("openlu_inscriptions_cours")
    .select("etudiant_id")
    .eq("cours_id", coursId);

  const ids = (data ?? []).map((ligne) => ligne.etudiant_id);
  if (ids.length === 0) return;

  await creerNotifications(ids, {
    titre: entree.titre,
    message: entree.message,
    type: "info",
    lien: entree.lien,
  });
}

function revalidPathClasse(coursId: string) {
  revalidatePath("/apprentissage");
  revalidatePath(`/cours/${coursId}`);
}
