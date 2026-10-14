"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { payerEnseignant } from "@/actions/finances";
import { Modale } from "@/composants/partages/modale";
import { SelecteurRecherche, type OptionRecherche } from "@/composants/partages/selecteur-recherche";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { useToast } from "@/composants/ui/toaster";

const METHODES = ["especes", "mobile_money", "carte_bancaire", "virement", "cheque", "autre"] as const;
const STATUTS = ["en_attente", "valide", "echoue", "rembourse"] as const;

export function FormulaireSalaire({
  ouvert,
  onFermer,
  enseignants,
}: {
  ouvert: boolean;
  onFermer: () => void;
  enseignants: OptionRecherche[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [enseignantId, setEnseignantId] = useState("");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [mois, setMois] = useState("");
  const [methode, setMethode] = useState("virement");
  const [statut, setStatut] = useState("en_attente");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const { erreur: err } = await payerEnseignant({
      enseignantId,
      libelle,
      montant: Number(montant),
      mois,
      methode,
      statut,
    });

    setEnvoi(false);
    if (err) {
      setErreur(err);
      toasts.erreur(t("toasts.erreur"), err);
      return;
    }

    setEnseignantId("");
    setLibelle("");
    setMontant("");
    setMois("");
    onFermer();
    router.refresh();
    toasts.succes(t("toasts.salaireEnregistre"), t("toasts.salaireEnregistreDesc"));
  }

  return (
    <Modale ouvert={ouvert} onFermer={onFermer} titre={t("finances.nouveauSalaire")}>
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        {erreur && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erreur}
          </p>
        )}

        <div className="space-y-2">
          <Etiquette>{t("finances.enseignant")}</Etiquette>
          <SelecteurRecherche
            options={enseignants}
            valeur={enseignantId || null}
            onChange={setEnseignantId}
            placeholder={t("finances.rechercherEnseignant")}
            vide={t("commun.aucunResultat")}
          />
        </div>

        <div className="space-y-2">
          <Etiquette>{t("finances.libelle")}</Etiquette>
          <Saisie
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Salaire mensuel"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Etiquette>{t("finances.montant")}</Etiquette>
            <Saisie
              type="number"
              min={0}
              step="1"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="150000"
            />
          </div>

          <div className="space-y-2">
            <Etiquette>{t("finances.mois")}</Etiquette>
            <Saisie type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Etiquette>{t("finances.methode")}</Etiquette>
            <Selecteur value={methode} onChange={(e) => setMethode(e.target.value)}>
              {METHODES.map((m) => (
                <option key={m} value={m}>
                  {t(`finances.methodes.${m}` as never)}
                </option>
              ))}
            </Selecteur>
          </div>

          <div className="space-y-2">
            <Etiquette>{t("finances.statut")}</Etiquette>
            <Selecteur value={statut} onChange={(e) => setStatut(e.target.value)}>
              {STATUTS.map((s) => (
                <option key={s} value={s}>
                  {t(`finances.statuts.${s}` as never)}
                </option>
              ))}
            </Selecteur>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
          <Bouton type="button" variante="fantome" onClick={onFermer}>
            {t("commun.annuler")}
          </Bouton>
          <Bouton type="submit" className="w-full sm:w-auto" disabled={envoi}>
            {envoi ? t("commun.chargement") : t("finances.payer")}
          </Bouton>
        </div>
      </form>
    </Modale>
  );
}