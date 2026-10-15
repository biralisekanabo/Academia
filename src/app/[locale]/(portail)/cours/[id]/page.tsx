import { notFound } from "next/navigation";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import {
  EspaceClasse,
  type MessageClasse,
  type NoteClasse,
  type SupportClasse,
} from "@/fonctionnalites/cours/espace-classe";

export const instant = false;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PageClasse({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

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
      "id, code, titre, description, credits, semestre, enseignant_id, jeton_inscription, inscription_ouverte, openlu_enseignants(openlu_profils(prenom, nom))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!cours) notFound();

  const estProprietaire =
    profil.role === "enseignant" && cours.enseignant_id === profil.id;
  const estGestionnaire = profil.role === "administrateur" || estProprietaire;

  let inscrit = false;
  if (profil.role === "etudiant") {
    const { data } = await supabase
      .from("openlu_inscriptions_cours")
      .select("id")
      .eq("cours_id", id)
      .eq("etudiant_id", profil.id)
      .maybeSingle();
    inscrit = Boolean(data);
    if (!inscrit) notFound();
  }

  const [supportsRes, messagesRes, evaluationsRes, notesRes, effectifRes] =
    await Promise.all([
      supabase
        .from("openlu_supports_cours")
        .select("id, titre, type_support, url, description, cree_le")
        .eq("cours_id", id)
        .order("cree_le", { ascending: false }),
      supabase
        .from("openlu_messages_cours")
        .select("id, contenu, cree_le, auteur_id, openlu_profils(prenom, nom)")
        .eq("cours_id", id)
        .order("cree_le", { ascending: false })
        .limit(50),
      supabase
        .from("openlu_evaluations")
        .select("id, titre, type, coefficient, bareme, date_echeance")
        .eq("cours_id", id)
        .order("cree_le", { ascending: true }),
      profil.role === "etudiant"
        ? supabase
            .from("openlu_notes")
            .select("evaluation_id, valeur, appreciation")
            .eq("etudiant_id", profil.id)
        : Promise.resolve({ data: [] as { evaluation_id: string; valeur: number; appreciation: string | null }[] }),
      supabase
        .from("openlu_inscriptions_cours")
        .select("*", { count: "exact", head: true })
        .eq("cours_id", id),
    ]);

  const admin = creerClientAdmin();
  const supports: SupportClasse[] = await Promise.all(
    (supportsRes.data ?? []).map(async (support) => {
      let url = support.url;
      if (url && !/^https?:\/\//i.test(url)) {
        const { data } = await admin.storage
          .from("openlu_supports")
          .createSignedUrl(url, 60 * 60);
        url = data?.signedUrl ?? null;
      }
      return {
        id: support.id,
        titre: support.titre,
        typeSupport: support.type_support,
        url,
        description: support.description,
        creeLe: support.cree_le,
      };
    })
  );

  const messages: MessageClasse[] = (messagesRes.data ?? []).map((message) => ({
    id: message.id,
    contenu: message.contenu,
    creeLe: message.cree_le,
    auteur: message.openlu_profils
      ? `${message.openlu_profils.prenom} ${message.openlu_profils.nom}`.trim()
      : null,
  }));

  const evaluations = evaluationsRes.data ?? [];
  const notesParEvaluation = new Map(
    (notesRes.data ?? []).map((note) => [
      note.evaluation_id,
      { valeur: Number(note.valeur), appreciation: note.appreciation },
    ])
  );
  const notes: NoteClasse[] =
    profil.role === "etudiant"
      ? evaluations.map((evaluation) => {
          const note = notesParEvaluation.get(evaluation.id);
          return {
            evaluationId: evaluation.id,
            titre: evaluation.titre,
            type: evaluation.type,
            coefficient: Number(evaluation.coefficient),
            bareme: Number(evaluation.bareme),
            dateEcheance: evaluation.date_echeance,
            valeur: note ? note.valeur : null,
            appreciation: note ? note.appreciation : null,
          };
        })
      : [];

  const prof = cours.openlu_enseignants?.openlu_profils;

  return (
    <EspaceClasse
      role={profil.role}
      peutGerer={estGestionnaire}
      cours={{
        id: cours.id,
        code: cours.code,
        titre: cours.titre,
        description: cours.description,
        credits: Number(cours.credits),
        semestre: cours.semestre,
        jeton: cours.jeton_inscription,
        inscriptionOuverte: cours.inscription_ouverte,
        enseignantNom: prof ? `${prof.prenom} ${prof.nom}`.trim() : null,
      }}
      supports={supports}
      messages={messages}
      notes={notes}
      effectif={effectifRes.count ?? 0}
      nombreEvaluations={evaluations.length}
    />
  );
}
