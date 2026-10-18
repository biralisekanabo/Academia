"use client";

import { useState, useTransition } from "react";
import { Building2, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  creerSuccursale,
  definirStatutSuccursale,
  modifierSuccursale,
  supprimerSuccursale,
} from "@/actions/succursales";
import { Champ } from "@/composants/partages/champ-formulaire";
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
import { useConfirmation } from "@/composants/ui/confirmation";
import { useToast } from "@/composants/ui/toaster";
import type { Entreprise } from "@/types/base";

export type DonneesSuccursale = {
  nom: string;
  sigle?: string;
  ville?: string;
  province?: string;
  pays?: string;
  telephone?: string;
  email?: string;
};

export function GestionSuccursales({
  succursales,
}: {
  succursales: Entreprise[];
}) {
  const t = useTranslations();
  const toasts = useToast();
  const { confirmer } = useConfirmation();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState<Entreprise | null>(null);

  function soumettre(donnees: DonneesSuccursale) {
    demarrer(async () => {
      const r = edition
        ? await modifierSuccursale({ id: edition.id, ...donnees })
        : await creerSuccursale(donnees);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("succursales.enregistre"));
      setOuvert(false);
      setEdition(null);
    });
  }

  function basculerStatut(s: Entreprise) {
    const prochain = s.statut === "ACTIVE" ? "SUSPENDUE" : "ACTIVE";
    demarrer(async () => {
      const r = await definirStatutSuccursale(s.id, prochain);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("succursales.statutMaj"));
    });
  }

  async function supprimer(s: Entreprise) {
    const ok = await confirmer({
      titre: t("commun.supprimer"),
      message: t("succursales.confirmerSuppression", { nom: s.nom }),
      variante: "destructive",
    });
    if (!ok) return;
    demarrer(async () => {
      const r = await supprimerSuccursale(s.id);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("succursales.supprime"));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Bouton
          onClick={() => {
            setEdition(null);
            setOuvert(true);
          }}
          className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20"
        >
          <Plus />
          {t("succursales.nouvelle")}
        </Bouton>
      </div>

      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("succursales.nom")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("etablissements.sigle")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("etablissements.ville")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("etablissements.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">
                {t("commun.actions")}
              </TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {succursales.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={5} className="py-10 text-center text-muted-foreground">
                  {t("succursales.vide")}
                </TableauCellule>
              </TableauLigne>
            )}
            {succursales.map((s) => (
              <TableauLigne key={s.id}>
                <TableauCellule className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" />
                    {s.nom}
                  </span>
                </TableauCellule>
                <TableauCellule className="text-muted-foreground">{s.sigle ?? "—"}</TableauCellule>
                <TableauCellule className="text-muted-foreground">{s.ville ?? "—"}</TableauCellule>
                <TableauCellule>
                  <button onClick={() => basculerStatut(s)} disabled={enCours}>
                    <Insigne variante={s.statut === "ACTIVE" ? "parDefaut" : "destructif"}>
                      {t(`etablissements.statuts.${s.statut}` as never)}
                    </Insigne>
                  </button>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => {
                        setEdition(s);
                        setOuvert(true);
                      }}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                      aria-label={t("commun.modifier")}
                    >
                      <Pencil />
                    </button>
                    <button
                      onClick={() => supprimer(s)}
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

      {ouvert && (
        <FormulaireSuccursale
          succursale={edition}
          enCours={enCours}
          onFermer={() => {
            setOuvert(false);
            setEdition(null);
          }}
          onSoumettre={soumettre}
        />
      )}
    </div>
  );
}

function FormulaireSuccursale({
  succursale,
  enCours,
  onFermer,
  onSoumettre,
}: {
  succursale: Entreprise | null;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (donnees: DonneesSuccursale) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState<DonneesSuccursale>({
    nom: succursale?.nom ?? "",
    sigle: succursale?.sigle ?? "",
    ville: succursale?.ville ?? "",
    province: succursale?.province ?? "",
    pays: succursale?.pays ?? "",
    telephone: succursale?.telephone ?? "",
    email: succursale?.email ?? "",
  });

  return (
    <Modale
      ouvert
      titre={succursale ? t("succursales.modifier") : t("succursales.nouvelle")}
      onFermer={onFermer}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSoumettre(etat);
        }}
        className="space-y-4"
      >
        <Champ label={t("succursales.nom")} value={etat.nom} onChange={(e) => setEtat({ ...etat, nom: e.target.value })} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label={t("etablissements.sigle")} value={etat.sigle} onChange={(e) => setEtat({ ...etat, sigle: e.target.value })} />
          <Champ label={t("etablissements.telephone")} value={etat.telephone} onChange={(e) => setEtat({ ...etat, telephone: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label={t("etablissements.ville")} value={etat.ville} onChange={(e) => setEtat({ ...etat, ville: e.target.value })} />
          <Champ label={t("etablissements.province")} value={etat.province} onChange={(e) => setEtat({ ...etat, province: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label={t("etablissements.pays")} value={etat.pays} onChange={(e) => setEtat({ ...etat, pays: e.target.value })} />
          <Champ label={t("etablissements.email")} type="email" value={etat.email} onChange={(e) => setEtat({ ...etat, email: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Bouton type="button" variante="contour" onClick={onFermer}>
            {t("commun.annuler")}
          </Bouton>
          <Bouton type="submit" disabled={enCours}>
            {enCours && <LoaderCircle className="animate-spin" />}
            {t("commun.sauvegarder")}
          </Bouton>
        </div>
      </form>
    </Modale>
  );
}
