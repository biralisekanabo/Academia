import { Landmark } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import type { OptionRecherche } from "@/composants/partages/selecteur-recherche";
import {
  EspaceFinances,
  type OngletFinance,
} from "@/fonctionnalites/finances/espace-finances";

type ParametresPage = {
  searchParams: Promise<{ onglet?: string }>;
};

export const instant = false;

export default async function PageFinances({
  searchParams,
}: ParametresPage) {
  await connection();
  const t = await getTranslations();
  const locale = await getLocale();
  const profil = await obtenirProfilSousControle(["finance"]);

  const { onglet: ongletParam } = await searchParams;
  const onglet: OngletFinance =
    ongletParam === "paiements" || ongletParam === "salaires"
      ? ongletParam
      : "frais";

  const supabase = await creerClientServeur();

  const [frais, paiements, salaires, facultes, filieres, etudiants, enseignants] =
    await Promise.all([
      supabase
        .from("openlu_frais_scolarite")
        .select(
          "id, libelle, montant, devise, niveau, annee_universitaire, openlu_filieres(nom, openlu_facultes(code)), openlu_facultes(code)"
        )
        .order("annee_universitaire", { ascending: false }),
      supabase
        .from("openlu_paiements")
        .select(
          "id, reference, libelle, montant, methode, statut, date_paiement, openlu_profils(prenom, nom)"
        )
        .order("cree_le", { ascending: false }),
      supabase
        .from("openlu_paiements_enseignants")
        .select(
          "id, reference, libelle, montant, mois, methode, statut, openlu_profils(prenom, nom)"
        )
        .order("cree_le", { ascending: false }),
      supabase
        .from("openlu_facultes")
        .select("id, code, nom")
        .order("ordre", { ascending: true }),
      supabase
        .from("openlu_filieres")
        .select("id, nom, faculte_id")
        .order("nom", { ascending: true }),
      supabase
        .from("openlu_etudiants")
        .select("id, matricule, openlu_profils(prenom, nom), openlu_filieres(nom)")
        .order("cree_le", { ascending: true })
        .limit(500),
      supabase
        .from("openlu_enseignants")
        .select("id, openlu_profils(prenom, nom)")
        .order("date_embauche", { ascending: true })
        .limit(300),
    ]);

  const optionsFacultes: OptionRecherche[] =
    facultes.data?.map((f) => ({
      valeur: f.id,
      libelle: `${f.code} — ${f.nom}`,
      sousLibelle: f.nom,
    })) ?? [];

  const optionsFilieres: OptionRecherche[] =
    filieres.data?.map((f) => ({
      valeur: f.id,
      libelle: f.nom,
      groupe: f.faculte_id,
    })) ?? [];

  const optionsEtudiants: OptionRecherche[] =
    etudiants.data?.map((e) => ({
      valeur: e.id,
      libelle: `${e.matricule} — ${e.openlu_profils?.prenom ?? ""} ${e.openlu_profils?.nom ?? ""}`,
      sousLibelle: e.openlu_filieres?.nom,
    })) ?? [];

  const optionsEnseignants: OptionRecherche[] =
    enseignants.data?.map((en) => ({
      valeur: en.id,
      libelle: `${en.openlu_profils?.prenom ?? ""} ${en.openlu_profils?.nom ?? ""}`,
    })) ?? [];

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={Landmark}
        titre={t("finances.titre")}
        sousTitre={t("finances.sousTitre")}
      />

      <EspaceFinances
        onglet={onglet}
        locale={locale}
        role={profil.role}
        frais={(frais.data ?? []) as never}
        paiements={(paiements.data ?? []) as never}
        salaires={(salaires.data ?? []) as never}
        facultes={optionsFacultes}
        filieres={optionsFilieres}
        etudiants={optionsEtudiants}
        enseignants={optionsEnseignants}
      />
    </div>
  );
}