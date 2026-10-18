"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  changerStatutInscription,
  creerInscription,
  supprimerInscription,
} from "@/actions/inscriptions";
import { ChampSelecteur, ChampZoneTexte } from "@/composants/partages/champ-formulaire";
import { Modale } from "@/composants/partages/modale";
import { SelecteurRecherche } from "@/composants/partages/selecteur-recherche";
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
import type {
  AnneeAcademique,
  Domaine,
  Etudiant,
  Faculte,
  Inscription,
  Promotion,
} from "@/types/base";

type LigneInscription = Inscription & {
  etudiant: string;
  annee: string;
  filiere: string;
};

export function GestionInscriptions({
  inscriptions,
  etudiants,
  annees,
  facultes,
  domaines,
  promotions,
  anneeActiveId,
}: {
  inscriptions: LigneInscription[];
  etudiants: Pick<Etudiant, "id" | "matricule" | "nom" | "postnom" | "prenom">[];
  annees: AnneeAcademique[];
  facultes: Faculte[];
  domaines: Domaine[];
  promotions: Promotion[];
  anneeActiveId: number | null;
}) {
  const t = useTranslations();
  const toasts = useToast();
  const { confirmer } = useConfirmation();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);

  function changerStatut(id: number, statut: Inscription["statut"]) {
    demarrer(async () => {
      const r = await changerStatutInscription(id, statut);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("inscriptions.statutMaj"));
    });
  }

  async function supprimer(i: LigneInscription) {
    const ok = await confirmer({
      titre: t("commun.supprimer"),
      message: t("inscriptions.confirmerSuppression", { numero: i.numero_inscription }),
      variante: "destructive",
    });
    if (!ok) return;
    demarrer(async () => {
      const r = await supprimerInscription(i.id);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("inscriptions.supprime"));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Bouton onClick={() => setOuvert(true)} className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20">
          <Plus />
          {t("inscriptions.nouvelle")}
        </Bouton>
      </div>

      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("inscriptions.numero")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("inscriptions.etudiant")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("inscriptions.annee")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("inscriptions.filiere")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("inscriptions.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {inscriptions.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t("inscriptions.vide")}
                </TableauCellule>
              </TableauLigne>
            )}
            {inscriptions.map((i) => (
              <TableauLigne key={i.id}>
                <TableauCellule className="font-mono text-xs">{i.numero_inscription}</TableauCellule>
                <TableauCellule className="font-medium">{i.etudiant}</TableauCellule>
                <TableauCellule className="text-muted-foreground">{i.annee}</TableauCellule>
                <TableauCellule className="text-muted-foreground">{i.filiere}</TableauCellule>
                <TableauCellule>
                  <Insigne variante={i.statut === "VALIDEE" ? "parDefaut" : i.statut === "EN_ATTENTE" ? "secondaire" : "destructif"}>
                    {t(`inscriptions.statuts.${i.statut}` as never)}
                  </Insigne>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {i.statut !== "VALIDEE" && (
                      <button onClick={() => changerStatut(i.id, "VALIDEE")} disabled={enCours} className="grid size-8 place-items-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-500/10 [&_svg]:size-4" aria-label={t("inscriptions.valider")}>
                        <Check />
                      </button>
                    )}
                    {i.statut === "EN_ATTENTE" && (
                      <button onClick={() => changerStatut(i.id, "REFUSEE")} disabled={enCours} className="grid size-8 place-items-center rounded-lg text-amber-600 transition-colors hover:bg-amber-500/10 [&_svg]:size-4" aria-label={t("inscriptions.refuser")}>
                        <X />
                      </button>
                    )}
                    <button onClick={() => supprimer(i)} disabled={enCours} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4" aria-label={t("commun.supprimer")}>
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
        <Modale ouvert titre={t("inscriptions.nouvelle")} onFermer={() => setOuvert(false)}>
          <FormulaireInscription
            etudiants={etudiants}
            annees={annees}
            facultes={facultes}
            domaines={domaines}
            promotions={promotions}
            anneeActiveId={anneeActiveId}
            enCours={enCours}
            onFermer={() => setOuvert(false)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = await creerInscription(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("inscriptions.enregistre"));
                setOuvert(false);
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}

function FormulaireInscription({
  etudiants,
  annees,
  facultes,
  domaines,
  promotions,
  anneeActiveId,
  enCours,
  onFermer,
  onSoumettre,
}: {
  etudiants: Pick<Etudiant, "id" | "matricule" | "nom" | "postnom" | "prenom">[];
  annees: AnneeAcademique[];
  facultes: Faculte[];
  domaines: Domaine[];
  promotions: Promotion[];
  anneeActiveId: number | null;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [etudiantId, setEtudiantId] = useState<string | null>(null);
  const [anneeId, setAnneeId] = useState(String(anneeActiveId ?? annees[0]?.id ?? ""));
  const [faculteId, setFaculteId] = useState("");
  const [domaineId, setDomaineId] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [type, setType] = useState("INITIALE");
  const [observations, setObservations] = useState("");

  const optionsEtudiants = useMemo(
    () =>
      etudiants.map((e) => ({
        valeur: String(e.id),
        libelle: `${e.nom} ${e.prenom}`,
        sousLibelle: e.matricule,
      })),
    [etudiants]
  );

  const domainesFiltres = useMemo(
    () => domaines.filter((d) => String(d.faculte_id) === faculteId),
    [domaines, faculteId]
  );

  const promotionsFiltrees = useMemo(
    () => promotions.filter((p) => String(p.domaine_id) === domaineId),
    [promotions, domaineId]
  );

  const pret = Boolean(etudiantId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({
          etudiant_id: Number(etudiantId),
          annee_academique_id: anneeId ? Number(anneeId) : undefined,
          faculte_id: faculteId ? Number(faculteId) : undefined,
          domaine_id: domaineId ? Number(domaineId) : undefined,
          promotion_id: promotionId ? Number(promotionId) : undefined,
          type_inscription: type,
          observations,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <SelecteurRecherche
          options={optionsEtudiants}
          valeur={etudiantId}
          onChange={setEtudiantId}
          placeholder={t("inscriptions.choisirEtudiant")}
          vide={t("inscriptions.aucunEtudiant")}
        />
      </div>

      <ChampSelecteur label={t("inscriptions.annee")} className="w-full" value={anneeId} onChange={(e) => setAnneeId(e.target.value)} optionnel>
        <option value="">—</option>
        {annees.map((a) => (
          <option key={a.id} value={a.id}>{a.libelle}</option>
        ))}
      </ChampSelecteur>

      <ChampSelecteur
        label={t("academique.faculte")}
        className="w-full"
        value={faculteId}
        onChange={(e) => {
          setFaculteId(e.target.value);
          setDomaineId("");
          setPromotionId("");
        }}
        optionnel
      >
        <option value="">—</option>
        {facultes.map((f) => (
          <option key={f.id} value={f.id}>{f.nom}</option>
        ))}
      </ChampSelecteur>

      <ChampSelecteur
        label={t("academique.domaine")}
        className="w-full"
        value={domaineId}
        onChange={(e) => {
          setDomaineId(e.target.value);
          setPromotionId("");
        }}
        optionnel
      >
        <option value="">—</option>
        {domainesFiltres.map((d) => (
          <option key={d.id} value={d.id}>{d.nom}</option>
        ))}
      </ChampSelecteur>

      <ChampSelecteur label={t("academique.promotion")} className="w-full" value={promotionId} onChange={(e) => setPromotionId(e.target.value)} optionnel>
        <option value="">—</option>
        {promotionsFiltrees.map((p) => (
          <option key={p.id} value={p.id}>{p.nom}</option>
        ))}
      </ChampSelecteur>

      <ChampSelecteur label={t("inscriptions.type")} className="w-full" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="INITIALE">{t("inscriptions.types.INITIALE")}</option>
        <option value="REINSCRIPTION">{t("inscriptions.types.REINSCRIPTION")}</option>
      </ChampSelecteur>

      <ChampZoneTexte label={t("inscriptions.observations")} value={observations} onChange={(e) => setObservations(e.target.value)} optionnel />

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Bouton type="button" variante="contour" onClick={onFermer}>
          {t("commun.annuler")}
        </Bouton>
        <Bouton type="submit" disabled={enCours || !pret}>
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("commun.sauvegarder")}
        </Bouton>
      </div>
    </form>
  );
}
