import { BookOpen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import type { OptionRecherche } from "@/composants/partages/selecteur-recherche";
import {
  GestionCours,
  type CoursItem,
} from "@/fonctionnalites/cours/gestion-cours";

export const instant = false;

export default async function PageCours() {
  await connection();
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle([
    "administrateur",
    "personnel",
    "enseignant",
    "etudiant",
  ]);

  const supabase = await creerClientServeur();

  const { data: cours } = await supabase
    .from("openlu_cours")
    .select(
      "id, code, titre, description, credits, semestre, enseignant_id, openlu_enseignants(openlu_profils(prenom, nom))"
    )
    .order("semestre", { ascending: true })
    .order("code", { ascending: true });

  let optionsEnseignants: OptionRecherche[] = [];
  if (profil.role === "administrateur") {
    const { data: enseignants } = await supabase
      .from("openlu_enseignants")
      .select("id, openlu_profils(prenom, nom)")
      .order("date_embauche", { ascending: true });
    optionsEnseignants =
      enseignants?.map((en) => ({
        valeur: en.id,
        libelle: en.openlu_profils
          ? `${en.openlu_profils.prenom} ${en.openlu_profils.nom}`.trim()
          : "—",
      })) ?? [];
  }

  const listeCours: CoursItem[] =
    cours?.map((c) => {
      const prof = c.openlu_enseignants?.openlu_profils;
      return {
        id: c.id,
        code: c.code,
        titre: c.titre,
        description: c.description,
        credits: c.credits,
        semestre: c.semestre,
        enseignantId: c.enseignant_id,
        enseignantNom: prof ? `${prof.prenom} ${prof.nom}`.trim() : null,
      };
    }) ?? [];

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={BookOpen}
        titre={t("cours.titre")}
        sousTitre={t("cours.sousTitre")}
      />
      <GestionCours
        role={profil.role}
        utilisateurId={profil.id}
        cours={listeCours}
        enseignants={optionsEnseignants}
      />
    </div>
  );
}
