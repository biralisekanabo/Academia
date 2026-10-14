"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { creerTransaction } from "@/actions/finances";
import { Modale } from "@/composants/partages/modale";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { useToast } from "@/composants/ui/toaster";
import { cn } from "@/utilitaires/cn";

const METHODES = ["especes", "mobile_money", "carte_bancaire", "virement", "cheque", "autre"] as const;
const CATEGORIES = [
  "scolarite",
  "salaire",
  "fourniture",
  "loyer",
  "service",
  "subvention",
  "don",
  "maintenance",
  "autre",
] as const;
const DEVISES = ["CDF", "USD"] as const;

function aujourdHui(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FormulaireTransaction({
  ouvert,
  onFermer,
}: {
  ouvert: boolean;
  onFermer: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [type, setType] = useState<"entree" | "sortie">("entree");
  const [categorie, setCategorie] = useState<string>("scolarite");
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [devise, setDevise] = useState<string>("CDF");
  const [methode, setMethode] = useState<string>("especes");
  const [dateTransaction, setDateTransaction] = useState(aujourdHui());
  const [description, setDescription] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  function reinitialiser() {
    setType("entree");
    setCategorie("scolarite");
    setLibelle("");
    setMontant("");
    setDevise("CDF");
    setMethode("especes");
    setDateTransaction(aujourdHui());
    setDescription("");
    setErreur(null);
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const { erreur: err } = await creerTransaction({
      type,
      categorie,
      libelle,
      montant: Number(montant),
      devise,
      methode,
      dateTransaction,
      description,
    });

    setEnvoi(false);
    if (err) {
      setErreur(err);
      toasts.erreur(t("toasts.erreur"), err);
      return;
    }

    onFermer();
    reinitialiser();
    router.refresh();
    toasts.succes(t("finances.operationEnregistree"), t("finances.operationEnregistreeDesc"));
  }

  return (
    <Modale ouvert={ouvert} onFermer={onFermer} titre={t("finances.nouvelleTransaction")}>
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        {erreur && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erreur}
          </p>
        )}

        <div className="space-y-2">
          <Etiquette>{t("finances.typeOperation")}</Etiquette>
          <div className="grid grid-cols-2 gap-2">
            {(["entree", "sortie"] as const).map((cle) => (
              <button
                key={cle}
                type="button"
                onClick={() => setType(cle)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200",
                  type === cle
                    ? cle === "entree"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                {t(`finances.types.${cle}` as never)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Etiquette>{t("finances.categorie")}</Etiquette>
            <Selecteur value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`finances.categories.${c}` as never)}
                </option>
              ))}
            </Selecteur>
          </div>

          <div className="space-y-2">
            <Etiquette>{t("finances.dateOperation")}</Etiquette>
            <Saisie
              type="date"
              value={dateTransaction}
              onChange={(e) => setDateTransaction(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Etiquette>{t("finances.libelle")}</Etiquette>
          <Saisie
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder={t("finances.nouvelleTransaction")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-2">
            <Etiquette>{t("finances.montant")}</Etiquette>
            <Saisie
              type="number"
              min={0}
              step="any"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              placeholder="0"
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
        </div>

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
          <Etiquette>
            {t("finances.description")}{" "}
            <span className="font-normal text-muted-foreground">
              ({t("finances.optionnel")})
            </span>
          </Etiquette>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="flex w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] duration-200 placeholder:text-muted-foreground hover:border-brand-2/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30"
          />
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
