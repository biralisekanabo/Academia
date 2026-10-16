"use client";

import { useState } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Champ,
  ChampSelecteur,
} from "@/composants/partages/champ-formulaire";
import { Bouton } from "@/composants/ui/bouton";
import type {
  CompteComptable,
  JournalComptable,
} from "@/types/base";
import type { EcritureVue } from "@/fonctionnalites/comptabilite/types";

const CLASSES = [1, 2, 3, 4, 5, 6, 7, 8];
const TYPES_COMPTE = ["ACTIF", "PASSIF", "CHARGE", "PRODUIT"] as const;
const TYPES_JOURNAL = [
  "CAISSE",
  "BANQUE",
  "ACHATS",
  "VENTES",
  "TRAVAUX",
  "DIVERS",
] as const;

export function FormulaireCompte({
  compte,
  comptes,
  enCours,
  onFermer,
  onSoumettre,
}: {
  compte: CompteComptable | null;
  comptes: CompteComptable[];
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    code: compte?.code ?? "",
    libelle: compte?.libelle ?? "",
    classe: String(compte?.classe ?? 1),
    type_compte: compte?.type_compte ?? "ACTIF",
    compte_parent_id: compte?.compte_parent_id ? String(compte.compte_parent_id) : "",
    est_synthetique: compte?.est_synthetique ?? false,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({
          code: etat.code,
          libelle: etat.libelle,
          classe: Number(etat.classe),
          type_compte: etat.type_compte,
          compte_parent_id: etat.compte_parent_id ? Number(etat.compte_parent_id) : undefined,
          est_synthetique: etat.est_synthetique,
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("comptabilite.code")} value={etat.code} onChange={(e) => setEtat({ ...etat, code: e.target.value })} required />
        <Champ label={t("comptabilite.libelle")} value={etat.libelle} onChange={(e) => setEtat({ ...etat, libelle: e.target.value })} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampSelecteur label={t("comptabilite.classe")} className="w-full" value={etat.classe} onChange={(e) => setEtat({ ...etat, classe: e.target.value })} required>
          {CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </ChampSelecteur>
        <ChampSelecteur label={t("comptabilite.typeCompte")} className="w-full" value={etat.type_compte} onChange={(e) => setEtat({ ...etat, type_compte: e.target.value as typeof etat.type_compte })} required>
          {TYPES_COMPTE.map((ty) => (
            <option key={ty} value={ty}>{t(`comptabilite.typesCompte.${ty}` as never)}</option>
          ))}
        </ChampSelecteur>
      </div>
      <ChampSelecteur label={t("comptabilite.compteParent")} className="w-full" value={etat.compte_parent_id} onChange={(e) => setEtat({ ...etat, compte_parent_id: e.target.value })}>
        <option value="">{t("comptabilite.aucunParent")}</option>
        {comptes
          .filter((c) => c.id !== compte?.id)
          .map((c) => (
            <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>
          ))}
      </ChampSelecteur>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={etat.est_synthetique}
          onChange={(e) => setEtat({ ...etat, est_synthetique: e.target.checked })}
          className="size-4 rounded border"
        />
        {t("comptabilite.estSynthetique")}
      </label>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Bouton type="button" variante="contour" onClick={onFermer}>{t("commun.annuler")}</Bouton>
        <Bouton type="submit" disabled={enCours}>
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("commun.sauvegarder")}
        </Bouton>
      </div>
    </form>
  );
}

export function FormulaireJournal({
  journal,
  enCours,
  onFermer,
  onSoumettre,
}: {
  journal: JournalComptable | null;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    code: journal?.code ?? "",
    nom: journal?.nom ?? "",
    type: (journal?.type as (typeof TYPES_JOURNAL)[number]) ?? "CAISSE",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({ code: etat.code, nom: etat.nom, type: etat.type });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("comptabilite.code")} value={etat.code} onChange={(e) => setEtat({ ...etat, code: e.target.value })} required />
        <Champ label={t("comptabilite.nomJournal")} value={etat.nom} onChange={(e) => setEtat({ ...etat, nom: e.target.value })} required />
      </div>
      <ChampSelecteur label={t("comptabilite.typeJournal")} className="w-full" value={etat.type} onChange={(e) => setEtat({ ...etat, type: e.target.value as (typeof TYPES_JOURNAL)[number] })} required>
        {TYPES_JOURNAL.map((ty) => (
          <option key={ty} value={ty}>{t(`comptabilite.typesJournal.${ty}` as never)}</option>
        ))}
      </ChampSelecteur>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Bouton type="button" variante="contour" onClick={onFermer}>{t("commun.annuler")}</Bouton>
        <Bouton type="submit" disabled={enCours}>
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("commun.sauvegarder")}
        </Bouton>
      </div>
    </form>
  );
}

type LigneEtat = { compte_id: string; debit: string; credit: string; libelle: string };

