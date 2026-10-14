"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import {
  schemaFrais,
  schemaPaiement,
  schemaSalaire,
} from "@/schemas/finances";

export type ResultatFinance = {
  erreur?: string;
  ok?: boolean;
  paiementId?: string;
};

export async function creerFrais(donnees: {
  faculteId: string;
  filiereId: string;
  niveau: string;
  libelle: string;
  montant: number;
  devise?: string;
  anneeUniversitaire: string;
}): Promise<ResultatFinance> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["finance"]);

  const resultat = schemaFrais.safeParse({
    ...donnees,
    montant: String(donnees.montant),
  });

  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { filiereId, faculteId, niveau, libelle, montant, devise, anneeUniversitaire } =
    resultat.data;

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("openlu_frais_scolarite").insert({
    faculte_id: faculteId,
    filiere_id: filiereId,
    niveau,
    libelle,
    montant,
    devise,
    annee_universitaire: anneeUniversitaire,
  });

  if (error) {
    return { erreur: t("finances.erreurCreation") };
  }

  revalidatePath("/finances");
  return { ok: true };
}

export async function enregistrerPaiement(donnees: {
  etudiantId: string;
  libelle: string;
  montant: number;
  methode: string;
  statut: string;
}): Promise<ResultatFinance> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["finance"]);

  const resultat = schemaPaiement.safeParse({
    ...donnees,
    montant: String(donnees.montant),
  });

  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { etudiantId, libelle, montant, methode, statut } = resultat.data;

  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("openlu_paiements")
    .insert({
      etudiant_id: etudiantId,
      libelle,
      montant,
      methode,
      statut,
      enregistre_par: profil.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { erreur: t("finances.erreurCreation") };
  }

  revalidatePath("/finances");
  return { ok: true, paiementId: data.id };
}

export async function payerEnseignant(donnees: {
  enseignantId: string;
  libelle: string;
  montant: number;
  mois: string;
  methode: string;
  statut: string;
}): Promise<ResultatFinance> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["finance"]);

  const resultat = schemaSalaire.safeParse({
    ...donnees,
    montant: String(donnees.montant),
  });

  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const { enseignantId, libelle, montant, mois, methode, statut } = resultat.data;

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("openlu_paiements_enseignants").insert({
    enseignant_id: enseignantId,
    libelle,
    montant,
    mois,
    methode,
    statut,
    enregistre_par: profil.id,
  });

  if (error) {
    return { erreur: t("finances.erreurCreation") };
  }

  revalidatePath("/finances");
  return { ok: true };
}