"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BadgePercent,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { annulerDette, accorderRemise } from "@/actions/dettes";
import {
  creerFrais,
  definirStatutFrais,
  modifierFrais,
  supprimerFrais,
} from "@/actions/frais";
import {
  Champ,
  ChampSelecteur,
  ChampZoneTexte,
} from "@/composants/partages/champ-formulaire";
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
import { cn } from "@/utilitaires/cn";
import type {
  AnneeAcademique,
  Devise,
  Domaine,
  Dette,
  Faculte,
  FraisAcademique,
  Promotion,
} from "@/types/base";

export type LigneDette = {
  id: number;
  etudiant: string;
  matricule: string;
  frais: string;
  montant_initial: number;
  montant_reduction: number;
  montant_paye: number;
  solde: number;
  devise: string;
  date_echeance: string | null;
  statut: Dette["statut"];
};

type TrancheEtat = { libelle: string; pourcentage: string; date_limite: string };
type Onglet = "frais" | "dettes";

export function GestionFrais({
  annees,
  facultes,
  domaines,
  promotions,
  devises,
  frais,
  dettes,
}: {
  annees: AnneeAcademique[];
  facultes: Faculte[];
  domaines: Domaine[];
  promotions: Promotion[];
  devises: Devise[];
  frais: FraisAcademique[];
  dettes: LigneDette[];
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [onglet, setOnglet] = useState<Onglet>("frais");
  const [formFrais, setFormFrais] = useState<FraisAcademique | null | undefined>(undefined);

  const labels = useMemo(() => {
    const annee = new Map(annees.map((a) => [a.id, a.libelle]));
    const faculte = new Map(facultes.map((f) => [f.id, f.nom]));
    const domaine = new Map(domaines.map((d) => [d.id, d.nom]));
    const promotion = new Map(promotions.map((p) => [p.id, p.nom]));
    const devise = new Map(devises.map((d) => [d.id, `${d.code}`]));
    const symbole = new Map(devises.map((d) => [d.id, d.symbole || d.code]));
    return { annee, faculte, domaine, promotion, devise, symbole };
  }, [annees, facultes, domaines, promotions, devises]);

  const cible = (f: FraisAcademique) => {
    if (f.promotion_id) return `${t("frais.cible.promotion")} : ${labels.promotion.get(f.promotion_id) ?? "—"}`;
    if (f.domaine_id) return `${t("frais.cible.domaine")} : ${labels.domaine.get(f.domaine_id) ?? "—"}`;
    if (f.faculte_id) return `${t("frais.cible.faculte")} : ${labels.faculte.get(f.faculte_id) ?? "—"}`;
    return t("frais.cible.global");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {([
          { cle: "frais" as const, libelle: t("frais.onglets.frais"), icone: FileText, compte: frais.length },
          { cle: "dettes" as const, libelle: t("frais.onglets.dettes"), icone: Receipt, compte: dettes.length },
        ]).map(({ cle, libelle, icone: Icone, compte }) => (
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
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                onglet === cle ? "bg-white/20" : "bg-muted"
              )}
            >
              {compte}
            </span>
          </button>
        ))}
      </div>

      {onglet === "frais" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Bouton
              onClick={() => setFormFrais(null)}
              disabled={annees.length === 0 || devises.length === 0}
              className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20"
            >
              <Plus />
              {t("frais.nouveau")}
            </Bouton>
          </div>
          <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
            <Tableau>
              <TableauEntete>
                <TableauLigne>
                  <TableauEnteteCellule>{t("frais.libelle")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("frais.annee")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("frais.cibleLabel")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("frais.montant")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("frais.statut")}</TableauEnteteCellule>
                  <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
                </TableauLigne>
              </TableauEntete>
              <TableauCorps>
                {frais.length === 0 && (
                  <TableauLigne>
                    <TableauCellule colSpan={6} className="py-8 text-center text-muted-foreground">
                      {t("frais.vides")}
                    </TableauCellule>
                  </TableauLigne>
                )}
                {frais.map((f) => (
                  <TableauLigne key={f.id}>
                    <TableauCellule className="font-medium">{f.libelle}</TableauCellule>
                    <TableauCellule className="text-muted-foreground">
                      {labels.annee.get(f.annee_academique_id) ?? "—"}
                    </TableauCellule>
                    <TableauCellule className="text-muted-foreground">{cible(f)}</TableauCellule>
                    <TableauCellule className="font-mono text-xs">
                      {f.montant} {labels.devise.get(f.devise_id) ?? ""}
                    </TableauCellule>
                    <TableauCellule>
                      <button
                        disabled={enCours}
                        onClick={() =>
                          demarrer(async () => {
                            const r = await definirStatutFrais(
                              f.id,
                              f.statut === "ACTIF" ? "INACTIF" : "ACTIF"
                            );
                            if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                            toasts.succes(t("toasts.succes"), t("frais.statutMaj"));
                          })
                        }
                      >
                        <Insigne variante={f.statut === "ACTIF" ? "parDefaut" : "secondaire"}>
                          {t(`frais.statuts.${f.statut}` as never)}
                        </Insigne>
                      </button>
                    </TableauCellule>
                    <TableauCellule className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setFormFrais(f)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                          aria-label={t("commun.modifier")}
                        >
                          <Pencil />
                        </button>
                        <button
                          disabled={enCours}
                          onClick={() => {
                            if (!window.confirm(t("frais.confirmerSuppression", { libelle: f.libelle }))) return;
                            demarrer(async () => {
                              const r = await supprimerFrais(f.id);
                              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                              toasts.succes(t("toasts.succes"), t("frais.supprime"));
                            });
                          }}
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
      )}

      {onglet === "dettes" && (
        <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
          <Tableau>
            <TableauEntete>
              <TableauLigne>
                <TableauEnteteCellule>{t("frais.etudiant")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("frais.fraisLie")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("frais.solde")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("frais.statut")}</TableauEnteteCellule>
                <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
              </TableauLigne>
            </TableauEntete>
            <TableauCorps>
              {dettes.length === 0 && (
                <TableauLigne>
                  <TableauCellule colSpan={5} className="py-8 text-center text-muted-foreground">
                    {t("frais.dettesVides")}
                  </TableauCellule>
                </TableauLigne>
              )}
              {dettes.map((d) => (
                <LigneDetteRow
                  key={d.id}
                  dette={d}
                  enCours={enCours}
                  onRemise={(montant, motif) =>
                    demarrer(async () => {
                      const r = await accorderRemise({ dette_id: d.id, montant, motif });
                      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                      toasts.succes(t("toasts.succes"), t("frais.remiseAccordee"));
                    })
                  }
                  onAnnuler={() =>
                    demarrer(async () => {
                      const r = await annulerDette(d.id);
                      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                      toasts.succes(t("toasts.succes"), t("frais.detteAnnulee"));
                    })
                  }
                />
              ))}
            </TableauCorps>
          </Tableau>
        </div>
      )}

      {formFrais !== undefined && (
        <Modale
          ouvert
          titre={formFrais ? t("frais.modifier") : t("frais.nouveau")}
          onFermer={() => setFormFrais(undefined)}
        >
          <FormulaireFrais
            frais={formFrais}
            annees={annees}
            facultes={facultes}
            domaines={domaines}
            promotions={promotions}
            devises={devises}
            enCours={enCours}
            onFermer={() => setFormFrais(undefined)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = formFrais
                  ? await modifierFrais({ id: formFrais.id, ...d })
                  : await creerFrais(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("frais.enregistre"));
                setFormFrais(undefined);
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}

function LigneDetteRow({
  dette,
  enCours,
  onRemise,
  onAnnuler,
}: {
  dette: LigneDette;
  enCours: boolean;
  onRemise: (montant: number, motif: string) => void;
  onAnnuler: () => void;
}) {
  const t = useTranslations();
  const [remise, setRemise] = useState(false);

  return (
    <TableauLigne>
      <TableauCellule>
        <span className="font-medium">{dette.etudiant}</span>
        <span className="ml-2 font-mono text-xs text-muted-foreground">{dette.matricule}</span>
      </TableauCellule>
      <TableauCellule className="text-muted-foreground">{dette.frais}</TableauCellule>
      <TableauCellule className="font-mono text-xs">
        <span className="font-semibold">{dette.solde}</span> {dette.devise}
        {dette.montant_reduction > 0 && (
          <span className="ml-2 text-green-600">
            (-{dette.montant_reduction})
          </span>
        )}
      </TableauCellule>
      <TableauCellule>
        <Insigne variante={dette.statut === "PAYEE" ? "parDefaut" : dette.statut === "ANNULEE" ? "secondaire" : "contour"}>
          {t(`frais.statutsDette.${dette.statut}` as never)}
        </Insigne>
      </TableauCellule>
      <TableauCellule className="text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            disabled={enCours || dette.statut === "ANNULEE" || dette.solde <= 0}
            onClick={() => setRemise(true)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-40 [&_svg]:size-4"
            aria-label={t("frais.accorderRemise")}
          >
            <BadgePercent />
          </button>
          <button
            disabled={enCours || dette.statut === "ANNULEE" || dette.montant_paye > 0}
            onClick={() => {
              if (!window.confirm(t("frais.confirmerAnnulation"))) return;
              onAnnuler();
            }}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 [&_svg]:size-4"
            aria-label={t("frais.annulerDette")}
          >
            <X />
          </button>
        </div>

        {remise && (
          <Modale ouvert titre={t("frais.accorderRemise")} onFermer={() => setRemise(false)}>
            <FormulaireRemise
              solde={dette.solde}
              devise={dette.devise}
              enCours={enCours}
              onFermer={() => setRemise(false)}
              onSoumettre={(montant, motif) => {
                onRemise(montant, motif);
                setRemise(false);
              }}
            />
          </Modale>
        )}
      </TableauCellule>
    </TableauLigne>
  );
}

function FormulaireRemise({
  solde,
  devise,
  enCours,
  onFermer,
  onSoumettre,
}: {
  solde: number;
  devise: string;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (montant: number, motif: string) => void;
}) {
  const t = useTranslations();
  const [montant, setMontant] = useState("");
  const [motif, setMotif] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre(Number(montant), motif);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        {t("frais.soldeActuel")} : <span className="font-mono font-semibold">{solde} {devise}</span>
      </p>
      <Champ label={`${t("frais.montantRemise")} (${devise})`} type="number" step="0.01" min="0" max={solde} value={montant} onChange={(e) => setMontant(e.target.value)} required />
      <Champ label={t("frais.motif")} value={motif} onChange={(e) => setMotif(e.target.value)} />
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

function FormulaireFrais({
  frais,
  annees,
  facultes,
  domaines,
  promotions,
  devises,
  enCours,
  onFermer,
  onSoumettre,
}: {
  frais: FraisAcademique | null;
  annees: AnneeAcademique[];
  facultes: Faculte[];
  domaines: Domaine[];
  promotions: Promotion[];
  devises: Devise[];
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    annee_academique_id: String(frais?.annee_academique_id ?? annees[0]?.id ?? ""),
    faculte_id: frais?.faculte_id ? String(frais.faculte_id) : "",
    domaine_id: frais?.domaine_id ? String(frais.domaine_id) : "",
    promotion_id: frais?.promotion_id ? String(frais.promotion_id) : "",
    libelle: frais?.libelle ?? "",
    montant: frais ? String(frais.montant) : "",
    devise_id: String(frais?.devise_id ?? devises[0]?.id ?? ""),
    date_limite: frais?.date_limite ?? "",
    modalites: frais?.modalites ?? "",
  });
  const [tranches, setTranches] = useState<TrancheEtat[]>([]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({
          annee_academique_id: Number(etat.annee_academique_id),
          faculte_id: etat.faculte_id ? Number(etat.faculte_id) : undefined,
          domaine_id: etat.domaine_id ? Number(etat.domaine_id) : undefined,
          promotion_id: etat.promotion_id ? Number(etat.promotion_id) : undefined,
          libelle: etat.libelle,
          montant: Number(etat.montant),
          devise_id: Number(etat.devise_id),
          date_limite: etat.date_limite,
          modalites: etat.modalites,
          tranches: tranches.map((tr) => ({
            libelle: tr.libelle,
            pourcentage: Number(tr.pourcentage),
            date_limite: tr.date_limite,
          })),
        });
      }}
      className="space-y-4"
    >
      <ChampSelecteur label={t("frais.annee")} className="w-full" value={etat.annee_academique_id} onChange={(e) => setEtat({ ...etat, annee_academique_id: e.target.value })} required>
        {annees.map((a) => (
          <option key={a.id} value={a.id}>{a.libelle}</option>
        ))}
      </ChampSelecteur>
      <Champ label={t("frais.libelle")} value={etat.libelle} onChange={(e) => setEtat({ ...etat, libelle: e.target.value })} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("frais.montant")} type="number" step="0.01" min="0" value={etat.montant} onChange={(e) => setEtat({ ...etat, montant: e.target.value })} required />
        <ChampSelecteur label={t("frais.devise")} className="w-full" value={etat.devise_id} onChange={(e) => setEtat({ ...etat, devise_id: e.target.value })} required>
          {devises.map((d) => (
            <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
          ))}
        </ChampSelecteur>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ChampSelecteur label={t("frais.faculte")} className="w-full" value={etat.faculte_id} onChange={(e) => setEtat({ ...etat, faculte_id: e.target.value })}>
          <option value="">{t("frais.toutes")}</option>
          {facultes.map((f) => (
            <option key={f.id} value={f.id}>{f.nom}</option>
          ))}
        </ChampSelecteur>
        <ChampSelecteur label={t("frais.domaine")} className="w-full" value={etat.domaine_id} onChange={(e) => setEtat({ ...etat, domaine_id: e.target.value })}>
          <option value="">{t("frais.tous")}</option>
          {domaines.map((d) => (
            <option key={d.id} value={d.id}>{d.nom}</option>
          ))}
        </ChampSelecteur>
        <ChampSelecteur label={t("frais.promotion")} className="w-full" value={etat.promotion_id} onChange={(e) => setEtat({ ...etat, promotion_id: e.target.value })}>
          <option value="">{t("frais.toutes")}</option>
          {promotions.map((p) => (
            <option key={p.id} value={p.id}>{p.nom}</option>
          ))}
        </ChampSelecteur>
      </div>
      <Champ label={t("frais.dateLimite")} type="date" value={etat.date_limite} onChange={(e) => setEtat({ ...etat, date_limite: e.target.value })} />
      <ChampZoneTexte label={t("frais.modalites")} rows={3} value={etat.modalites} onChange={(e) => setEtat({ ...etat, modalites: e.target.value })} />

      <div className="space-y-2 rounded-xl border p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("frais.tranches")}</span>
          <button
            type="button"
            onClick={() => setTranches([...tranches, { libelle: "", pourcentage: "", date_limite: "" }])}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-2 hover:underline"
          >
            <Plus className="size-3.5" />
            {t("frais.ajouterTranche")}
          </button>
        </div>
        {tranches.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("frais.aucuneTranche")}</p>
        )}
        {tranches.map((tr, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
              placeholder={t("frais.trancheLibelle")}
              value={tr.libelle}
              onChange={(e) => setTranches(tranches.map((x, i) => (i === index ? { ...x, libelle: e.target.value } : x)))}
            />
            <input
              className="h-9 w-24 rounded-md border bg-background px-3 text-sm"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="%"
              value={tr.pourcentage}
              onChange={(e) => setTranches(tranches.map((x, i) => (i === index ? { ...x, pourcentage: e.target.value } : x)))}
            />
            <button
              type="button"
              onClick={() => setTranches(tranches.filter((_, i) => i !== index))}
              className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("commun.supprimer")}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

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
