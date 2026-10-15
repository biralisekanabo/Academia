"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { supprimerEvaluation, saisirNotes } from "@/actions/notes";
import { Bouton } from "@/composants/ui/bouton";
import { Insigne } from "@/composants/ui/insigne";
import { Saisie } from "@/composants/ui/saisie";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import { useToast } from "@/composants/ui/toaster";
import { FormulaireEvaluation } from "@/fonctionnalites/notes/formulaire-evaluation";
import { GestionEtudiantsCours } from "@/fonctionnalites/notes/gestion-etudiants-cours";
import type { TypeEvaluation, TypeRole } from "@/types/database";
import { cn } from "@/utilitaires/cn";
import { formatDateLongue } from "@/utilitaires/format";

export type CoursNote = {
  id: string;
  code: string;
  titre: string;
  credits: number;
  semestre: number;
  enseignantId: string | null;
  enseignantNom: string | null;
};

export type EvaluationNote = {
  id: string;
  coursId: string;
  titre: string;
  type: TypeEvaluation;
  coefficient: number;
  bareme: number;
  dateEcheance: string | null;
};

export type NoteLigne = {
  id: string;
  evaluationId: string;
  etudiantId: string;
  valeur: number;
  appreciation: string | null;
};

export type InscriptionNote = {
  coursId: string;
  etudiantId: string;
  prenom: string;
  nom: string;
  matricule: string | null;
};

export type EtudiantDisponible = {
  id: string;
  prenom: string;
  nom: string;
  matricule: string | null;
};

export function EspaceNotes({
  role,
  utilisateurId,
  cours,
  evaluations,
  notes,
  inscriptions,
  etudiantsDisponibles,
}: {
  role: TypeRole;
  utilisateurId: string;
  cours: CoursNote[];
  evaluations: EvaluationNote[];
  notes: NoteLigne[];
  inscriptions: InscriptionNote[];
  etudiantsDisponibles: EtudiantDisponible[];
}) {
  if (role === "etudiant") {
    return <VueEtudiant evaluations={evaluations} notes={notes} cours={cours} />;
  }
  return (
    <VueGestion
      role={role}
      utilisateurId={utilisateurId}
      cours={cours}
      evaluations={evaluations}
      notes={notes}
      inscriptions={inscriptions}
      etudiantsDisponibles={etudiantsDisponibles}
    />
  );
}

