"use client";

import {
  CheckCircle2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Bouton } from "@/composants/ui/bouton";
import { Insigne } from "@/composants/ui/insigne";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import type { CompteComptable, JournalComptable } from "@/types/base";
import type { EcritureVue, LigneBalance } from "@/fonctionnalites/comptabilite/types";

export function OngletComptes({
  comptes,
  enCours,
  onNouveau,
  onEditer,
  onStatut,
  onSupprimer,
}: {
  comptes: CompteComptable[];
  enCours: boolean;
  onNouveau: () => void;
  onEditer: (c: CompteComptable) => void;
  onStatut: (c: CompteComptable) => void;
  onSupprimer: (c: CompteComptable) => void;
}) {
  const t = useTranslations();
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={onNouveau} className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20">
          <Plus />
          {t("comptabilite.nouveauCompte")}
        </Bouton>
      </div>
      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("comptabilite.code")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.libelle")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.classe")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.typeCompte")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {comptes.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t("comptabilite.vides")}
                </TableauCellule>
              </TableauLigne>
            )}
            {comptes.map((c) => (
              <TableauLigne key={c.id}>
                <TableauCellule className="font-mono">{c.code}</TableauCellule>
                <TableauCellule className="font-medium">{c.libelle}</TableauCellule>
                <TableauCellule>{c.classe}</TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {t(`comptabilite.typesCompte.${c.type_compte}` as never)}
                </TableauCellule>
                <TableauCellule>
                  <button disabled={enCours} onClick={() => onStatut(c)}>
                    <Insigne variante={c.statut === "ACTIF" ? "parDefaut" : "secondaire"}>
                      {t(`comptabilite.statuts.${c.statut}` as never)}
                    </Insigne>
                  </button>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEditer(c)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                      aria-label={t("commun.modifier")}
                    >
                      <Pencil />
                    </button>
                    <button
                      disabled={enCours}
                      onClick={() => onSupprimer(c)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4"
                      aria-label={t("commun.supprimer")}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>
    </div>
  );
}

export function OngletJournaux({
  journaux,
  enCours,
  onNouveau,
  onEditer,
  onSupprimer,
}: {
  journaux: JournalComptable[];
  enCours: boolean;
  onNouveau: () => void;
  onEditer: (j: JournalComptable) => void;
  onSupprimer: (j: JournalComptable) => void;
}) {
  const t = useTranslations();
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={onNouveau} className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20">
          <Plus />
          {t("comptabilite.nouveauJournal")}
        </Bouton>
      </div>
      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("comptabilite.code")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.nomJournal")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.typeJournal")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {journaux.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={4} className="py-8 text-center text-muted-foreground">
                  {t("comptabilite.journauxVides")}
                </TableauCellule>
              </TableauLigne>
            )}
            {journaux.map((j) => (
              <TableauLigne key={j.id}>
                <TableauCellule className="font-mono">{j.code}</TableauCellule>
                <TableauCellule className="font-medium">{j.nom}</TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {t(`comptabilite.typesJournal.${j.type}` as never)}
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEditer(j)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                      aria-label={t("commun.modifier")}
                    >
                      <Pencil />
                    </button>
                    <button
                      disabled={enCours}
                      onClick={() => onSupprimer(j)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4"
                      aria-label={t("commun.supprimer")}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>
    </div>
  );
}

export function OngletEcritures({
  ecritures,
  journaux,
  enCours,
  onNouveau,
  onEditer,
  onValider,
  onContrePasser,
}: {
  ecritures: EcritureVue[];
  journaux: JournalComptable[];
  enCours: boolean;
  onNouveau: () => void;
  onEditer: (e: EcritureVue) => void;
  onValider: (e: EcritureVue) => void;
  onContrePasser: (e: EcritureVue) => void;
}) {
  const t = useTranslations();
  const nomsJournaux = new Map(journaux.map((j) => [j.id, j.code]));

  const total = (e: EcritureVue) => e.lignes.reduce((s, l) => s + l.debit, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={onNouveau} className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20">
          <Plus />
          {t("comptabilite.nouvelleEcriture")}
        </Bouton>
      </div>
      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("comptabilite.numero")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.date")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.journal")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.libelle")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.montant")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("comptabilite.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {ecritures.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={7} className="py-8 text-center text-muted-foreground">
                  {t("comptabilite.ecrituresVides")}
                </TableauCellule>
              </TableauLigne>
            )}
            {ecritures.map((e) => (
              <TableauLigne key={e.id}>
                <TableauCellule className="font-mono">{e.numero}</TableauCellule>
                <TableauCellule className="text-muted-foreground">{e.date_ecriture}</TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {nomsJournaux.get(e.journal_id) ?? "—"}
                </TableauCellule>
                <TableauCellule className="font-medium">{e.libelle}</TableauCellule>
                <TableauCellule className="font-mono text-xs">{total(e)}</TableauCellule>
                <TableauCellule>
                  <Insigne
                    variante={
                      e.statut === "VALIDEE"
                        ? "parDefaut"
                        : e.statut === "ANNULEE"
                          ? "destructif"
                          : "contour"
                    }
                  >
                    {t(`comptabilite.statutsEcriture.${e.statut}` as never)}
                  </Insigne>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {e.statut === "BROUILLON" && (
                      <>
                        <button
                          onClick={() => onEditer(e)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                          aria-label={t("commun.modifier")}
                        >
                          <Pencil />
                        </button>
                        <button
                          disabled={enCours}
                          onClick={() => onValider(e)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-green-500/10 hover:text-green-600 [&_svg]:size-4"
                          aria-label={t("comptabilite.valider")}
                        >
                          <CheckCircle2 />
                        </button>
                      </>
                    )}
                    {e.statut === "VALIDEE" && (
                      <button
                        disabled={enCours}
                        onClick={() => onContrePasser(e)}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-600 [&_svg]:size-4"
                        aria-label={t("comptabilite.contrePasser")}
                      >
                        <RotateCcw />
                      </button>
                    )}
                  </div>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>
    </div>
  );
}

export function OngletBalance({ balance }: { balance: LigneBalance[] }) {
  const t = useTranslations();
  const totalDebit = balance.reduce((s, l) => s + l.debit, 0);
  const totalCredit = balance.reduce((s, l) => s + l.credit, 0);

  return (
    <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
      <Tableau>
        <TableauEntete>
          <TableauLigne>
            <TableauEnteteCellule>{t("comptabilite.code")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("comptabilite.libelle")}</TableauEnteteCellule>
            <TableauEnteteCellule className="text-right">{t("comptabilite.debit")}</TableauEnteteCellule>
            <TableauEnteteCellule className="text-right">{t("comptabilite.credit")}</TableauEnteteCellule>
            <TableauEnteteCellule className="text-right">{t("comptabilite.solde")}</TableauEnteteCellule>
          </TableauLigne>
        </TableauEntete>
        <TableauCorps>
          {balance.length === 0 && (
            <TableauLigne>
              <TableauCellule colSpan={5} className="py-8 text-center text-muted-foreground">
                {t("comptabilite.balanceVide")}
              </TableauCellule>
            </TableauLigne>
          )}
          {balance.map((l) => (
            <TableauLigne key={l.compte_id}>
              <TableauCellule className="font-mono">{l.code}</TableauCellule>
              <TableauCellule className="font-medium">{l.libelle}</TableauCellule>
              <TableauCellule className="text-right font-mono">{l.debit.toFixed(2)}</TableauCellule>
              <TableauCellule className="text-right font-mono">{l.credit.toFixed(2)}</TableauCellule>
              <TableauCellule className="text-right font-mono">{l.solde.toFixed(2)}</TableauCellule>
            </TableauLigne>
          ))}
        </TableauCorps>
      </Tableau>
      {balance.length > 0 && (
        <div className="flex items-center justify-end gap-6 border-t px-4 py-3 text-sm font-semibold">
          <span>{t("comptabilite.debit")} : <span className="font-mono">{totalDebit.toFixed(2)}</span></span>
          <span>{t("comptabilite.credit")} : <span className="font-mono">{totalCredit.toFixed(2)}</span></span>
        </div>
      )}
    </div>
  );
}
