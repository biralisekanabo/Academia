"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerNotifications } from "@/bibliotheque/notifications";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import {
  schemaFrais,
  schemaPaiement,
  schemaSalaire,
  schemaTransaction,
} from "@/schemas/finances";
import { formatMontant } from "@/utilitaires/format";

export type ResultatFinance = {
  erreur?: string;
  ok?: boolean;
  paiementId?: string;
};

const DEVISE_DEFAUT = process.env.DEFAULT_CURRENCY || "CDF";

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
  const locale = await getLocale();
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

  if (statut === "valide") {
    await supabase.from("openlu_transactions").insert({
      type: "entree",
      categorie: "scolarite",
      libelle,
      montant,
      devise: DEVISE_DEFAUT,
      methode,
      source_id: data.id,
      enregistre_par: profil.id,
      description: t("finances.tresorerie.autoPaiement"),
    });

    await creerNotifications([etudiantId], {
      titre: t("notifications.evenements.paiementTitre"),
      message: t("notifications.evenements.paiementMessage", {
        montant: formatMontant(montant, locale, DEVISE_DEFAUT),
      }),
      type: "paiement",
      lien: "/tableau-de-bord",
    });
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
  const locale = await getLocale();
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

  if (statut === "valide") {
    await supabase.from("openlu_transactions").insert({
      type: "sortie",
      categorie: "salaire",
      libelle,
      montant,
      devise: DEVISE_DEFAUT,
      methode,
      enregistre_par: profil.id,
      description: t("finances.tresorerie.autoSalaire"),
    });

    await creerNotifications([enseignantId], {
      titre: t("notifications.evenements.salaireTitre"),
      message: t("notifications.evenements.salaireMessage", {
        montant: formatMontant(montant, locale, DEVISE_DEFAUT),
      }),
      type: "paiement",
      lien: "/tableau-de-bord",
    });
  }

  revalidatePath("/finances");
  return { ok: true };
}

export async function creerTransaction(donnees: {
  type: string;
  categorie: string;
  libelle: string;
  montant: number;
  devise?: string;
  methode: string;
  dateTransaction: string;
  description?: string;
}): Promise<ResultatFinance> {
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle(["finance"]);

  const resultat = schemaTransaction.safeParse({
    ...donnees,
    montant: String(donnees.montant),
  });

  if (!resultat.success) {
    return { erreur: t("commun.erreurFormulaire") };
  }

  const {
    type,
    categorie,
    libelle,
    montant,
    devise,
    methode,
    dateTransaction,
    description,
  } = resultat.data;

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("openlu_transactions").insert({
    type,
    categorie,
    libelle,
    montant,
    devise,
    methode,
    date_transaction: dateTransaction,
    description: description?.trim() ? description.trim() : null,
    enregistre_par: profil.id,
  });

  if (error) {
    return { erreur: t("finances.erreurCreation") };
  }

  revalidatePath("/finances");
  return { ok: true };
}

export async function supprimerTransaction(id: string): Promise<ResultatFinance> {
  const t = await getTranslations();
  await obtenirProfilSousControle(["finance"]);

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("openlu_transactions")
    .delete()
    .eq("id", id);

  if (error) {
    return { erreur: t("finances.erreurSuppression") };
  }

  revalidatePath("/finances");
  return { ok: true };
}
