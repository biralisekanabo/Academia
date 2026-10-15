"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Layers, Plus, Trash2, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { supprimerCours } from "@/actions/cours";
import type { OptionRecherche } from "@/composants/partages/selecteur-recherche";
import { Bouton } from "@/composants/ui/bouton";
import { Insigne } from "@/composants/ui/insigne";
import { useToast } from "@/composants/ui/toaster";
import { FormulaireCours } from "@/fonctionnalites/cours/formulaire-cours";
import { Link } from "@/i18n/navigation";
import type { TypeRole } from "@/types/database";
import { cn } from "@/utilitaires/cn";

export type CoursItem = {
  id: string;
  code: string;
  titre: string;
  description: string | null;
  credits: number;
  semestre: number;
  enseignantId: string | null;
  enseignantNom: string | null;
};

export function GestionCours({
  role,
  utilisateurId,
  cours,
  enseignants,
}: {
  role: TypeRole;
  utilisateurId: string;
  cours: CoursItem[];
  enseignants: OptionRecherche[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const peutGerer = role === "enseignant" || role === "administrateur";
  const peutAssigner = role === "administrateur";

  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [aSupprimer, setASupprimer] = useState<CoursItem | null>(null);

  const parSemestre = useMemo(() => {
    const groupes = new Map<number, CoursItem[]>();
    for (const c of cours) {
      const liste = groupes.get(c.semestre) ?? [];
      liste.push(c);
      groupes.set(c.semestre, liste);
    }
    return [...groupes.entries()].sort((a, b) => a[0] - b[0]);
  }, [cours]);

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    const { erreur } = await supprimerCours(aSupprimer.id);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), erreur);
      return;
    }
    setASupprimer(null);
    router.refresh();
    toasts.succes(t("cours.suppressionReussie"));
  }

  return (
    <div className="space-y-6">
      {peutGerer && (
        <div className="flex justify-end">
          <Bouton onClick={() => setModaleOuverte(true)}>
            <Plus className="size-4" />
            {t("cours.nouveau")}
          </Bouton>
        </div>
      )}

      {cours.length === 0 ? (
        <div className="carte-vitrine halo-gradiant animate-entree flex flex-col items-center gap-4 rounded-2xl border bg-card py-20 text-center shadow-sm">
          <span className="degrade-brand grid size-14 place-items-center rounded-2xl text-white shadow-md shadow-brand-1/25">
            <BookOpen className="size-7" />
          </span>
          <p className="text-sm text-muted-foreground">{t("cours.aucun")}</p>
        </div>
      ) : (
        parSemestre.map(([semestre, liste]) => (
          <section key={semestre} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Layers className="size-4" />
              {t("cours.semestreNumero", { numero: semestre })}
              <Insigne variante="secondaire">{liste.length}</Insigne>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {liste.map((c) => {
                const proprietaire = c.enseignantId === utilisateurId;
                return (
                  <article
                    key={c.id}
                    className="carte-vitrine balayage-survol animate-entree group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-1/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="degrade-brand degrade-anime grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-md shadow-brand-1/25">
                        <BookOpen className="size-5" />
                      </span>
                      <div className="flex items-center gap-2">
                        {proprietaire && (
                          <Insigne variante="contour" className="text-[10px]">
                            {t("cours.monCours")}
                          </Insigne>
                        )}
                        <Insigne variante="secondaire" className="font-mono text-[11px]">
                          {c.code}
                        </Insigne>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/cours/${c.id}`}
                        className="block truncate font-semibold transition-colors hover:text-brand-2"
                      >
                        {c.titre}
                      </Link>
                      {c.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {c.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 truncate">
                        <User className="size-3.5 shrink-0" />
                        <span className="truncate">{c.enseignantNom ?? t("cours.sansEnseignant")}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span>{t("cours.creditsCourt", { valeur: c.credits })}</span>
                        {peutGerer && (peutAssigner || proprietaire) && (
                          <button
                            type="button"
                            onClick={() => setASupprimer(c)}
                            className={cn(
                              "grid size-7 place-items-center rounded-lg text-muted-foreground opacity-0 transition-all",
                              "hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            )}
                            aria-label={t("commun.supprimer")}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </span>
                    </div>
                    <Link
                      href={`/cours/${c.id}`}
                      className="lien-anime inline-flex w-fit items-center gap-1.5 text-xs font-medium"
                    >
                      {t("cours.ouvrirClasse")}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      <FormulaireCours
        ouvert={modaleOuverte}
        onFermer={() => setModaleOuverte(false)}
        peutAssigner={peutAssigner}
        enseignants={enseignants}
      />

      <ModalSuppressionCours
        cours={aSupprimer}
        onFermer={() => setASupprimer(null)}
        onConfirmer={confirmerSuppression}
      />
    </div>
  );
}

function ModalSuppressionCours({
  cours,
  onFermer,
  onConfirmer,
}: {
  cours: CoursItem | null;
  onFermer: () => void;
  onConfirmer: () => void;
}) {
  const t = useTranslations();
  if (!cours) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="animate-fondu fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onFermer}
        aria-hidden
      />
      <div className="animate-apparition relative z-10 w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <h2 className="text-lg font-semibold">{t("cours.supprimerCours")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("cours.aideSupprimerCours")}</p>
        <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium">{cours.titre}</p>
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
