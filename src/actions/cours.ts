"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { schemaCours } from "@/schemas/notes";

export type ResultatCours = {
  erreur?: string;
  ok?: boolean;
  coursId?: string;
};

export async function creerCours(donnees: {
  code: string;
  titre: string;
  description?: string;
  credits: number;
  semestre: number;
  enseignantId?: string;
}): Promise<ResultatCours> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const resultat = schemaCours.safeParse({
    ...donnees,
    credits: String(donnees.credits),
    semestre: String(donnees.semestre),
  });

  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { code, titre, description, credits, semestre, enseignantId } = resultat.data;

  const enseignantFinal =
    profil.role === "enseignant" ? profil.id : enseignantId?.trim() || null;

  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("openlu_cours")
    .insert({
      code: code.toUpperCase(),
      titre,
      description: description?.trim() ? description.trim() : null,
      credits,
      semestre,
      enseignant_id: enseignantFinal,
    })
    .select("id")
    .single();

  if (error) {
    return { erreur: t("cours.erreurCreation") };
  }

  revalidatePath("/cours");
  revalidatePath("/notes");
  return { ok: true, coursId: data?.id };
}

export async function supprimerCours(id: string): Promise<ResultatCours> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const supabase = await creerClientServeur();
  let requete = supabase.from("openlu_cours").delete().eq("id", id);
  if (profil.role === "enseignant") {
    requete = requete.eq("enseignant_id", profil.id);
  }

  const { error } = await requete;
  if (error) {
    return { erreur: t("cours.erreurSuppression") };
  }

  revalidatePath("/cours");
  revalidatePath("/notes");
  return { ok: true };
}
