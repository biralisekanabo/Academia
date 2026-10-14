"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { creerFrais } from "@/actions/finances";
import { Modale } from "@/composants/partages/modale";
import { SelecteurRecherche, type OptionRecherche } from "@/composants/partages/selecteur-recherche";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { useToast } from "@/composants/ui/toaster";

const NIVEAUX = ["L1", "L2", "L3", "M1", "M2"] as const;
const DEVISES = ["CDF", "USD"] as const;

export function FormulaireFrais({
  ouvert,
  onFermer,
  facultes,
  filieres,
}: {
  ouvert: boolean;
  onFermer: () => void;
  facultes: OptionRecherche[];
  filieres: OptionRecherche[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [faculteId, setFaculteId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [niveau, setNiveau] = useState("L1");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [devise, setDevise] = useState("CDF");
  const [anneeUniversitaire, setAnneeUniversitaire] = useState("2026-2027");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const filieresFaculte = filieres.filter((f) => f.groupe === faculteId);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const { erreur: err } = await creerFrais({
      faculteId,
      filiereId,
      niveau,
      libelle,
      montant: Number(montant),
      devise,
      anneeUniversitaire,
    });

    setEnvoi(false);
    if (err) {
      setErreur(err);
      toasts.erreur(t("toasts.erreur"), err);
      return;
    }

    setFaculteId("");
    setFiliereId("");
    setLibelle("");
    setMontant("");
    onFermer();
    router.refresh();
    toasts.succes(t("toasts.fraisCree"), t("toasts.fraisCreeDesc"));
  }

  return (
    <Modale ouvert={ouvert} onFermer={onFermer} titre={t("finances.nouveauFrais")}>
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        {erreur && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erreur}
          </p>
        )}

        <div className="space-y-2">
          <Etiquette>{t("etudiants.faculte")}</Etiquette>
          <SelecteurRecherche
            options={facultes}
            valeur={faculteId || null}
            onChange={(v) => {
              setFaculteId(v);
              setFiliereId("");
            }}
            placeholder={t("etudiants.selectionnerFaculte")}
            vide={t("commun.aucunResultat")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Etiquette>{t("etudiants.filiere")}</Etiquette>
            <SelecteurRecherche
              options={filieresFaculte}
              valeur={filiereId || null}
              onChange={setFiliereId}
              placeholder={faculteId ? "…" : ""}
              vide={t("commun.aucunResultat")}
              className={faculteId ? "" : "pointer-events-none opacity-50"}
            />
          </div>

          <div className="space-y-2">
            <Etiquette>{t("finances.niveau")}</Etiquette>
            <Selecteur value={niveau} onChange={(e) => setNiveau(e.target.value)}>
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Selecteur>
          </div>
        </div>

        <div className="space-y-2">
          <Etiquette>{t("finances.libelle")}</Etiquette>
          <Saisie
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Inscription S1 2026-2027"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Etiquette>{t("finances.montant")}</Etiquette>
            <Saisie
              type="number"
              min={0}
              step="any"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="250000"
            />
          </div>
          <div className="space-y-2">
            <Etiquette>{t("finances.devise")}</Etiquette>
            <Selecteur value={devise} onChange={(e) => setDevise(e.target.value)}>
              {DEVISES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Selecteur>
          </div>
          <div className="space-y-2">
            <Etiquette>{t("finances.anneeUniversitaire")}</Etiquette>
            <Saisie
              value={anneeUniversitaire}
              onChange={(e) => setAnneeUniversitaire(e.target.value)}
              placeholder="2026-2027"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
          <Bouton type="button" variante="fantome" onClick={onFermer}>
            {t("commun.annuler")}
          </Bouton>
          <Bouton type="submit" className="w-full sm:w-auto" disabled={envoi}>
            {envoi ? t("commun.chargement") : t("commun.sauvegarder")}
          </Bouton>
        </div>
      </form>
    </Modale>
  );
}