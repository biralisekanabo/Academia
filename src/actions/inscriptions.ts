"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerNotifications } from "@/bibliotheque/notifications";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";

export type ResultatInscription = {
  erreur?: string;
  ok?: boolean;
};

const schemaCible = z.object({
  coursId: z.string().uuid(),
  etudiantId: z.string().uuid(),
});

/**
 * Inscrit un étudiant à un cours. Réservé au propriétaire du cours
 * (enseignant) ou à l'administration. L'écriture passe par le client
 * service_role car la RLS n'expose pas d'insertion pour l'enseignant.
 */
export async function inscrireEtudiantAuCours(donnees: {
  coursId: string;
  etudiantId: string;
}): Promise<ResultatInscription> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const resultat = schemaCible.safeParse(donnees);
  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { coursId, etudiantId } = resultat.data;
  const supabase = await creerClientServeur();

  const { data: cours, error: erreurCours } = await supabase
    .from("openlu_cours")
    .select("id, titre, enseignant_id")
    .eq("id", coursId)
    .single();

  if (erreurCours || !cours) {
    return { erreur: t("notes.erreurInscription") };
  }

  if (profil.role === "enseignant" && cours.enseignant_id !== profil.id) {
    return { erreur: t("notes.erreurInscription") };
  }

  const admin = creerClientAdmin();
  const { error } = await admin
    .from("openlu_inscriptions_cours")
    .upsert(
      { cours_id: coursId, etudiant_id: etudiantId, statut: "validee" },
      { onConflict: "etudiant_id,cours_id" }
    );

  if (error) {
    return { erreur: t("notes.erreurInscription") };
  }

  await creerNotifications([etudiantId], {
    titre: t("notifications.evenements.coursTitre"),
    message: t("notifications.evenements.coursMessage", { cours: cours.titre }),
    type: "info",
    lien: "/notes",
  });

  revalidatePath("/notes");
  return { ok: true };
}

export async function retirerEtudiantDuCours(donnees: {
  coursId: string;
  etudiantId: string;
}): Promise<ResultatInscription> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const resultat = schemaCible.safeParse(donnees);
  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { coursId, etudiantId } = resultat.data;
  const supabase = await creerClientServeur();

  const { data: cours, error: erreurCours } = await supabase
    .from("openlu_cours")
    .select("id, enseignant_id")
    .eq("id", coursId)
    .single();

  if (erreurCours || !cours) {
    return { erreur: t("notes.erreurRetrait") };
  }

  if (profil.role === "enseignant" && cours.enseignant_id !== profil.id) {
    return { erreur: t("notes.erreurRetrait") };
  }

  const admin = creerClientAdmin();
  const { error } = await admin
    .from("openlu_inscriptions_cours")
    .delete()
    .eq("cours_id", coursId)
    .eq("etudiant_id", etudiantId);

  if (error) {
    return { erreur: t("notes.erreurRetrait") };
  }

  revalidatePath("/notes");
  return { ok: true };
}
