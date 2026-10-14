"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { inscrireEnseignant } from "@/actions/enseignants";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { useToast } from "@/composants/ui/toaster";
import { useRouter } from "@/i18n/navigation";
import { schemaEnseignant } from "@/schemas/enseignant";

const STATUTS = ["actif", "en_attente", "inactif"] as const;

type Champs = {
  prenom: string;
  nom: string;
  email: string;
  specialite: string;
  statut: string;
  dateEmbauche: string;
};

const INITIAL: Champs = {
  prenom: "",
  nom: "",
  email: "",
  specialite: "",
  statut: "actif",
  dateEmbauche: "",
};

export function FormulaireEnseignant() {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [champs, setChamps] = useState<Champs>(INITIAL);
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Champs, string>>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const definir = <K extends keyof Champs>(cle: K, valeur: Champs[K]) => {
    setChamps((c) => ({ ...c, [cle]: valeur }));
    setErreurs((e) => ({ ...e, [cle]: undefined }));
  };

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    const resultat = schemaEnseignant.safeParse({
      prenom: champs.prenom,
      nom: champs.nom,
      email: champs.email,
      specialite: champs.specialite,
      statut: champs.statut,
      dateEmbauche: champs.dateEmbauche,
    });

    if (!resultat.success) {
      const nouvelles: Partial<Record<keyof Champs, string>> = {};
      for (const p of resultat.error.issues) {
        const chemin = p.path[0] as keyof Champs;
        if (chemin in champs) nouvelles[chemin] = p.message;
      }
      setErreurs(nouvelles);
      toasts.erreur(t("toasts.erreur"), t("commun.erreurFormulaire"));
      return;
    }

    setEnvoi(true);
    const { erreur: err } = await inscrireEnseignant(resultat.data);
    setEnvoi(false);

    if (err) {
      setErreur(err);
      toasts.erreur(t("toasts.erreur"), err);
      return;
    }

    toasts.succes(t("enseignants.inscriptionReussie"));
    router.push("/enseignants");
  }

  return (
    <form
      onSubmit={soumettre}
      className="carte-vitrine max-w-2xl space-y-6 rounded-3xl border bg-card p-6 shadow-xl sm:p-8"
      noValidate
    >
      <div className="flex items-center gap-3">
        <span className="degrade-brand grid size-11 place-items-center rounded-xl text-white shadow-md shadow-brand-1/25">
          <UserPlus className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">{t("enseignants.nouveau")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("enseignants.sousTitre")}
          </p>
        </div>
      </div>

      {erreur && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erreur}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Etiquette>{t("enseignants.prenom")}</Etiquette>
          <Saisie
            value={champs.prenom}
            onChange={(e) => definir("prenom", e.target.value)}
            placeholder={t("enseignants.prenom")}
          />
          {erreurs.prenom && (
            <p className="text-xs text-destructive">{erreurs.prenom}</p>
          )}
        </div>
        <div className="space-y-2">
          <Etiquette>{t("enseignants.nom")}</Etiquette>
          <Saisie
            value={champs.nom}
            onChange={(e) => definir("nom", e.target.value)}
            placeholder={t("enseignants.nom")}
          />
          {erreurs.nom && <p className="text-xs text-destructive">{erreurs.nom}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Etiquette>{t("enseignants.email")}</Etiquette>
        <Saisie
          type="email"
          value={champs.email}
          onChange={(e) => definir("email", e.target.value)}
          placeholder="nom@exemple.org"
        />
        {erreurs.email && <p className="text-xs text-destructive">{erreurs.email}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Etiquette>{t("enseignants.specialite")}</Etiquette>
          <Saisie
            value={champs.specialite}
            onChange={(e) => definir("specialite", e.target.value)}
            placeholder={t("enseignants.specialitePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Etiquette>{t("enseignants.statut")}</Etiquette>
          <Selecteur
            className="w-full"
            value={champs.statut}
            onChange={(e) => definir("statut", e.target.value)}
          >
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {t(`statuts.${s}` as never)}
              </option>
            ))}
          </Selecteur>
        </div>
      </div>

      <div className="space-y-2">
        <Etiquette>
          {t("enseignants.dateEmbauche")}{" "}
          <span className="font-normal text-muted-foreground">
            ({t("finances.optionnel")})
          </span>
        </Etiquette>
        <Saisie
          type="date"
          value={champs.dateEmbauche}
          onChange={(e) => definir("dateEmbauche", e.target.value)}
        />
      </div>

      <p className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        {t("enseignants.noteCompte")}
      </p>

      <div className="border-t pt-5">
        <Bouton type="submit" className="w-full sm:w-auto" disabled={envoi} aria-busy={envoi}>
          {envoi ? t("auth.enCours") : t("enseignants.nouveau")}
        </Bouton>
      </div>
    </form>
  );
}
