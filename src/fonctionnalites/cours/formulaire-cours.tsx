"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { creerCours } from "@/actions/cours";
import { Modale } from "@/composants/partages/modale";
import type { OptionRecherche } from "@/composants/partages/selecteur-recherche";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { ZoneTexte } from "@/composants/ui/zone-texte";
import { useToast } from "@/composants/ui/toaster";

export function FormulaireCours({
  ouvert,
  onFermer,
  peutAssigner,
  enseignants,
}: {
  ouvert: boolean;
  onFermer: () => void;
  peutAssigner: boolean;
  enseignants: OptionRecherche[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [code, setCode] = useState("");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [credits, setCredits] = useState("3");
  const [semestre, setSemestre] = useState("1");
  const [enseignantId, setEnseignantId] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const { erreur: err } = await creerCours({
      code,
      titre,
      description,
      credits: Number(credits),
      semestre: Number(semestre),
      enseignantId: peutAssigner ? enseignantId : undefined,
    });

    setEnvoi(false);
    if (err) {
      setErreur(err);
      toasts.erreur(t("toasts.erreur"), err);
      return;
    }

    setCode("");
    setTitre("");
    setDescription("");
    setCredits("3");
    setSemestre("1");
    setEnseignantId("");
    onFermer();
    router.refresh();
    toasts.succes(t("cours.creationReussie"));
  }

  return (
    <Modale ouvert={ouvert} onFermer={onFermer} titre={t("cours.nouveau")}>
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        {erreur && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erreur}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <div className="space-y-2">
            <Etiquette>{t("cours.code")}</Etiquette>
            <Saisie
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="INF101"
            />
          </div>
          <div className="space-y-2">
            <Etiquette>{t("cours.intitule")}</Etiquette>
            <Saisie
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder={t("cours.intitulePlaceholder")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Etiquette>
            {t("cours.description")}{" "}
            <span className="font-normal text-muted-foreground">({t("finances.optionnel")})</span>
          </Etiquette>
          <ZoneTexte
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("cours.descriptionPlaceholder")}
            rows={3}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Etiquette>{t("cours.credits")}</Etiquette>
            <Saisie
              type="number"
              min={1}
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Etiquette>{t("cours.semestre")}</Etiquette>
            <Selecteur
              className="w-full"
              value={semestre}
              onChange={(e) => setSemestre(e.target.value)}
            >
              {Array.from({ length: 8 }, (_, i) => i + 1).map((s) => (
                <option key={s} value={s}>
                  {t("cours.semestreNumero", { numero: s })}
                </option>
              ))}
            </Selecteur>
          </div>
        </div>

        {peutAssigner && (
          <div className="space-y-2">
            <Etiquette>
              {t("cours.choisirEnseignant")}{" "}
              <span className="font-normal text-muted-foreground">({t("finances.optionnel")})</span>
            </Etiquette>
            <Selecteur
              className="w-full"
              value={enseignantId}
              onChange={(e) => setEnseignantId(e.target.value)}
            >
              <option value="">{t("cours.nonAssigne")}</option>
              {enseignants.map((en) => (
                <option key={en.valeur} value={en.valeur}>
                  {en.libelle}
                </option>
              ))}
            </Selecteur>
          </div>
        )}

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
