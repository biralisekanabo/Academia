"use client";

import { useState } from "react";
import { Landmark, Printer, ReceiptText, Wallet, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";

import { FormulaireFrais } from "@/fonctionnalites/finances/formulaire-frais";
import { FormulairePaiement } from "@/fonctionnalites/finances/formulaire-paiement";
import { FormulaireSalaire } from "@/fonctionnalites/finances/formulaire-salaire";
import type { OptionRecherche } from "@/composants/partages/selecteur-recherche";
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
import { Link } from "@/i18n/navigation";
import type { TypeMethodePaiement, TypeRole, TypeStatutPaiement as StatutPaiement } from "@/types/database";
import { cn } from "@/utilitaires/cn";
import { formatDateLongue, formatMontant } from "@/utilitaires/format";

export type OngletFinance = "frais" | "paiements" | "salaires";

export type FraisLigne = {
  id: string;
  libelle: string;
  niveau: string;
  montant: number;
  devise: string;
  annee_universitaire: string;
  openlu_filieres: { nom: string; openlu_facultes: { code: string } | null } | null;
  openlu_facultes: { code: string } | null;
};

export type PaiementLigne = {
  id: string;
  reference: string;
  libelle: string | null;
  montant: number;
  methode: TypeMethodePaiement;
  statut: StatutPaiement;
  date_paiement: string;
  openlu_profils: { prenom: string; nom: string } | null;
};

export type SalaireLigne = {
  id: string;
  reference: string;
  montant: number;
  mois: string;
  statut: StatutPaiement;
  openlu_profils: { prenom: string; nom: string } | null;
};

const ONGLETS: { cle: OngletFinance; icone: LucideIcon; titre: string }[] = [
  { cle: "frais", icone: ReceiptText, titre: "finances.frais" },
  { cle: "paiements", icone: Wallet, titre: "finances.paiements" },
  { cle: "salaires", icone: Landmark, titre: "finances.salaires" },
];

function varianteStatut(statut: StatutPaiement): string {
  switch (statut) {
    case "valide":
      return "text-emerald-600 border-emerald-600/25 bg-emerald-500/10 dark:text-emerald-400";
    case "en_attente":
      return "text-amber-600 border-amber-600/25 bg-amber-500/10 dark:text-amber-400";
    case "echoue":
      return "text-rose-600 border-rose-600/25 bg-rose-500/10 dark:text-rose-400";
    case "rembourse":
      return "text-sky-600 border-sky-600/25 bg-sky-500/10 dark:text-sky-400";
  }
}

export function EspaceFinances({
  onglet,
  locale,
  role,
  frais,
  paiements,
  salaires,
  facultes,
  filieres,
  etudiants,
  enseignants,
}: {
  onglet: OngletFinance;
  locale: string;
  role: TypeRole;
  frais: FraisLigne[];
  paiements: PaiementLigne[];
  salaires: SalaireLigne[];
  facultes: OptionRecherche[];
  filieres: OptionRecherche[];
  etudiants: OptionRecherche[];
  enseignants: OptionRecherche[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [modale, setModale] = useState<OngletFinance | null>(null);

  const estFinance = role === "finance";
  const peutFrais = estFinance;
  const peutSalaire = estFinance;
  const peutPaiement = estFinance;

  const iconesParOnglet: Record<OngletFinance, { titre: string; ouvre: () => void; visibles: boolean }> = {
    frais: { titre: t("finances.nouveauFrais"), ouvre: () => setModale("frais"), visibles: peutFrais },
    paiements: { titre: t("finances.nouveauPaiement"), ouvre: () => setModale("paiements"), visibles: peutPaiement },
    salaires: { titre: t("finances.nouveauSalaire"), ouvre: () => setModale("salaires"), visibles: peutSalaire },
  };

  return (
    <div className="space-y-6">
      {/* Onglets */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full overflow-x-auto rounded-xl border bg-card p-1 shadow-sm sm:w-auto">
          {ONGLETS.map(({ cle, icone: Icone, titre }) => (
            <button
              key={cle}
              type="button"
              onClick={() =>
                router.replace(onglet === cle ? "/finances" : { pathname: "/finances", query: { onglet: cle } })
              }
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200 sm:flex-none sm:px-4",
                onglet === cle
                  ? "degrade-brand text-white shadow-md shadow-brand-1/25"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icone className="size-4 shrink-0" />
              {t(titre as never)}
            </button>
          ))}
        </div>

        {iconesParOnglet[onglet].visibles && (
          <Bouton
            type="button"
            className="w-full sm:w-auto"
            onClick={iconesParOnglet[onglet].ouvre}
          >
            {iconesParOnglet[onglet].titre}
          </Bouton>
        )}
      </div>

      {onglet === "frais" && (
        <SectionFrais frais={frais} locale={locale} />
      )}
      {onglet === "paiements" && (
        <SectionPaiements paiements={paiements} locale={locale} />
      )}
      {onglet === "salaires" && (
        <SectionSalaires salaires={salaires} locale={locale} />
      )}

      <FormulaireFrais
        ouvert={modale === "frais"}
        onFermer={() => setModale(null)}
        facultes={facultes}
        filieres={filieres}
      />
      <FormulairePaiement
        ouvert={modale === "paiements"}
        onFermer={() => setModale(null)}
        etudiants={etudiants}
      />
      <FormulaireSalaire
        ouvert={modale === "salaires"}
        onFermer={() => setModale(null)}
        enseignants={enseignants}
      />
    </div>
  );
}

function SectionFrais({ frais, locale }: { frais: FraisLigne[]; locale: string }) {
  const t = useTranslations();
  if (frais.length === 0) {
    return <Vide icone={ReceiptText}>{t("finances.aucun")}</Vide>;
  }
  return (
    <div className="carte-vitrine overflow-hidden rounded-2xl border bg-card shadow-sm">
      <Tableau>
        <TableauEntete>
          <tr className="bg-muted/40">
            <TableauEnteteCellule>{t("finances.libelle")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.filiere")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.niveau")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.anneeUniversitaire")}</TableauEnteteCellule>
            <TableauEnteteCellule className="text-right">{t("finances.montant")}</TableauEnteteCellule>
          </tr>
        </TableauEntete>
        <TableauCorps>
          {frais.map((f, index) => (
            <TableauLigne
              key={f.id}
              className="ligne-animee animate-entree"
              style={{ ["--delai" as string]: `${Math.min(index, 12) * 35}ms` }}
            >
              <TableauCellule className="font-medium">{f.libelle}</TableauCellule>
              <TableauCellule>
                {f.openlu_filieres?.nom ?? f.openlu_facultes?.code ?? "—"}
                {f.openlu_filieres?.openlu_facultes?.code && (
                  <span className="text-xs text-muted-foreground">
                    {" · "}
                    {f.openlu_filieres.openlu_facultes.code}
                  </span>
                )}
              </TableauCellule>
              <TableauCellule>
                <Insigne variante="secondaire">{f.niveau}</Insigne>
              </TableauCellule>
              <TableauCellule className="text-muted-foreground">
                {f.annee_universitaire}
              </TableauCellule>
              <TableauCellule className="text-right font-semibold tabular-nums">
                {formatMontant(Number(f.montant), locale, f.devise)}
              </TableauCellule>
            </TableauLigne>
          ))}
        </TableauCorps>
      </Tableau>
    </div>
  );
}

function SectionPaiements({
  paiements,
  locale,
}: {
  paiements: PaiementLigne[];
  locale: string;
}) {
  const t = useTranslations();
  if (paiements.length === 0) {
    return <Vide icone={Wallet}>{t("finances.aucun")}</Vide>;
  }
  return (
    <div className="carte-vitrine overflow-hidden rounded-2xl border bg-card shadow-sm">
      <Tableau>
        <TableauEntete>
          <tr className="bg-muted/40">
            <TableauEnteteCellule>{t("finances.reference")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.etudiant")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.libelle")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.statut")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.date")}</TableauEnteteCellule>
            <TableauEnteteCellule className="text-right">{t("finances.montant")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("commun.actions")}</TableauEnteteCellule>
          </tr>
        </TableauEntete>
        <TableauCorps>
          {paiements.map((p, index) => (
            <TableauLigne
              key={p.id}
              className="ligne-animee animate-entree"
              style={{ ["--delai" as string]: `${Math.min(index, 12) * 35}ms` }}
            >
              <TableauCellule className="font-mono text-xs text-muted-foreground">
                {p.reference}
              </TableauCellule>
              <TableauCellule className="font-medium">
                {p.openlu_profils?.prenom} {p.openlu_profils?.nom}
              </TableauCellule>
              <TableauCellule className="text-muted-foreground">
                {p.libelle ?? "—"}
              </TableauCellule>
              <TableauCellule>
                <Insigne variante="contour" className={varianteStatut(p.statut)}>
                  {t(`finances.statuts.${p.statut}` as never)}
                </Insigne>
              </TableauCellule>
              <TableauCellule className="text-muted-foreground">
                {formatDateLongue(p.date_paiement, locale)}
              </TableauCellule>
              <TableauCellule className="text-right font-semibold tabular-nums">
                {formatMontant(Number(p.montant), locale)}
              </TableauCellule>
              <TableauCellule>
                <Link
                  href={`/finances/recu?id=${p.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-2/30 px-2.5 py-1 text-xs font-medium text-brand-2 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-1/10 hover:shadow-md hover:shadow-brand-1/20"
                >
                  <Printer className="size-3.5" />
                  {t("finances.recu")}
                </Link>
              </TableauCellule>
            </TableauLigne>
          ))}
        </TableauCorps>
      </Tableau>
    </div>
  );
}

function SectionSalaires({
  salaires,
  locale,
}: {
  salaires: SalaireLigne[];
  locale: string;
}) {
  const t = useTranslations();
  if (salaires.length === 0) {
    return <Vide icone={Landmark}>{t("finances.aucun")}</Vide>;
  }
  return (
    <div className="carte-vitrine overflow-hidden rounded-2xl border bg-card shadow-sm">
      <Tableau>
        <TableauEntete>
          <tr className="bg-muted/40">
            <TableauEnteteCellule>{t("finances.reference")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.enseignant")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.mois")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("finances.statut")}</TableauEnteteCellule>
            <TableauEnteteCellule className="text-right">{t("finances.montant")}</TableauEnteteCellule>
          </tr>
        </TableauEntete>
        <TableauCorps>
          {salaires.map((s, index) => (
            <TableauLigne
              key={s.id}
              className="ligne-animee animate-entree"
              style={{ ["--delai" as string]: `${Math.min(index, 12) * 35}ms` }}
            >
              <TableauCellule className="font-mono text-xs text-muted-foreground">
                {s.reference}
              </TableauCellule>
              <TableauCellule className="font-medium">
                {s.openlu_profils?.prenom} {s.openlu_profils?.nom}
              </TableauCellule>
              <TableauCellule className="text-muted-foreground">
                {formatDateLongue(s.mois, locale)}
              </TableauCellule>
              <TableauCellule>
                <Insigne variante="contour" className={varianteStatut(s.statut)}>
                  {t(`finances.statuts.${s.statut}` as never)}
                </Insigne>
              </TableauCellule>
              <TableauCellule className="text-right font-semibold tabular-nums">
                {formatMontant(Number(s.montant), locale)}
              </TableauCellule>
            </TableauLigne>
          ))}
        </TableauCorps>
      </Tableau>
    </div>
  );
}

function Vide({ children, icone: Icone }: { children: React.ReactNode; icone: LucideIcon }) {
  return (
    <div className="carte-vitrine balayage-survol animate-entree grid place-items-center rounded-2xl border bg-card py-16 text-center shadow-sm">
      <div className="degrade-brand degrade-anime icone-flottante mx-auto mb-4 grid size-14 place-items-center rounded-2xl text-white shadow-lg shadow-brand-1/20">
        <Icone className="size-7" />
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}