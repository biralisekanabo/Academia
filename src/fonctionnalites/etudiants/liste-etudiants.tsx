"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  Building2,
  Check,
  Pencil,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { definirStatutEtudiant, modifierEtudiant } from "@/actions/etudiants";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { Modale } from "@/composants/partages/modale";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Insigne } from "@/composants/ui/insigne";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { useToast } from "@/composants/ui/toaster";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import { Link, useRouter } from "@/i18n/navigation";
import type { TypeNiveau, TypeRole, TypeStatut } from "@/types/database";
import { formatDateLongue } from "@/utilitaires/format";

type Faculte = { id: string; code: string; nom: string };
type Filiere = { id: string; faculte_id: string; nom: string };

export type EtudiantLigne = {
  id: string;
  matricule: string;
  filiere_id: string | null;
  niveau: TypeNiveau;
  annee_universitaire: string;
  statut: TypeStatut;
  date_inscription: string;
  openlu_profils: { prenom: string; nom: string } | null;
  openlu_filieres: {
    nom: string;
    faculte_id: string;
    openlu_facultes: { code: string; nom: string } | null;
  } | null;
};

type FormulaireModification = {
  id: string;
  prenom: string;
  nom: string;
  faculteId: string;
  filiereId: string;
  niveau: TypeNiveau;
  statut: TypeStatut;
};

const NIVEAUX: TypeNiveau[] = ["L1", "L2", "L3", "M1", "M2"];

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
    case "diplome":
      return "text-sky-600 border-sky-600/25 bg-sky-500/10 dark:text-sky-400";
    default:
      return "text-muted-foreground";
  }
}

