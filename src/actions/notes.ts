"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerNotifications } from "@/bibliotheque/notifications";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { schemaEvaluation, schemaNotes } from "@/schemas/notes";

export type ResultatNote = {
  erreur?: string;
  ok?: boolean;
  evaluationId?: string;
};

export async function creerEvaluation(donnees: {
  coursId: string;
  titre: string;
  type: string;
  coefficient: number;
  bareme: number;
  dateEcheance?: string;
}): Promise<ResultatNote> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const resultat = schemaEvaluation.safeParse({
    ...donnees,
    coefficient: String(donnees.coefficient),
    bareme: String(donnees.bareme),
  });

  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { coursId, titre, type, coefficient, bareme, dateEcheance } = resultat.data;

  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("openlu_evaluations")
    .insert({
      cours_id: coursId,
      titre,
      type,
      coefficient,
      bareme,
      date_echeance: dateEcheance?.trim() ? dateEcheance : null,
    })
    .select("id")
    .single();

  if (error) {
    return { erreur: t("notes.erreurCreation") };
  }

  revalidatePath("/notes");
  return { ok: true, evaluationId: data?.id };
}

export async function supprimerEvaluation(id: string): Promise<ResultatNote> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("openlu_evaluations")
    .delete()
    .eq("id", id);

  if (error) {
    return { erreur: t("notes.erreurSuppression") };
  }

  revalidatePath("/notes");
  return { ok: true };
}

export async function saisirNotes(donnees: {
  evaluationId: string;
  notes: { etudiantId: string; valeur: number; appreciation?: string }[];
}): Promise<ResultatNote> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["enseignant", "administrateur"]);

  const resultat = schemaNotes.safeParse(donnees);
  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { evaluationId, notes } = resultat.data;

  const supabase = await creerClientServeur();

  const { data: evaluation, error: erreurEvaluation } = await supabase
    .from("openlu_evaluations")
    .select("id, titre, bareme, openlu_cours(titre)")
    .eq("id", evaluationId)
    .single();

  if (erreurEvaluation || !evaluation) {
    return { erreur: t("notes.erreurCreation") };
  }

  const bareme = Number(evaluation.bareme);
  const valides = notes.filter(
    (note) => Number.isFinite(note.valeur) && note.valeur >= 0 && note.valeur <= bareme
  );

  if (valides.length === 0) {
    return { erreur: t("notes.aucuneNoteValide") };
  }

  const lignes = valides.map((note) => ({
    evaluation_id: evaluationId,
    etudiant_id: note.etudiantId,
    valeur: note.valeur,
    appreciation: note.appreciation?.trim() ? note.appreciation.trim() : null,
  }));

  const { error } = await supabase
    .from("openlu_notes")
    .upsert(lignes, { onConflict: "evaluation_id,etudiant_id" });

  if (error) {
    return { erreur: t("notes.erreurCreation") };
  }

  const coursTitre = evaluation.openlu_cours?.titre ?? "";
  await creerNotifications(
    valides.map((note) => note.etudiantId),
    {
      titre: t("notifications.evenements.noteTitre"),
      message: t("notifications.evenements.noteMessage", {
        cours: coursTitre,
        evaluation: evaluation.titre,
        bareme,
      }),
      type: "note",
      lien: "/notes",
    }
  );

  revalidatePath("/notes");
  return { ok: true };
}
