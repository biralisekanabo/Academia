import { ClipboardCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import {
  EspaceNotes,
  type CoursNote,
  type EtudiantDisponible,
  type EvaluationNote,
  type InscriptionNote,
  type NoteLigne,
} from "@/fonctionnalites/notes/espace-notes";

export default async function PageNotes() {
  await connection();
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle([
    "administrateur",
    "enseignant",
    "etudiant",
  ]);

  const supabase = await creerClientServeur();

  const [cours, evaluations, notes, inscriptions, etudiants] = await Promise.all([
    supabase
      .from("openlu_cours")
      .select(
        "id, code, titre, credits, semestre, enseignant_id, openlu_enseignants(openlu_profils(prenom, nom))"
      )
      .order("code", { ascending: true }),
    supabase
      .from("openlu_evaluations")
      .select("id, cours_id, titre, type, coefficient, bareme, date_echeance")
      .order("cree_le", { ascending: true }),
    supabase
      .from("openlu_notes")
      .select("id, evaluation_id, etudiant_id, valeur, appreciation"),
    supabase
      .from("openlu_inscriptions_cours")
      .select("cours_id, etudiant_id, openlu_etudiants(matricule, openlu_profils(prenom, nom))"),
    supabase
      .from("openlu_etudiants")
      .select("id, matricule, openlu_profils(prenom, nom)")
      .order("matricule", { ascending: true }),
  ]);

  const listeCours: CoursNote[] =
    cours.data?.map((c) => {
      const prof = c.openlu_enseignants?.openlu_profils;
      return {
        id: c.id,
        code: c.code,
        titre: c.titre,
        credits: c.credits,
        semestre: c.semestre,
        enseignantId: c.enseignant_id,
        enseignantNom: prof ? `${prof.prenom} ${prof.nom}`.trim() : null,
      };
    }) ?? [];

  const listeEvaluations: EvaluationNote[] =
    evaluations.data?.map((e) => ({
      id: e.id,
      coursId: e.cours_id,
      titre: e.titre,
      type: e.type,
      coefficient: Number(e.coefficient),
      bareme: Number(e.bareme),
      dateEcheance: e.date_echeance,
    })) ?? [];

  const listeNotes: NoteLigne[] =
    notes.data?.map((n) => ({
      id: n.id,
      evaluationId: n.evaluation_id,
      etudiantId: n.etudiant_id,
      valeur: Number(n.valeur),
      appreciation: n.appreciation,
    })) ?? [];

  const listeInscriptions: InscriptionNote[] =
    inscriptions.data?.map((i) => {
      const dossier = i.openlu_etudiants;
      const prof = dossier?.openlu_profils;
      return {
        coursId: i.cours_id,
        etudiantId: i.etudiant_id,
        prenom: prof?.prenom ?? "",
        nom: prof?.nom ?? "",
        matricule: dossier?.matricule ?? null,
      };
    }) ?? [];

  const listeEtudiants: EtudiantDisponible[] =
    etudiants.data?.map((e) => ({
      id: e.id,
      prenom: e.openlu_profils?.prenom ?? "",
      nom: e.openlu_profils?.nom ?? "",
      matricule: e.matricule ?? null,
    })) ?? [];

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={ClipboardCheck}
        titre={t("notes.titre")}
        sousTitre={t("notes.sousTitre")}
      />
      <EspaceNotes
        role={profil.role}
        utilisateurId={profil.id}
        cours={listeCours}
        evaluations={listeEvaluations}
        notes={listeNotes}
        inscriptions={listeInscriptions}
        etudiantsDisponibles={listeEtudiants}
      />
    </div>
  );
}
