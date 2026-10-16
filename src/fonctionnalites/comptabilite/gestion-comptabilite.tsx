"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  FileSpreadsheet,
  Landmark,
  ListTree,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  contrePasserEcriture,
  creerCompte,
  creerEcriture,
  creerJournal,
  definirStatutCompte,
  modifierCompte,
  modifierEcriture,
  modifierJournal,
  supprimerCompte,
  supprimerJournal,
  validerEcriture,
} from "@/actions/comptabilite";
import { Modale } from "@/composants/partages/modale";
import { useToast } from "@/composants/ui/toaster";
import { cn } from "@/utilitaires/cn";
import {
  FormulaireCompte,
  FormulaireEcriture,
  FormulaireJournal,
} from "@/fonctionnalites/comptabilite/formulaires-comptabilite";
import {
  OngletBalance,
  OngletComptes,
  OngletEcritures,
  OngletJournaux,
} from "@/fonctionnalites/comptabilite/onglets-comptabilite";
import type {
  EcritureVue,
  LigneBalance,
} from "@/fonctionnalites/comptabilite/types";
import type {
  CompteComptable,
  JournalComptable,
} from "@/types/base";

type Onglet = "comptes" | "journaux" | "ecritures" | "balance";

export function GestionComptabilite({
  comptes,
  journaux,
  ecritures,
  balance,
}: {
  comptes: CompteComptable[];
  journaux: JournalComptable[];
  ecritures: EcritureVue[];
  balance: LigneBalance[];
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [onglet, setOnglet] = useState<Onglet>("comptes");
  const [formCompte, setFormCompte] = useState<CompteComptable | null | undefined>(undefined);
  const [formJournal, setFormJournal] = useState<JournalComptable | null | undefined>(undefined);
  const [formEcriture, setFormEcriture] = useState<EcritureVue | null | undefined>(undefined);

  const onglets = [
    { cle: "comptes" as const, libelle: t("comptabilite.onglets.comptes"), icone: ListTree, compte: comptes.length },
    { cle: "journaux" as const, libelle: t("comptabilite.onglets.journaux"), icone: BookOpen, compte: journaux.length },
    { cle: "ecritures" as const, libelle: t("comptabilite.onglets.ecritures"), icone: Landmark, compte: ecritures.length },
    { cle: "balance" as const, libelle: t("comptabilite.onglets.balance"), icone: FileSpreadsheet, compte: balance.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {onglets.map(({ cle, libelle, icone: Icone, compte }) => (
          <button
            key={cle}
            onClick={() => setOnglet(cle)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              onglet === cle
                ? "degrade-brand border-0 text-white shadow-md shadow-brand-1/25"
                : "hover:bg-accent"
            )}
          >
            <Icone className="size-4" />
            {libelle}
            <span className={cn("rounded-full px-2 py-0.5 text-xs", onglet === cle ? "bg-white/20" : "bg-muted")}>
              {compte}
            </span>
          </button>
        ))}
      </div>

      {onglet === "comptes" && (
        <OngletComptes
          comptes={comptes}
          enCours={enCours}
          onNouveau={() => setFormCompte(null)}
          onEditer={(c) => setFormCompte(c)}
          onStatut={(c) =>
            demarrer(async () => {
              const r = await definirStatutCompte(c.id, c.statut === "ACTIF" ? "INACTIF" : "ACTIF");
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("comptabilite.statutMaj"));
            })
          }
          onSupprimer={(c) => {
            if (!window.confirm(t("comptabilite.confirmerSuppression", { code: c.code }))) return;
            demarrer(async () => {
              const r = await supprimerCompte(c.id);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("comptabilite.supprime"));
            });
          }}
        />
      )}

      {onglet === "journaux" && (
        <OngletJournaux
          journaux={journaux}
          enCours={enCours}
          onNouveau={() => setFormJournal(null)}
          onEditer={(j) => setFormJournal(j)}
          onSupprimer={(j) => {
            if (!window.confirm(t("comptabilite.confirmerSuppression", { code: j.code }))) return;
            demarrer(async () => {
              const r = await supprimerJournal(j.id);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("comptabilite.supprime"));
            });
          }}
        />
      )}

      {onglet === "ecritures" && (
        <OngletEcritures
          ecritures={ecritures}
          journaux={journaux}
          enCours={enCours}
          onNouveau={() => setFormEcriture(null)}
          onEditer={(e) => setFormEcriture(e)}
          onValider={(e) =>
            demarrer(async () => {
              const r = await validerEcriture(e.id);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("comptabilite.ecritureValidee"));
            })
          }
          onContrePasser={(e) => {
            if (!window.confirm(t("comptabilite.confirmerContrePassation"))) return;
            demarrer(async () => {
              const r = await contrePasserEcriture(e.id);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("comptabilite.contrePassee"));
            });
          }}
        />
      )}

      {onglet === "balance" && <OngletBalance balance={balance} />}

      {formCompte !== undefined && (
        <Modale
          ouvert
          titre={formCompte ? t("comptabilite.modifierCompte") : t("comptabilite.nouveauCompte")}
          onFermer={() => setFormCompte(undefined)}
        >
          <FormulaireCompte
            compte={formCompte}
            comptes={comptes}
            enCours={enCours}
            onFermer={() => setFormCompte(undefined)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = formCompte
                  ? await modifierCompte({ id: formCompte.id, ...d })
                  : await creerCompte(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("comptabilite.enregistre"));
                setFormCompte(undefined);
              })
            }
          />
        </Modale>
      )}

      {formJournal !== undefined && (
        <Modale
          ouvert
          titre={formJournal ? t("comptabilite.modifierJournal") : t("comptabilite.nouveauJournal")}
          onFermer={() => setFormJournal(undefined)}
        >
          <FormulaireJournal
            journal={formJournal}
            enCours={enCours}
            onFermer={() => setFormJournal(undefined)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = formJournal
                  ? await modifierJournal({ id: formJournal.id, ...d })
                  : await creerJournal(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("comptabilite.enregistre"));
                setFormJournal(undefined);
              })
            }
          />
        </Modale>
      )}

      {formEcriture !== undefined && (
        <Modale
          ouvert
          titre={formEcriture ? t("comptabilite.modifierEcriture") : t("comptabilite.nouvelleEcriture")}
          onFermer={() => setFormEcriture(undefined)}
        >
          <FormulaireEcriture
            ecriture={formEcriture}
            journaux={journaux}
            comptes={comptes}
            enCours={enCours}
            onFermer={() => setFormEcriture(undefined)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = formEcriture
                  ? await modifierEcriture({ id: formEcriture.id, ...d })
                  : await creerEcriture(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("comptabilite.enregistre"));
                setFormEcriture(undefined);
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}
