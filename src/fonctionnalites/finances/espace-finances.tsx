"use client";

import { useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  PiggyBank,
  Printer,
  ReceiptText,
  Trash2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { supprimerTransaction } from "@/actions/finances";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

import { FormulaireFrais } from "@/fonctionnalites/finances/formulaire-frais";
import { FormulairePaiement } from "@/fonctionnalites/finances/formulaire-paiement";
import { FormulaireSalaire } from "@/fonctionnalites/finances/formulaire-salaire";
import { FormulaireTransaction } from "@/fonctionnalites/finances/formulaire-transaction";
import {
  ExplorateurEtudiants,
  type EtudiantExploration,
  type FaculteExploration,
  type FiliereExploration,
} from "@/fonctionnalites/finances/explorateur-etudiants";
import type { OptionRecherche } from "@/composants/partages/selecteur-recherche";
import { Modale } from "@/composants/partages/modale";
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
import { useToast } from "@/composants/ui/toaster";
import type {
  TypeCategorieTransaction,
  TypeMethodePaiement,
  TypeRole,
  TypeStatutPaiement as StatutPaiement,
  TypeTransaction,
} from "@/types/database";
import { cn } from "@/utilitaires/cn";
import { formatDateLongue, formatMontant } from "@/utilitaires/format";

export type OngletFinance =
  | "frais"
  | "paiements"
  | "salaires"
  | "tresorerie"
  | "etudiants";

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

export type TransactionLigne = {
  id: string;
  type: TypeTransaction;
  categorie: TypeCategorieTransaction;
  libelle: string;
  montant: number;
  devise: string;
  methode: TypeMethodePaiement;
  reference: string;
  date_transaction: string;
  description: string | null;
  openlu_profils: { prenom: string; nom: string } | null;
};

const ONGLETS: { cle: OngletFinance; icone: LucideIcon; titre: string }[] = [
  { cle: "frais", icone: ReceiptText, titre: "finances.frais" },
  { cle: "paiements", icone: Wallet, titre: "finances.paiements" },
  { cle: "salaires", icone: Landmark, titre: "finances.salaires" },
  { cle: "tresorerie", icone: PiggyBank, titre: "finances.tresorerie" },
  { cle: "etudiants", icone: Users, titre: "finances.etudiantsTitre" },
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
  transactions,
  facultes,
  filieres,
  etudiants,
  enseignants,
  facultesExploration,
  filieresExploration,
  etudiantsExploration,
}: {
  onglet: OngletFinance;
  locale: string;
  role: TypeRole;
  frais: FraisLigne[];
  paiements: PaiementLigne[];
  salaires: SalaireLigne[];
  transactions: TransactionLigne[];
  facultes: OptionRecherche[];
  filieres: OptionRecherche[];
  etudiants: OptionRecherche[];
  enseignants: OptionRecherche[];
  facultesExploration: FaculteExploration[];
  filieresExploration: FiliereExploration[];
  etudiantsExploration: EtudiantExploration[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [modale, setModale] = useState<OngletFinance | null>(null);

  const estFinance = role === "finance";

  const actionsParOnglet: Record<
    OngletFinance,
    { titre: string; ouvre: () => void; visibles: boolean }
  > = {
    frais: { titre: t("finances.nouveauFrais"), ouvre: () => setModale("frais"), visibles: estFinance },
    paiements: { titre: t("finances.nouveauPaiement"), ouvre: () => setModale("paiements"), visibles: estFinance },
    salaires: { titre: t("finances.nouveauSalaire"), ouvre: () => setModale("salaires"), visibles: estFinance },
    tresorerie: { titre: t("finances.nouvelleTransaction"), ouvre: () => setModale("tresorerie"), visibles: estFinance },
    etudiants: { titre: "", ouvre: () => undefined, visibles: false },
  };

  const action = actionsParOnglet[onglet];

  return (
    <div className="space-y-6">
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

        {action.visibles && (
          <Bouton type="button" className="w-full sm:w-auto" onClick={action.ouvre}>
            {action.titre}
          </Bouton>
        )}
      </div>

      {onglet === "frais" && <SectionFrais frais={frais} locale={locale} />}
      {onglet === "paiements" && <SectionPaiements paiements={paiements} locale={locale} />}
      {onglet === "salaires" && <SectionSalaires salaires={salaires} locale={locale} />}
      {onglet === "tresorerie" && (
        <SectionTresorerie
          transactions={transactions}
          locale={locale}
          peutGerer={estFinance}
        />
      )}
      {onglet === "etudiants" && (
        <ExplorateurEtudiants
          facultes={facultesExploration}
          filieres={filieresExploration}
          etudiants={etudiantsExploration}
        />
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
      <FormulaireTransaction
        ouvert={modale === "tresorerie"}
        onFermer={() => setModale(null)}
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

function sommeParDevise(
  transactions: TransactionLigne[],
  type: TypeTransaction
): { devise: string; total: number }[] {
  const totaux = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== type) continue;
    const devise = t.devise || "CDF";
    totaux.set(devise, (totaux.get(devise) ?? 0) + Number(t.montant));
  }
  return [...totaux.entries()].map(([devise, total]) => ({ devise, total }));
}

function SectionTresorerie({
  transactions,
  locale,
  peutGerer,
}: {
  transactions: TransactionLigne[];
  locale: string;
  peutGerer: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();
  const [aSupprimer, setASupprimer] = useState<TransactionLigne | null>(null);
  const [suppression, setSuppression] = useState(false);

  const entrees = sommeParDevise(transactions, "entree");
  const sorties = sommeParDevise(transactions, "sortie");

  function solde(): { devise: string; total: number }[] {
    const devises = new Set([
      ...entrees.map((e) => e.devise),
      ...sorties.map((s) => s.devise),
    ]);
    return [...devises].map((devise) => ({
      devise,
      total:
        (entrees.find((e) => e.devise === devise)?.total ?? 0) -
        (sorties.find((s) => s.devise === devise)?.total ?? 0),
    }));
  }

  async function confirmerSuppression() {
    if (!aSupprimer) return;
    setSuppression(true);
    const { erreur } = await supprimerTransaction(aSupprimer.id);
    setSuppression(false);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), erreur);
      return;
    }
    setASupprimer(null);
    router.refresh();
    toasts.succes(t("finances.operationSupprimee"));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <CarteKpi
          titre={t("finances.entrees")}
          lignes={entrees}
          locale={locale}
          icone={ArrowUpCircle}
          ton="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        />
        <CarteKpi
          titre={t("finances.sorties")}
          lignes={sorties}
          locale={locale}
          icone={ArrowDownCircle}
          ton="bg-rose-500/15 text-rose-600 dark:text-rose-400"
        />
        <CarteKpi
          titre={t("finances.solde")}
          lignes={solde()}
          locale={locale}
          icone={PiggyBank}
          ton="bg-brand-1/15 text-brand-2"
        />
      </div>

      {transactions.length === 0 ? (
        <Vide icone={PiggyBank}>{t("finances.aucun")}</Vide>
      ) : (
        <div className="carte-vitrine overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Tableau>
            <TableauEntete>
              <tr className="bg-muted/40">
                <TableauEnteteCellule>{t("finances.date")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("finances.typeOperation")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("finances.categorie")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("finances.libelle")}</TableauEnteteCellule>
                <TableauEnteteCellule className="text-right">
                  {t("finances.montant")}
                </TableauEnteteCellule>
                {peutGerer && <TableauEnteteCellule />}
              </tr>
            </TableauEntete>
            <TableauCorps>
              {transactions.map((transaction, index) => (
                <TableauLigne
                  key={transaction.id}
                  className="ligne-animee animate-entree"
                  style={{ ["--delai" as string]: `${Math.min(index, 12) * 35}ms` }}
                >
                  <TableauCellule className="text-muted-foreground">
                    {formatDateLongue(transaction.date_transaction, locale)}
                  </TableauCellule>
                  <TableauCellule>
                    <Insigne
                      variante="contour"
                      className={
                        transaction.type === "entree"
                          ? "border-emerald-600/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-rose-600/25 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }
                    >
                      {t(`finances.types.${transaction.type}` as never)}
                    </Insigne>
                  </TableauCellule>
                  <TableauCellule className="text-muted-foreground">
                    {t(`finances.categories.${transaction.categorie}` as never)}
                  </TableauCellule>
                  <TableauCellule className="font-medium">
                    {transaction.libelle}
                    {transaction.description && (
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {transaction.description}
                      </span>
                    )}
                  </TableauCellule>
                  <TableauCellule
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      transaction.type === "entree"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {transaction.type === "sortie" ? "−" : "+"}
                    {formatMontant(Number(transaction.montant), locale, transaction.devise)}
                  </TableauCellule>
                  {peutGerer && (
                    <TableauCellule>
                      <button
                        type="button"
                        onClick={() => setASupprimer(transaction)}
                        aria-label={t("commun.supprimer")}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </TableauCellule>
                  )}
                </TableauLigne>
              ))}
            </TableauCorps>
          </Tableau>
        </div>
      )}

      <Modale
        ouvert={aSupprimer !== null}
        titre={t("finances.supprimerOperation")}
        sousTitre={t("finances.aideSupprimerOperation")}
        onFermer={() => setASupprimer(null)}
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Bouton type="button" variante="fantome" onClick={() => setASupprimer(null)}>
            {t("commun.annuler")}
          </Bouton>
          <Bouton
            type="button"
            variante="destructif"
            disabled={suppression}
            onClick={confirmerSuppression}
          >
            {suppression ? t("commun.chargement") : t("commun.supprimer")}
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}

function CarteKpi({
  titre,
  lignes,
  locale,
  icone: Icone,
  ton,
}: {
  titre: string;
  lignes: { devise: string; total: number }[];
  locale: string;
  icone: LucideIcon;
  ton: string;
}) {
  return (
    <div className="carte-vitrine animate-entree rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 place-items-center rounded-xl", ton)}>
          <Icone className="size-5" />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{titre}</p>
      </div>
      <div className="mt-3 space-y-0.5">
        {lignes.length === 0 ? (
          <p className="text-2xl font-bold tabular-nums">
            {formatMontant(0, locale, "CDF")}
          </p>
        ) : (
          lignes.map((l) => (
            <p key={l.devise} className="text-2xl font-bold tabular-nums">
              {formatMontant(l.total, locale, l.devise)}
            </p>
          ))
        )}
      </div>
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