function VueGestion({
  role,
  utilisateurId,
  cours,
  evaluations,
  notes,
  inscriptions,
  etudiantsDisponibles,
}: {
  role: TypeRole;
  utilisateurId: string;
  cours: CoursNote[];
  evaluations: EvaluationNote[];
  notes: NoteLigne[];
  inscriptions: InscriptionNote[];
  etudiantsDisponibles: EtudiantDisponible[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const coursAccessibles = useMemo(
    () =>
      role === "enseignant"
        ? cours.filter((c) => c.enseignantId === utilisateurId)
        : cours,
    [cours, role, utilisateurId]
  );

  const [coursId, setCoursId] = useState<string>(coursAccessibles[0]?.id ?? "");
  const [evaluationId, setEvaluationId] = useState<string>("");
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [gestionEtudiantsOuverte, setGestionEtudiantsOuverte] = useState(false);
  const [aSupprimer, setASupprimer] = useState<EvaluationNote | null>(null);

  const coursActuel = coursAccessibles.find((c) => c.id === coursId) ?? null;
  const evaluationsCours = evaluations.filter((e) => e.coursId === coursId);
  const evaluationActive =
    evaluationsCours.find((e) => e.id === evaluationId) ?? evaluationsCours[0] ?? null;
  const etudiantsCours = inscriptions.filter((i) => i.coursId === coursId);

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    const { erreur } = await supprimerEvaluation(aSupprimer.id);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), erreur);
      return;
    }
    setASupprimer(null);
    if (evaluationActive?.id === aSupprimer.id) setEvaluationId("");
    router.refresh();
    toasts.succes(t("notes.evaluationSupprimee"));
  }

  if (coursAccessibles.length === 0) {
    return (
      <Vide icone={BookOpen} titre={t("notes.aucunCours")}>
        {role === "enseignant" ? t("notes.aucunCoursEnseignant") : t("notes.aucunCours")}
      </Vide>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* Colonne cours */}
        <aside className="carte-vitrine flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm">
          <p className="px-2 pt-1 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {role === "enseignant" ? t("notes.mesCours") : t("cours.titre")}
          </p>
          <div className="flex max-h-[26rem] flex-col gap-1.5 overflow-y-auto">
            {coursAccessibles.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCoursId(c.id);
                  setEvaluationId("");
                }}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left transition-all duration-200",
                  c.id === coursId
                    ? "border-brand-2/40 bg-brand-1/5 shadow-sm"
                    : "border-transparent hover:bg-accent"
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{c.titre}</span>
                  <Insigne variante={c.id === coursId ? "parDefaut" : "secondaire"} className="font-mono text-[10px]">
                    {c.code}
                  </Insigne>
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {c.enseignantNom ?? t("cours.sansEnseignant")} · S{c.semestre}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Panneau évaluations + saisie */}
        <section className="space-y-4">
          <div className="carte-vitrine rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{coursActuel?.titre ?? "—"}</h2>
                <p className="text-xs text-muted-foreground">
                  {t("notes.etudiantsInscrits", { nombre: etudiantsCours.length })}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Bouton
                  taille="sm"
                  variante="contour"
                  onClick={() => setGestionEtudiantsOuverte(true)}
                >
                  <Users className="size-4" />
                  {t("notes.gererEtudiants")}
                </Bouton>
                <Bouton taille="sm" onClick={() => setModaleOuverte(true)}>
                  <Plus className="size-4" />
                  {t("notes.nouvelleEvaluation")}
                </Bouton>
              </div>
            </div>

            {evaluationsCours.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("notes.aucuneEvaluation")}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {evaluationsCours.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEvaluationId(e.id)}
                    className={cn(
                      "group flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all duration-200",
                      e.id === evaluationActive?.id
                        ? "border-brand-2/40 bg-brand-1/5 text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <ClipboardCheck className="size-4" />
                    <span className="font-medium">{e.titre}</span>
                    <Insigne variante="secondaire" className="text-[10px]">
                      /{e.bareme}
                    </Insigne>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setASupprimer(e);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          ev.stopPropagation();
                          setASupprimer(e);
                        }
                      }}
                      className="grid size-5 place-items-center rounded text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {evaluationActive && etudiantsCours.length > 0 && (
            <GrilleNotes
              key={evaluationActive.id}
              evaluation={evaluationActive}
              etudiants={etudiantsCours}
              notesExistantes={notes.filter((n) => n.evaluationId === evaluationActive.id)}
            />
          )}

          {evaluationActive && etudiantsCours.length === 0 && (
            <p className="carte-vitrine rounded-2xl border bg-card py-10 text-center text-sm text-muted-foreground shadow-sm">
              {t("notes.aucunEtudiant")}
            </p>
          )}
        </section>
      </div>

      <FormulaireEvaluation
        ouvert={modaleOuverte}
        onFermer={() => setModaleOuverte(false)}
        coursId={coursId}
      />

      {coursActuel && (
        <GestionEtudiantsCours
          ouvert={gestionEtudiantsOuverte}
          onFermer={() => setGestionEtudiantsOuverte(false)}
          coursId={coursId}
          coursTitre={coursActuel.titre}
          inscrits={etudiantsCours}
          disponibles={etudiantsDisponibles}
        />
      )}

      <ModalSuppression
        evaluation={aSupprimer}
        onFermer={() => setASupprimer(null)}
        onConfirmer={confirmerSuppression}
      />
    </div>
  );
}