export function ListeEtudiants({
  etudiants,
  role,
  locale,
  facultes,
  filieres,
}: {
  etudiants: EtudiantLigne[];
  role: TypeRole;
  locale: string;
  facultes: Faculte[];
  filieres: Filiere[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();
  const [requete, setRequete] = useState("");
  const [changementsLocaux, setChangementsLocaux] = useState<
    Record<string, Partial<EtudiantLigne>>
  >({});
  const [aModifier, setAModifier] = useState<FormulaireModification | null>(null);
  const [aDesactiver, setADesactiver] = useState<EtudiantLigne | null>(null);
  const [enCours, setEnCours] = useState(false);

  const listeLocale = useMemo(
    () =>
      etudiants.map((etudiant) => ({
        ...etudiant,
        ...changementsLocaux[etudiant.id],
      })),
    [etudiants, changementsLocaux]
  );

  const peutGerer =
    role === "administrateur" || role === "reception" || role === "personnel";

  const filtrees = useMemo(() => {
    const q = normaliser(requete.trim());
    if (!q) return listeLocale;
    return listeLocale.filter((e) => {
      const profil = e.openlu_profils;
      const cible = normaliser(
        [
          e.matricule,
          profil?.prenom,
          profil?.nom,
          e.openlu_filieres?.nom ?? "",
          e.openlu_filieres?.openlu_facultes?.nom ?? "",
          e.niveau,
          e.annee_universitaire,
        ].join(" ")
      );
      return cible.includes(q);
    });
  }, [listeLocale, requete]);

  const groupes = useMemo(() => {
    const parFaculte = new Map<
      string,
      { code: string; nom: string; niveaux: Map<TypeNiveau, EtudiantLigne[]> }
    >();

    for (const etudiant of filtrees) {
      const faculte = etudiant.openlu_filieres?.openlu_facultes;
      const code = faculte?.code ?? "—";
      const cleFaculte = code;
      let groupeFaculte = parFaculte.get(cleFaculte);

      if (!groupeFaculte) {
        groupeFaculte = {
          code,
          nom: faculte?.nom ?? t("etudiants.faculteInconnue"),
          niveaux: new Map(),
        };
        parFaculte.set(cleFaculte, groupeFaculte);
      }

      const niveau = groupeFaculte.niveaux.get(etudiant.niveau) ?? [];
      niveau.push(etudiant);
      groupeFaculte.niveaux.set(etudiant.niveau, niveau);
    }

    return [...parFaculte.values()]
      .sort((a, b) => a.nom.localeCompare(b.nom, locale))
      .map((faculte) => ({
        ...faculte,
        niveaux: [...faculte.niveaux.entries()]
          .sort(([a], [b]) => NIVEAUX.indexOf(a) - NIVEAUX.indexOf(b))
          .map(([niveau, liste]) => ({
            niveau,
            etudiants: liste.sort((a, b) =>
              `${a.openlu_profils?.nom ?? ""} ${a.openlu_profils?.prenom ?? ""}`.localeCompare(
                `${b.openlu_profils?.nom ?? ""} ${b.openlu_profils?.prenom ?? ""}`,
                locale
              )
            ),
          })),
      }));
  }, [filtrees, locale, t]);

  function ouvrirModification(etudiant: EtudiantLigne) {
    setAModifier({
      id: etudiant.id,
      prenom: etudiant.openlu_profils?.prenom ?? "",
      nom: etudiant.openlu_profils?.nom ?? "",
      faculteId: etudiant.openlu_filieres?.faculte_id ?? "",
      filiereId: etudiant.filiere_id ?? "",
      niveau: etudiant.niveau,
      statut: etudiant.statut,
    });
  }

  async function enregistrerModification(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!aModifier || enCours) return;
    setEnCours(true);
    const resultat = await modifierEtudiant(aModifier);
    setEnCours(false);

    if (resultat.erreur) {
      toasts.erreur(t("toasts.erreur"), resultat.erreur);
      return;
    }

    const faculte = facultes.find((element) => element.id === aModifier.faculteId);
    const filiere = filieres.find((element) => element.id === aModifier.filiereId);
    setChangementsLocaux((precedents) => ({
      ...precedents,
      [aModifier.id]: {
        ...precedents[aModifier.id],
        filiere_id: aModifier.filiereId,
        niveau: aModifier.niveau,
        statut: aModifier.statut,
        openlu_profils: { prenom: aModifier.prenom, nom: aModifier.nom },
        openlu_filieres:
          faculte && filiere
            ? {
                nom: filiere.nom,
                faculte_id: faculte.id,
                openlu_facultes: { code: faculte.code, nom: faculte.nom },
              }
            : undefined,
      },
    }));
    setAModifier(null);
    toasts.succes(t("etudiants.miseAJourReussie"));
    router.refresh();
  }

  async function confirmerChangementStatut() {
    if (!aDesactiver || enCours) return;
    setEnCours(true);
    const statut = aDesactiver.statut === "inactif" ? "actif" : "inactif";
    const resultat = await definirStatutEtudiant(aDesactiver.id, statut);
    setEnCours(false);

    if (resultat.erreur) {
      toasts.erreur(t("toasts.erreur"), resultat.erreur);
      return;
    }

    setChangementsLocaux((precedents) => ({
      ...precedents,
      [aDesactiver.id]: { ...precedents[aDesactiver.id], statut },
    }));
    setADesactiver(null);
    toasts.succes(
      t(statut === "inactif" ? "etudiants.etudiantDesactive" : "etudiants.etudiantReactive")
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={Users}
        titre={t("etudiants.titre")}
        sousTitre={t("etudiants.sousTitre")}
        actions={
          peutGerer ? (
            <Link href="/etudiants/nouveau" prefetch>
              <Bouton type="button">
                <UserPlus className="size-4" />
                {t("etudiants.nouveau")}
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
          placeholder={t("etudiants.recherche")}
          className="pl-9"
          aria-label={t("etudiants.recherche")}
        />
      </div>

      {groupes.length === 0 ? (
        <div className="carte-vitrine balayage-survol animate-entree grid place-items-center rounded-2xl border bg-card py-16 text-center shadow-sm">
          <div className="degrade-brand degrade-anime icone-flottante mx-auto mb-4 grid size-14 place-items-center rounded-2xl text-white shadow-lg shadow-brand-1/20">
            <Users className="size-7" />
          </div>
          <p className="text-sm text-muted-foreground">{t("etudiants.aucun")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupes.map((faculte, indexFaculte) => (
            <section
              key={faculte.code}
              className="carte-vitrine animate-entree overflow-hidden rounded-2xl border bg-card shadow-sm"
              style={{ ["--delai" as string]: `${Math.min(indexFaculte, 8) * 50}ms` }}
            >
              <header className="flex items-center gap-3 border-b bg-muted/30 px-5 py-4 sm:px-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-1/10 text-brand-2">
                  <Building2 className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold">{faculte.nom}</h2>
                  <p className="text-xs text-muted-foreground">{faculte.code}</p>
                </div>
              </header>
              <div className="space-y-5 p-4 sm:p-5">
                {faculte.niveaux.map(({ niveau, etudiants: inscrits }) => (
                  <div key={niveau}>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-sm font-semibold">
                        {t("etudiants.promotion")} {niveau}
                      </h3>
                      <Insigne variante="secondaire">{inscrits.length}</Insigne>
                    </div>
                    <div className="overflow-hidden rounded-xl border">
                      <Tableau>
                        <TableauEntete>
                          <tr className="bg-muted/40">
                            <TableauEnteteCellule>{t("etudiants.matricule")}</TableauEnteteCellule>
                            <TableauEnteteCellule>{t("etudiants.nom")}</TableauEnteteCellule>
                            <TableauEnteteCellule>{t("etudiants.filiere")}</TableauEnteteCellule>
                            <TableauEnteteCellule>{t("etudiants.statut")}</TableauEnteteCellule>
                            <TableauEnteteCellule>{t("etudiants.dateInscription")}</TableauEnteteCellule>
                            {peutGerer && <TableauEnteteCellule>{t("commun.actions")}</TableauEnteteCellule>}
                          </tr>
                        </TableauEntete>
                        <TableauCorps>
                          {inscrits.map((etudiant, index) => (
                            <TableauLigne
                              key={etudiant.id}
                              className="animate-entree"
                              style={{ ["--delai" as string]: `${Math.min(index, 10) * 30}ms` }}
                            >
                              <TableauCellule className="font-mono text-xs text-muted-foreground">
                                {etudiant.matricule}
                              </TableauCellule>
                              <TableauCellule className="font-medium">
                                {etudiant.openlu_profils?.prenom} {etudiant.openlu_profils?.nom}
                              </TableauCellule>
                              <TableauCellule>{etudiant.openlu_filieres?.nom ?? "—"}</TableauCellule>
                              <TableauCellule>
                                <Insigne variante="contour" className={varianteStatut(etudiant.statut)}>
                                  {t(`statuts.${etudiant.statut}` as never)}
                                </Insigne>
                              </TableauCellule>
                              <TableauCellule className="text-muted-foreground">
                                {formatDateLongue(etudiant.date_inscription, locale)}
                              </TableauCellule>
                              {peutGerer && (
                                <TableauCellule>
                                  <div className="flex items-center gap-1">
                                    <Bouton
                                      type="button"
                                      variante="fantome"
                                      taille="icone"
                                      aria-label={t("etudiants.modifier")}
                                      title={t("etudiants.modifier")}
                                      onClick={() => ouvrirModification(etudiant)}
                                    >
                                      <Pencil />
                                    </Bouton>
                                    <Bouton
                                      type="button"
                                      variante="fantome"
                                      taille="icone"
                                      aria-label={t(etudiant.statut === "inactif" ? "etudiants.reactiver" : "etudiants.desactiver")}
                                      title={t(etudiant.statut === "inactif" ? "etudiants.reactiver" : "etudiants.desactiver")}
                                      onClick={() => setADesactiver(etudiant)}
                                    >
                                      {etudiant.statut === "inactif" ? <Check /> : <Archive />}
                                    </Bouton>
                                  </div>
                                </TableauCellule>
                              )}
                            </TableauLigne>
                          ))}
                        </TableauCorps>
                      </Tableau>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modale
        ouvert={!!aModifier}
        titre={t("etudiants.modifier")}
        sousTitre={aModifier ? `${aModifier.prenom} ${aModifier.nom}` : undefined}
        onFermer={() => !enCours && setAModifier(null)}
      >
        {aModifier && (
          <form onSubmit={enregistrerModification} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Etiquette htmlFor="edit-prenom">{t("etudiants.prenom")}</Etiquette>
                <Saisie
                  id="edit-prenom"
                  required
                  minLength={2}
                  value={aModifier.prenom}
                  onChange={(e) => setAModifier({ ...aModifier, prenom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Etiquette htmlFor="edit-nom">{t("etudiants.nom")}</Etiquette>
                <Saisie
                  id="edit-nom"
                  required
                  minLength={2}
                  value={aModifier.nom}
                  onChange={(e) => setAModifier({ ...aModifier, nom: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Etiquette htmlFor="edit-faculte">{t("etudiants.faculte")}</Etiquette>
              <Selecteur
                id="edit-faculte"
                className="w-full"
                required
                value={aModifier.faculteId}
                onChange={(e) => {
                  const faculteId = e.target.value;
                  const premiereFiliere = filieres.find((f) => f.faculte_id === faculteId);
                  setAModifier({
                    ...aModifier,
                    faculteId,
                    filiereId: premiereFiliere?.id ?? "",
                  });
                }}
              >
                <option value="">{t("etudiants.selectionnerFaculte")}</option>
                {facultes.map((faculte) => (
                  <option key={faculte.id} value={faculte.id}>
                    {faculte.code} — {faculte.nom}
                  </option>
                ))}
              </Selecteur>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Etiquette htmlFor="edit-filiere">{t("etudiants.filiere")}</Etiquette>
                <Selecteur
                  id="edit-filiere"
                  className="w-full"
                  required
                  value={aModifier.filiereId}
                  onChange={(e) => setAModifier({ ...aModifier, filiereId: e.target.value })}
                >
                  <option value="">{t("etudiants.selectionnerFiliere")}</option>
                  {filieres
                    .filter((filiere) => filiere.faculte_id === aModifier.faculteId)
                    .map((filiere) => (
                      <option key={filiere.id} value={filiere.id}>
                        {filiere.nom}
                      </option>
                    ))}
                </Selecteur>
              </div>
              <div className="space-y-2">
                <Etiquette htmlFor="edit-niveau">{t("etudiants.niveau")}</Etiquette>
                <Selecteur
                  id="edit-niveau"
                  className="w-full"
                  value={aModifier.niveau}
                  onChange={(e) =>
                    setAModifier({ ...aModifier, niveau: e.target.value as TypeNiveau })
                  }
                >
                  {NIVEAUX.map((niveau) => <option key={niveau}>{niveau}</option>)}
                </Selecteur>
              </div>
            </div>
            <div className="space-y-2">
              <Etiquette htmlFor="edit-statut">{t("etudiants.statut")}</Etiquette>
              <Selecteur
                id="edit-statut"
                className="w-full"
                value={aModifier.statut}
                onChange={(e) =>
                  setAModifier({ ...aModifier, statut: e.target.value as TypeStatut })
                }
              >
                {(["actif", "inactif", "suspendu", "diplome", "rejete", "en_attente"] as const).map((statut) => (
                  <option key={statut} value={statut}>
                    {t(`statuts.${statut}` as never)}
                  </option>
                ))}
              </Selecteur>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Bouton type="button" variante="contour" disabled={enCours} onClick={() => setAModifier(null)}>
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
        ouvert={!!aDesactiver}
        titre={t(aDesactiver?.statut === "inactif" ? "etudiants.confirmerReactivation" : "etudiants.confirmerDesactivation")}
        sousTitre={aDesactiver ? `${aDesactiver.openlu_profils?.prenom ?? ""} ${aDesactiver.openlu_profils?.nom ?? ""}` : undefined}
        onFermer={() => !enCours && setADesactiver(null)}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t(aDesactiver?.statut === "inactif" ? "etudiants.aideReactivation" : "etudiants.aideDesactivation")}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton type="button" variante="contour" disabled={enCours} onClick={() => setADesactiver(null)}>
            {t("commun.annuler")}
          </Bouton>
          <Bouton type="button" disabled={enCours} aria-busy={enCours} onClick={confirmerChangementStatut}>
            {enCours ? t("commun.chargement") : t(aDesactiver?.statut === "inactif" ? "etudiants.reactiver" : "etudiants.desactiver")}
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}
