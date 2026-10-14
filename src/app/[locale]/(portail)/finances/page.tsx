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
import type {
  EtudiantExploration,
  FaculteExploration,
  FiliereExploration,
} from "@/fonctionnalites/finances/explorateur-etudiants";
import type { TypeNiveau, TypeStatut } from "@/types/database";

type ParametresPage = {
  searchParams: Promise<{ onglet?: string }>;
};

const ONGLETS_VALIDES: OngletFinance[] = [
  "frais",
  "paiements",
  "salaires",
  "tresorerie",
  "etudiants",
];

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
    ongletParam && ONGLETS_VALIDES.includes(ongletParam as OngletFinance)
      ? (ongletParam as OngletFinance)
      : "frais";

  const supabase = await creerClientServeur();

  const [
    frais,
    paiements,
    salaires,
    transactions,
    facultes,
    filieres,
    etudiants,
    enseignants,
  ] = await Promise.all([
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
      .from("openlu_transactions")
      .select(
        "id, type, categorie, libelle, montant, devise, methode, reference, date_transaction, description, openlu_profils(prenom, nom)"
      )
      .order("date_transaction", { ascending: false })
      .order("cree_le", { ascending: false })
      .limit(500),
    supabase
      .from("openlu_facultes")
      .select("id, code, nom, description")
      .order("ordre", { ascending: true }),
    supabase
      .from("openlu_filieres")
      .select("id, nom, faculte_id")
      .order("nom", { ascending: true }),
    supabase
      .from("openlu_etudiants")
      .select(
        "id, matricule, niveau, statut, filiere_id, openlu_profils(prenom, nom), openlu_filieres(nom)"
      )
      .order("cree_le", { ascending: true })
      .limit(1000),
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

  const facultesExploration: FaculteExploration[] =
    facultes.data?.map((f) => ({
      id: f.id,
      code: f.code,
      nom: f.nom,
      description: f.description,
    })) ?? [];

  const filieresExploration: FiliereExploration[] =
    filieres.data?.map((f) => ({
      id: f.id,
      nom: f.nom,
      faculteId: f.faculte_id,
    })) ?? [];

  const etudiantsExploration: EtudiantExploration[] =
    etudiants.data?.map((e) => ({
      id: e.id,
      matricule: e.matricule,
      prenom: e.openlu_profils?.prenom ?? "",
      nom: e.openlu_profils?.nom ?? "",
      filiereId: e.filiere_id,
      niveau: e.niveau as TypeNiveau,
      statut: e.statut as TypeStatut,
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
        transactions={(transactions.data ?? []) as never}
        facultes={optionsFacultes}
        filieres={optionsFilieres}
        etudiants={optionsEtudiants}
        enseignants={optionsEnseignants}
        facultesExploration={facultesExploration}
        filieresExploration={filieresExploration}
        etudiantsExploration={etudiantsExploration}
      />
    </div>
  );
}