function GrilleNotes({
  evaluation,
  etudiants,
  notesExistantes,
}: {
  evaluation: EvaluationNote;
  etudiants: InscriptionNote[];
  notesExistantes: NoteLigne[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();
  const [envoi, setEnvoi] = useState(false);

  const [valeurs, setValeurs] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const etudiant of etudiants) {
      const existante = notesExistantes.find((n) => n.etudiantId === etudiant.etudiantId);
      base[etudiant.etudiantId] = existante ? String(existante.valeur) : "";
    }
    return base;
  });

  async function publier() {
    setEnvoi(true);
    const notes = etudiants
      .map((etudiant) => ({
        etudiantId: etudiant.etudiantId,
        valeur: Number(valeurs[etudiant.etudiantId]),
      }))
      .filter((note) => valeurs[note.etudiantId] !== "" && Number.isFinite(note.valeur));

    const { erreur } = await saisirNotes({ evaluationId: evaluation.id, notes });
    setEnvoi(false);

    if (erreur) {
      toasts.erreur(t("toasts.erreur"), erreur);
      return;
    }
    router.refresh();
    toasts.succes(t("notes.notesPubliees"), t("notes.notesPublieesDesc"));
  }

  return (
    <div className="carte-vitrine overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{evaluation.titre}</h3>
          <p className="text-xs text-muted-foreground">
            {t(`notes.types.${evaluation.type}` as never)} · {t("notes.coefficientCourt", { valeur: evaluation.coefficient })} ·{" "}
            {t("notes.sur")} {evaluation.bareme}
          </p>
        </div>
        <Bouton taille="sm" onClick={publier} disabled={envoi}>
          <Save className="size-4" />
          {envoi ? t("commun.chargement") : t("notes.enregistrerNotes")}
        </Bouton>
      </div>
      <Tableau>
        <TableauEntete>
          <tr className="bg-muted/40">
            <TableauEnteteCellule>{t("finances.etudiant")}</TableauEnteteCellule>
            <TableauEnteteCellule className="w-24 sm:w-32">
              {t("notes.note")} / {evaluation.bareme}
            </TableauEnteteCellule>
            <TableauEnteteCellule>{t("notes.appreciation")}</TableauEnteteCellule>
          </tr>
        </TableauEntete>
        <TableauCorps>
          {etudiants.map((etudiant) => (
            <TableauLigne key={etudiant.etudiantId}>
              <TableauCellule>
                <span className="font-medium">
                  {etudiant.prenom} {etudiant.nom}
                </span>
                {etudiant.matricule && (
                  <span className="block font-mono text-xs text-muted-foreground">
                    {etudiant.matricule}
                  </span>
                )}
              </TableauCellule>
              <TableauCellule>
                <Saisie
                  type="number"
                  min={0}
                  max={evaluation.bareme}
                  step="any"
                  value={valeurs[etudiant.etudiantId] ?? ""}
                  onChange={(e) =>
                    setValeurs((prev) => ({
                      ...prev,
                      [etudiant.etudiantId]: e.target.value,
                    }))
                  }
                  className="h-8"
                  placeholder="—"
                />
              </TableauCellule>
              <TableauCellule className="text-muted-foreground">
                {t("notes.appreciationAuto")}
              </TableauCellule>
            </TableauLigne>
          ))}
        </TableauCorps>
      </Tableau>
    </div>
  );
}