export function FormulaireEcriture({
  ecriture,
  journaux,
  comptes,
  enCours,
  onFermer,
  onSoumettre,
}: {
  ecriture: EcritureVue | null;
  journaux: JournalComptable[];
  comptes: CompteComptable[];
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    journal_id: String(ecriture?.journal_id ?? journaux[0]?.id ?? ""),
    date_ecriture: ecriture?.date_ecriture ?? new Date().toISOString().slice(0, 10),
    libelle: ecriture?.libelle ?? "",
    piece_reference: ecriture?.piece_reference ?? "",
  });
  const [lignes, setLignes] = useState<LigneEtat[]>(
    ecriture && ecriture.lignes.length > 0
      ? ecriture.lignes.map((l) => ({
          compte_id: String(l.compte_id),
          debit: l.debit ? String(l.debit) : "",
          credit: l.credit ? String(l.credit) : "",
          libelle: l.libelle ?? "",
        }))
      : [
          { compte_id: "", debit: "", credit: "", libelle: "" },
          { compte_id: "", debit: "", credit: "", libelle: "" },
        ]
  );

  const totalDebit = lignes.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lignes.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const equilibre = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.005;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({
          journal_id: Number(etat.journal_id),
          date_ecriture: etat.date_ecriture,
          libelle: etat.libelle,
          piece_reference: etat.piece_reference,
          lignes: lignes
            .filter((l) => l.compte_id)
            .map((l) => ({
              compte_id: Number(l.compte_id),
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
              libelle: l.libelle,
            })),
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampSelecteur label={t("comptabilite.journal")} className="w-full" value={etat.journal_id} onChange={(e) => setEtat({ ...etat, journal_id: e.target.value })} required>
          {journaux.map((j) => (
            <option key={j.id} value={j.id}>{j.code} — {j.nom}</option>
          ))}
        </ChampSelecteur>
        <Champ label={t("comptabilite.date")} type="date" value={etat.date_ecriture} onChange={(e) => setEtat({ ...etat, date_ecriture: e.target.value })} required />
      </div>
      <Champ label={t("comptabilite.libelle")} value={etat.libelle} onChange={(e) => setEtat({ ...etat, libelle: e.target.value })} required />
      <Champ label={t("comptabilite.pieceReference")} value={etat.piece_reference} onChange={(e) => setEtat({ ...etat, piece_reference: e.target.value })} />

      <div className="space-y-2 rounded-xl border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("comptabilite.lignes")}</span>
          <button
            type="button"
            onClick={() => setLignes([...lignes, { compte_id: "", debit: "", credit: "", libelle: "" }])}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-2 hover:underline"
          >
            <Plus className="size-3.5" />
            {t("comptabilite.ajouterLigne")}
          </button>
        </div>
        {lignes.map((ligne, index) => (
          <div key={index} className="grid grid-cols-12 items-center gap-2">
            <select
              className="col-span-5 h-9 rounded-md border bg-background px-2 text-sm"
              value={ligne.compte_id}
              onChange={(e) => setLignes(lignes.map((x, i) => (i === index ? { ...x, compte_id: e.target.value } : x)))}
              required
            >
              <option value="">{t("comptabilite.choisirCompte")}</option>
              {comptes.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.libelle}</option>
              ))}
            </select>
            <input
              className="col-span-2 h-9 rounded-md border bg-background px-2 text-sm"
              type="number" step="0.01" min="0" placeholder={t("comptabilite.debit")}
              value={ligne.debit}
              onChange={(e) => setLignes(lignes.map((x, i) => (i === index ? { ...x, debit: e.target.value, credit: e.target.value ? "" : x.credit } : x)))}
            />
            <input
              className="col-span-2 h-9 rounded-md border bg-background px-2 text-sm"
              type="number" step="0.01" min="0" placeholder={t("comptabilite.credit")}
              value={ligne.credit}
              onChange={(e) => setLignes(lignes.map((x, i) => (i === index ? { ...x, credit: e.target.value, debit: e.target.value ? "" : x.debit } : x)))}
            />
            <input
              className="col-span-2 h-9 rounded-md border bg-background px-2 text-sm"
              placeholder={t("comptabilite.libelleLigne")}
              value={ligne.libelle}
              onChange={(e) => setLignes(lignes.map((x, i) => (i === index ? { ...x, libelle: e.target.value } : x)))}
            />
            <button
              type="button"
              onClick={() => setLignes(lignes.filter((_, i) => i !== index))}
              className="col-span-1 grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("commun.supprimer")}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between border-t pt-2 text-sm">
          <span className={equilibre ? "text-green-600" : "text-destructive"}>
            {equilibre ? t("comptabilite.equilibre") : t("comptabilite.desEquilibre")}
          </span>
          <span className="font-mono">
            {t("comptabilite.debit")} {totalDebit.toFixed(2)} · {t("comptabilite.credit")} {totalCredit.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Bouton type="button" variante="contour" onClick={onFermer}>{t("commun.annuler")}</Bouton>
        <Bouton type="submit" disabled={enCours || !equilibre}>
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("commun.sauvegarder")}
        </Bouton>
      </div>
    </form>
  );
}
