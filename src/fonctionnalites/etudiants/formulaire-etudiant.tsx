"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { inscrireEtudiant } from "@/actions/etudiants";
import { SelecteurRecherche, type OptionRecherche } from "@/composants/partages/selecteur-recherche";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { useToast } from "@/composants/ui/toaster";
import { useRouter } from "@/i18n/navigation";
import { schemaEtudiant } from "@/schemas/etudiant";

const NIVEAUX = ["L1", "L2", "L3", "M1", "M2"] as const;

type Champs = {
  prenom: string;
  nom: string;
  email: string;
  faculteId: string;
  filiereId: string;
  niveau: string;
  anneeUniversitaire: string;
};

const INITIAL: Champs = {
  prenom: "",
  nom: "",
  email: "",
  faculteId: "",
  filiereId: "",
  niveau: "L1",
  anneeUniversitaire: "2026-2027",
};

export function FormulaireEtudiant({
  facultes,
  filieres,
}: {
  facultes: OptionRecherche[];
  filieres: OptionRecherche[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [champs, setChamps] = useState<Champs>(INITIAL);
  const [erreurs, setErreurs] = useState<Partial<Record<keyof Champs, string>>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const filieresFaculte = filieres.filter((f) => f.groupe === champs.faculteId);

  const definir = <K extends keyof Champs>(cle: K, valeur: Champs[K]) => {
    setChamps((c) => ({ ...c, [cle]: valeur }));
    setErreurs((e) => ({ ...e, [cle]: undefined }));
  };

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    const resultat = schemaEtudiant.safeParse({
      prenom: champs.prenom,
      nom: champs.nom,
      email: champs.email,
      filiereId: champs.filiereId,
      niveau: champs.niveau,
      anneeUniversitaire: champs.anneeUniversitaire,
    });

    if (!resultat.success) {
      const issues = resultat.error.issues;
      const nouvelles: Partial<Record<keyof Champs, string>> = {};
      for (const p of issues) {
        const chemin = p.path[0] as keyof Champs;
        if (chemin in champs) nouvelles[chemin] = p.message;
      }
      setErreurs(nouvelles);
      toasts.erreur(t("toasts.erreur"), t("commun.erreurFormulaire"));
      return;
    }

    setEnvoi(true);
    const { erreur: err, matricule: mat } = await inscrireEtudiant(resultat.data);
    setEnvoi(false);

    if (err) {
      setErreur(err);
      toasts.erreur(t("toasts.erreur"), err);
      return;
    }

    toasts.succes(
      t("toasts.etudiantCree"),
      t("toasts.etudiantCreeDesc", { matricule: mat ?? "" })
    );
    router.push("/etudiants");
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
          <h2 className="text-lg font-semibold">{t("etudiants.nouveau")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("etudiants.sousTitre")}
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
          <Etiquette>{t("etudiants.prenom")}</Etiquette>
          <Saisie
            value={champs.prenom}
            onChange={(e) => definir("prenom", e.target.value)}
            placeholder={t("etudiants.prenom")}
          />
          {erreurs.prenom && (
            <p className="text-xs text-destructive">{erreurs.prenom}</p>
          )}
        </div>

        <div className="space-y-2">
          <Etiquette>{t("etudiants.nom")}</Etiquette>
          <Saisie
            value={champs.nom}
            onChange={(e) => definir("nom", e.target.value)}
            placeholder={t("etudiants.nom")}
          />
          {erreurs.nom && <p className="text-xs text-destructive">{erreurs.nom}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Etiquette>{t("etudiants.email")}</Etiquette>
        <Saisie
          type="email"
          value={champs.email}
          onChange={(e) => definir("email", e.target.value)}
          placeholder="nom@exemple.org"
        />
        {erreurs.email && <p className="text-xs text-destructive">{erreurs.email}</p>}
      </div>

      <div className="space-y-2">
        <Etiquette>{t("etudiants.faculte")}</Etiquette>
        <SelecteurRecherche
          options={facultes}
          valeur={champs.faculteId || null}
          onChange={(v) => {
            definir("faculteId", v);
            definir("filiereId", "");
          }}
          placeholder={t("etudiants.selectionnerFaculte")}
          vide={t("commun.aucunResultat")}
        />
        {erreurs.faculteId && (
          <p className="text-xs text-destructive">{erreurs.faculteId}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Etiquette>{t("etudiants.filiere")}</Etiquette>
          <SelecteurRecherche
            options={filieresFaculte}
            valeur={champs.filiereId || null}
            onChange={(v) => definir("filiereId", v)}
            placeholder={champs.faculteId ? t("etudiants.selectionnerFiliere") : "…"}
            vide={t("commun.aucunResultat")}
            className={champs.faculteId ? "" : "pointer-events-none opacity-50"}
          />
          {erreurs.filiereId && (
            <p className="text-xs text-destructive">{erreurs.filiereId}</p>
          )}
        </div>

        <div className="space-y-2">
          <Etiquette>{t("etudiants.niveau")}</Etiquette>
          <Selecteur
            value={champs.niveau}
            onChange={(e) => definir("niveau", e.target.value)}
          >
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Selecteur>
        </div>
      </div>

      <div className="border-t pt-5">
        <Bouton type="submit" className="w-full sm:w-auto" disabled={envoi} aria-busy={envoi}>
          {envoi ? t("auth.enCours") : t("etudiants.nouveau")}
        </Bouton>
      </div>
    </form>
  );
}