function VueEtudiant({
  evaluations,
  notes,
  cours,
}: {
  evaluations: EvaluationNote[];
  notes: NoteLigne[];
  cours: CoursNote[];
}) {
  const t = useTranslations();
  const locale = useLocale();

  const coursParId = useMemo(() => new Map(cours.map((c) => [c.id, c])), [cours]);
  const evaluationParId = useMemo(
    () => new Map(evaluations.map((e) => [e.id, e])),
    [evaluations]
  );

  const groupes = useMemo(() => {
    const table = new Map<
      string,
      {
        coursId: string;
        cours: CoursNote | undefined;
        lignes: { evaluation: EvaluationNote; note: NoteLigne }[];
      }
    >();
    for (const note of notes) {
      const evaluation = evaluationParId.get(note.evaluationId);
      if (!evaluation) continue;
      const coursId = evaluation.coursId;
      const entree = table.get(coursId) ?? {
        coursId,
        cours: coursParId.get(coursId),
        lignes: [],
      };
      entree.lignes.push({ evaluation, note });
      table.set(coursId, entree);
    }
    return [...table.values()];
  }, [notes, evaluationParId, coursParId]);

  function moyenne(lignes: { evaluation: EvaluationNote; note: NoteLigne }[]) {
    let somme = 0;
    let coeffs = 0;
    for (const { evaluation, note } of lignes) {
      const normalise = (note.valeur / evaluation.bareme) * 20;
      somme += normalise * evaluation.coefficient;
      coeffs += evaluation.coefficient;
    }
    return coeffs > 0 ? somme / coeffs : 0;
  }

  if (groupes.length === 0) {
    return <Vide icone={GraduationCap} titre={t("notes.aucuneNote")} />;
  }

  return (
    <div className="space-y-5">
      {groupes.map(({ coursId, cours: c, lignes }) => {
        const moy = moyenne(lignes);
        return (
          <section
            key={coursId}
            className="carte-vitrine animate-entree overflow-hidden rounded-2xl border bg-card shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="degrade-brand grid size-9 place-items-center rounded-xl text-white shadow-md shadow-brand-1/25">
                  <ClipboardList className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{c?.titre ?? "—"}</h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {c?.code} · S{c?.semestre}
                  </p>
                </div>
              </div>
              <Insigne
                variante="contour"
                className={cn(
                  "text-sm",
                  moy >= 10
                    ? "border-emerald-600/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-rose-600/25 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}
              >
                {t("notes.moyenne")} : {moy.toFixed(2)}/20
              </Insigne>
            </div>
            <Tableau>
              <TableauEntete>
                <tr className="bg-muted/40">
                  <TableauEnteteCellule>{t("notes.evaluation")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("notes.type")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("notes.dateEcheance")}</TableauEnteteCellule>
                  <TableauEnteteCellule className="text-right">{t("notes.note")}</TableauEnteteCellule>
                </tr>
              </TableauEntete>
              <TableauCorps>
                {lignes.map(({ evaluation, note }) => (
                  <TableauLigne key={note.id}>
                    <TableauCellule className="font-medium">{evaluation.titre}</TableauCellule>
                    <TableauCellule>
                      <Insigne variante="secondaire">
                        {t(`notes.types.${evaluation.type}` as never)}
                      </Insigne>
                    </TableauCellule>
                    <TableauCellule className="text-muted-foreground">
                      {formatDateLongue(evaluation.dateEcheance, locale)}
                    </TableauCellule>
                    <TableauCellule className="text-right font-semibold tabular-nums">
                      {note.valeur}/{evaluation.bareme}
                    </TableauCellule>
                  </TableauLigne>
                ))}
              </TableauCorps>
            </Tableau>
          </section>
        );
      })}
    </div>
  );
}

function ModalSuppression({
  evaluation,
  onFermer,
  onConfirmer,
}: {
  evaluation: EvaluationNote | null;
  onFermer: () => void;
  onConfirmer: () => void;
}) {
  const t = useTranslations();
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        evaluation ? "" : "hidden"
      )}
    >
      <div className="animate-fondu fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onFermer} aria-hidden />
      <div className="animate-apparition relative z-10 w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">{t("notes.supprimerEvaluation")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("notes.aideSupprimerEvaluation")}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Bouton type="button" variante="fantome" onClick={onFermer}>
            {t("commun.annuler")}
          </Bouton>
          <Bouton type="button" variante="destructif" onClick={onConfirmer}>
            {t("commun.supprimer")}
          </Bouton>
        </div>
      </div>
    </div>
  );
}

function Vide({
  icone: Icone,
  titre,
  children,
}: {
  icone: typeof BookOpen;
  titre: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="carte-vitrine balayage-survol animate-entree grid place-items-center rounded-2xl border bg-card py-16 text-center shadow-sm">
      <div className="degrade-brand degrade-anime icone-flottante mx-auto mb-4 grid size-14 place-items-center rounded-2xl text-white shadow-lg shadow-brand-1/20">
        <Icone className="size-7" />
      </div>
      <p className="text-sm font-medium text-foreground">{titre}</p>
      {children && <p className="mt-1 text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}
