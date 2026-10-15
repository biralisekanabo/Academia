"use client";

import { useMemo, useState } from "react";
import { Ban, CheckCircle2, GraduationCap, Pencil, Search, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { definirStatutEnseignant, modifierEnseignant } from "@/actions/enseignants";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { Modale } from "@/composants/partages/modale";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Insigne } from "@/composants/ui/insigne";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import { useToast } from "@/composants/ui/toaster";
import { Link, useRouter } from "@/i18n/navigation";
import type { TypeRole, TypeStatut } from "@/types/database";
import { formatDateLongue } from "@/utilitaires/format";

export type EnseignantLigne = {
  id: string;
  specialite: string | null;
  statut: TypeStatut;
  date_embauche: string | null;
  openlu_profils: { prenom: string; nom: string } | null;
};

type FormulaireModification = {
  id: string;
  prenom: string;
  nom: string;
  specialite: string;
  statut: TypeStatut;
};

const STATUTS: TypeStatut[] = ["actif", "en_attente", "inactif", "suspendu"];

function normaliser(texte: string) {
  return texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function varianteStatut(statut: TypeStatut): string {
  switch (statut) {
    case "actif":
      return "text-emerald-600 border-emerald-600/25 bg-emerald-500/10 dark:text-emerald-400";
    case "en_attente":
      return "text-amber-600 border-amber-600/25 bg-amber-500/10 dark:text-amber-400";
    case "inactif":
    case "suspendu":
      return "text-rose-600 border-rose-600/25 bg-rose-500/10 dark:text-rose-400";
    default:
      return "text-muted-foreground";
  }
}

export function ListeEnseignants({
  enseignants,
  role,
  locale,
}: {
  enseignants: EnseignantLigne[];
  role: TypeRole;
  locale: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [requete, setRequete] = useState("");
  const [changements, setChangements] = useState<
    Record<string, Partial<EnseignantLigne>>
  >({});
  const [aModifier, setAModifier] = useState<FormulaireModification | null>(null);
  const [aBasculer, setABasculer] = useState<EnseignantLigne | null>(null);
  const [enCours, setEnCours] = useState(false);

  const peutGerer =
    role === "administrateur" || role === "reception" || role === "personnel";

  const liste = useMemo(
    () => enseignants.map((e) => ({ ...e, ...changements[e.id] })),
    [enseignants, changements]
  );

  const filtres = useMemo(() => {
    const q = normaliser(requete.trim());
    if (!q) return liste;
    return liste.filter((e) => {
      const cible = normaliser(
        [
          e.openlu_profils?.prenom ?? "",
          e.openlu_profils?.nom ?? "",
          e.specialite ?? "",
        ].join(" ")
      );
      return cible.includes(q);
    });
  }, [liste, requete]);

  function ouvrirModification(enseignant: EnseignantLigne) {
    setAModifier({
      id: enseignant.id,
      prenom: enseignant.openlu_profils?.prenom ?? "",
      nom: enseignant.openlu_profils?.nom ?? "",
      specialite: enseignant.specialite ?? "",
      statut: enseignant.statut,
    });
  }

  async function enregistrerModification(e: React.FormEvent) {
    e.preventDefault();
    if (!aModifier || enCours) return;
    setEnCours(true);
    const { erreur } = await modifierEnseignant(aModifier);
    setEnCours(false);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), erreur);
      return;
    }
    setChangements((precedents) => ({
      ...precedents,
      [aModifier.id]: {
        ...precedents[aModifier.id],
        specialite: aModifier.specialite,
        statut: aModifier.statut,
        openlu_profils: { prenom: aModifier.prenom, nom: aModifier.nom },
      },
    }));
    setAModifier(null);
    toasts.succes(t("enseignants.miseAJourReussie"));
    router.refresh();
  }

  async function confirmerBasculer() {
    if (!aBasculer || enCours) return;
    const statut: "actif" | "inactif" =
      aBasculer.statut === "inactif" ? "actif" : "inactif";
    setEnCours(true);
    const { erreur } = await definirStatutEnseignant(aBasculer.id, statut);
    setEnCours(false);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), erreur);
      return;
    }
    setChangements((precedents) => ({
      ...precedents,
      [aBasculer.id]: { ...precedents[aBasculer.id], statut },
    }));
    setABasculer(null);
    toasts.succes(
      t(statut === "actif" ? "enseignants.enseignantReactive" : "enseignants.enseignantDesactive")
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={GraduationCap}
        titre={t("enseignants.titre")}
        sousTitre={t("enseignants.sousTitre")}
        actions={
          peutGerer ? (
            <Link href="/enseignants/nouveau" prefetch>
              <Bouton type="button">
                <UserPlus className="size-4" />
                {t("enseignants.nouveau")}
              </Bouton>
            </Link>
          ) : null
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Saisie
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
          placeholder={t("enseignants.recherche")}
          className="pl-9"
          aria-label={t("enseignants.recherche")}
        />
      </div>

      {filtres.length === 0 ? (
        <div className="carte-vitrine balayage-survol animate-entree grid place-items-center rounded-2xl border bg-card py-16 text-center shadow-sm">
          <div className="degrade-brand degrade-anime icone-flottante mx-auto mb-4 grid size-14 place-items-center rounded-2xl text-white shadow-lg shadow-brand-1/20">
            <GraduationCap className="size-7" />
          </div>
          <p className="text-sm text-muted-foreground">{t("enseignants.aucun")}</p>
        </div>
      ) : (
        <div className="carte-vitrine overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Tableau>
            <TableauEntete>
              <tr className="bg-muted/40">
                <TableauEnteteCellule>{t("enseignants.nomComplet")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("enseignants.specialite")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("enseignants.dateEmbauche")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("enseignants.statut")}</TableauEnteteCellule>
                {peutGerer && (
                  <TableauEnteteCellule className="text-right">
                    {t("commun.actions")}
                  </TableauEnteteCellule>
                )}
              </tr>
            </TableauEntete>
            <TableauCorps>
              {filtres.map((enseignant) => {
                const profil = enseignant.openlu_profils;
                const actif = enseignant.statut === "actif";
                return (
                  <TableauLigne key={enseignant.id}>
                    <TableauCellule className="font-medium">
                      {`${profil?.prenom ?? ""} ${profil?.nom ?? ""}`.trim() || "—"}
                    </TableauCellule>
                    <TableauCellule className="text-muted-foreground">
                      {enseignant.specialite || "—"}
                    </TableauCellule>
                    <TableauCellule className="text-muted-foreground">
                      {formatDateLongue(enseignant.date_embauche, locale)}
                    </TableauCellule>
                    <TableauCellule>
                      <Insigne
                        variante="contour"
                        className={varianteStatut(enseignant.statut)}
                      >
                        {t(`statuts.${enseignant.statut}` as never)}
                      </Insigne>
                    </TableauCellule>
                    {peutGerer && (
                      <TableauCellule>
                        <div className="flex items-center justify-end gap-1">
                          <Bouton
                            type="button"
                            variante="fantome"
                            taille="icone"
                            aria-label={t("commun.modifier")}
                            title={t("commun.modifier")}
                            onClick={() => ouvrirModification(enseignant)}
                          >
                            <Pencil className="size-4" />
                          </Bouton>
                          <Bouton
                            type="button"
                            variante="contour"
                            taille="icone"
                            disabled={enCours}
                            aria-label={
                              actif
                                ? t("enseignants.desactiver")
                                : t("enseignants.reactiver")
                            }
                            title={
                              actif
                                ? t("enseignants.desactiver")
                                : t("enseignants.reactiver")
                            }
                            onClick={() => setABasculer(enseignant)}
                          >
                            {actif ? (
                              <Ban className="size-4" />
                            ) : (
                              <CheckCircle2 className="size-4" />
                            )}
                          </Bouton>
                        </div>
                      </TableauCellule>
                    )}
                  </TableauLigne>
                );
              })}
            </TableauCorps>
          </Tableau>
        </div>
      )}

      <Modale
        ouvert={!!aModifier}
        titre={t("enseignants.modifier")}
        onFermer={() => !enCours && setAModifier(null)}
      >
        {aModifier && (
          <form onSubmit={enregistrerModification} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Etiquette htmlFor="ens-prenom">{t("enseignants.prenom")}</Etiquette>
                <Saisie
                  id="ens-prenom"
                  required
                  minLength={2}
                  value={aModifier.prenom}
                  onChange={(e) =>
                    setAModifier({ ...aModifier, prenom: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Etiquette htmlFor="ens-nom">{t("enseignants.nom")}</Etiquette>
                <Saisie
                  id="ens-nom"
                  required
                  minLength={2}
                  value={aModifier.nom}
                  onChange={(e) => setAModifier({ ...aModifier, nom: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Etiquette htmlFor="ens-specialite">{t("enseignants.specialite")}</Etiquette>
              <Saisie
                id="ens-specialite"
                value={aModifier.specialite}
                placeholder={t("enseignants.specialitePlaceholder")}
                onChange={(e) =>
                  setAModifier({ ...aModifier, specialite: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Etiquette htmlFor="ens-statut">{t("enseignants.statut")}</Etiquette>
              <Selecteur
                id="ens-statut"
                className="w-full"
                value={aModifier.statut}
                onChange={(e) =>
                  setAModifier({ ...aModifier, statut: e.target.value as TypeStatut })
                }
              >
                {STATUTS.map((statut) => (
                  <option key={statut} value={statut}>
                    {t(`statuts.${statut}` as never)}
                  </option>
                ))}
              </Selecteur>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Bouton
                type="button"
                variante="contour"
                disabled={enCours}
                onClick={() => setAModifier(null)}
              >
                {t("commun.annuler")}
              </Bouton>
              <Bouton type="submit" disabled={enCours} aria-busy={enCours}>
                {enCours ? t("commun.chargement") : t("commun.sauvegarder")}
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      <Modale
        ouvert={!!aBasculer}
        titre={t(aBasculer?.statut === "inactif" ? "enseignants.confirmerReactivation" : "enseignants.confirmerDesactivation")}
        sousTitre={
          aBasculer
            ? `${aBasculer.openlu_profils?.prenom ?? ""} ${aBasculer.openlu_profils?.nom ?? ""}`.trim()
            : undefined
        }
        onFermer={() => !enCours && setABasculer(null)}
      >
        <div className="mt-2 flex justify-end gap-2">
          <Bouton
            type="button"
            variante="contour"
            disabled={enCours}
            onClick={() => setABasculer(null)}
          >
            {t("commun.annuler")}
          </Bouton>
          <Bouton
            type="button"
            disabled={enCours}
            aria-busy={enCours}
            onClick={confirmerBasculer}
          >
            {enCours
              ? t("commun.chargement")
              : t(aBasculer?.statut === "inactif" ? "enseignants.reactiver" : "enseignants.desactiver")}
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}
