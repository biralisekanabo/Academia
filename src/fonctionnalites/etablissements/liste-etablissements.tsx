"use client";

import { useTransition } from "react";
import { Building2, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  definirStatutEtablissement,
  supprimerEtablissement,
} from "@/actions/etablissements";
import { Insigne } from "@/composants/ui/insigne";
import { Link } from "@/i18n/navigation";
import { useConfirmation } from "@/composants/ui/confirmation";
import { useToast } from "@/composants/ui/toaster";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import type { Entreprise } from "@/types/base";

export function ListeEtablissements({
  etablissements,
}: {
  etablissements: Entreprise[];
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();

  if (etablissements.length === 0) {
    return (
      <div className="carte-vitrine grid place-items-center gap-3 rounded-3xl border bg-card p-12 text-center">
        <Building2 className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("etablissements.vide")}
        </p>
      </div>
    );
  }

  return (
    <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
      <Tableau>
        <TableauEntete>
          <TableauLigne>
            <TableauEnteteCellule>
              {t("etablissements.nom")}
            </TableauEnteteCellule>
            <TableauEnteteCellule>{t("etablissements.sigle")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("etablissements.ville")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("etablissements.statut")}</TableauEnteteCellule>
            <TableauEnteteCellule className="text-right">
              {t("commun.actions")}
            </TableauEnteteCellule>
          </TableauLigne>
        </TableauEntete>
        <TableauCorps>
          {etablissements.map((etablissement) => (
            <TableauLigne key={etablissement.id}>
              <TableauCellule>
                <Link
                  href={`/etablissements/${etablissement.id}`}
                  className="font-medium hover:text-brand-2"
                >
                  {etablissement.nom}
                </Link>
                {!etablissement.est_mere && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t("etablissements.succursale")}
                  </span>
                )}
              </TableauCellule>
              <TableauCellule className="text-muted-foreground">
                {etablissement.sigle ?? "—"}
              </TableauCellule>
              <TableauCellule className="text-muted-foreground">
                {etablissement.ville ?? "—"}
              </TableauCellule>
              <TableauCellule>
                <InsigneStatut statut={etablissement.statut} />
              </TableauCellule>
              <TableauCellule className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <select
                    value={etablissement.statut}
                    disabled={enCours}
                    onChange={(e) =>
                      demarrer(async () => {
                        const resultat = await definirStatutEtablissement(
                          etablissement.id,
                          e.target.value as Entreprise["statut"]
                        );
                        if (resultat.erreur) {
                          toasts.erreur(t("toasts.erreur"), resultat.erreur);
                          return;
                        }
                        toasts.succes(t("toasts.succes"), t("etablissements.statutMaj"));
                      })
                    }
                    className="h-8 rounded-lg border bg-transparent px-2 text-xs"
                    aria-label={t("etablissements.statut")}
                  >
                    <option value="ACTIVE">{t("etablissements.statuts.ACTIVE")}</option>
                    <option value="SUSPENDUE">{t("etablissements.statuts.SUSPENDUE")}</option>
                    <option value="INACTIVE">{t("etablissements.statuts.INACTIVE")}</option>
                  </select>
                  <BoutonSupprimer
                    id={etablissement.id}
                    nom={etablissement.nom}
                    onFait={() =>
                      demarrer(async () => {
                        const resultat = await supprimerEtablissement(etablissement.id);
                        if (resultat.erreur) {
                          toasts.erreur(t("toasts.erreur"), resultat.erreur);
                          return;
                        }
                        toasts.succes(t("toasts.succes"), t("etablissements.suppressionReussie"));
                      })
                    }
                  />
                </div>
              </TableauCellule>
            </TableauLigne>
          ))}
        </TableauCorps>
      </Tableau>
    </div>
  );
}

function InsigneStatut({ statut }: { statut: Entreprise["statut"] }) {
  const t = useTranslations();
  const variante =
    statut === "ACTIVE"
      ? "parDefaut"
      : statut === "SUSPENDUE"
        ? "destructif"
        : "secondaire";
  return (
    <Insigne variante={variante as never}>
      {t(`etablissements.statuts.${statut}` as never)}
    </Insigne>
  );
}

function BoutonSupprimer({
  nom,
  onFait,
}: {
  id: number;
  nom: string;
  onFait: () => void;
}) {
  const t = useTranslations();
  const { confirmer } = useConfirmation();
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirmer({
          titre: t("commun.supprimer"),
          message: t("etablissements.confirmerSuppression", { nom }),
          variante: "destructive",
        });
        if (ok) onFait();
      }}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      aria-label={t("commun.supprimer")}
    >
      <MoreHorizontal className="size-4" />
    </button>
  );
}
