"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { creerEvaluation } from "@/actions/notes";
import { Modale } from "@/composants/partages/modale";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { useToast } from "@/composants/ui/toaster";

const TYPES = ["devoir", "examen", "projet", "partiel"] as const;

export function FormulaireEvaluation({
  ouvert,
  onFermer,
  coursId,
}: {
  ouvert: boolean;
  onFermer: () => void;
  coursId: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [titre, setTitre] = useState("");
  const [type, setType] = useState("devoir");
  const [coefficient, setCoefficient] = useState("1");
  const [bareme, setBareme] = useState("20");
  const [dateEcheance, setDateEcheance] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const { erreur: err } = await creerEvaluation({
      coursId,
      titre,
      type,
      coefficient: Number(coefficient),
      bareme: Number(bareme),
      dateEcheance,
    });

    setEnvoi(false);
    if (err) {
      setErreur(err);
      toasts.erreur(t("toasts.erreur"), err);
      return;
    }

    setTitre("");
    setType("devoir");
    setCoefficient("1");
    setBareme("20");
    setDateEcheance("");
    onFermer();
    router.refresh();
    toasts.succes(t("notes.evaluationCreee"));
  }

  return (
    <Modale ouvert={ouvert} onFermer={onFermer} titre={t("notes.nouvelleEvaluation")}>
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        {erreur && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erreur}
          </p>
        )}

        <div className="space-y-2">
          <Etiquette>{t("notes.evaluation")}</Etiquette>
          <Saisie
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder={t("notes.evaluationPlaceholder")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Etiquette>{t("notes.type")}</Etiquette>
            <Selecteur value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((tp) => (
                <option key={tp} value={tp}>
                  {t(`notes.types.${tp}` as never)}
                </option>
              ))}
            </Selecteur>
          </div>
          <div className="space-y-2">
            <Etiquette>{t("notes.coefficient")}</Etiquette>
            <Saisie
              type="number"
              min={0}
              step="any"
              value={coefficient}
              onChange={(e) => setCoefficient(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Etiquette>{t("notes.bareme")}</Etiquette>
            <Saisie
              type="number"
              min={0}
              step="any"
              value={bareme}
              onChange={(e) => setBareme(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Etiquette>
            {t("notes.dateEcheance")}{" "}
            <span className="font-normal text-muted-foreground">({t("finances.optionnel")})</span>
          </Etiquette>
          <Saisie
            type="date"
            value={dateEcheance}
            onChange={(e) => setDateEcheance(e.target.value)}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
          <Bouton type="button" variante="fantome" onClick={onFermer}>
            {t("commun.annuler")}
          </Bouton>
          <Bouton type="submit" className="w-full sm:w-auto" disabled={envoi}>
            {envoi ? t("commun.chargement") : t("commun.creer")}
          </Bouton>
        </div>
      </form>
    </Modale>
  );
}
