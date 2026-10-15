"use client";

import { useState } from "react";
import { BookOpen, LogIn, ShieldAlert, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { rejoindreClasse, rejoindreEnTantQueConnecte } from "@/actions/rejoindre";
import { InvitationApp } from "@/composants/partages/invitation-app";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Insigne } from "@/composants/ui/insigne";
import { Saisie } from "@/composants/ui/saisie";
import { useToast } from "@/composants/ui/toaster";
import { useRouter } from "@/i18n/navigation";
import type { CoursParJeton, TypeRole } from "@/types/database";

type Champs = {
  prenom: string;
  nom: string;
  service: string;
  matricule: string;
  motDePasse: string;
};

export function FormulaireRejoindre({
  jeton,
  cours,
  connecte,
  role,
}: {
  jeton: string;
  cours: CoursParJeton;
  connecte: boolean;
  role: TypeRole | null;
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [valeurs, setValeurs] = useState<Champs>({
    prenom: "",
    nom: "",
    service: "",
    matricule: "",
    motDePasse: "",
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const estEtudiant = role === "etudiant";

  function maj(champ: keyof Champs, valeur: string) {
    setValeurs((prec) => ({ ...prec, [champ]: valeur }));
  }

  async function soumettre(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (envoi) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const resultat = await rejoindreClasse({ jeton, ...valeurs });
      if (resultat.erreur || !resultat.coursId) {
        setErreur(resultat.erreur ?? t("commun.erreurFormulaire"));
        return;
      }
      toasts.succes(t("rejoindre.reussite"));
      router.push(`/cours/${resultat.coursId}`);
    } catch {
      setErreur(t("commun.erreurFormulaire"));
    } finally {
      setEnvoi(false);
    }
  }

  async function rejoindreConnecte() {
    if (envoi) return;
    setErreur(null);
    setEnvoi(true);
    try {
      const resultat = await rejoindreEnTantQueConnecte(jeton);
      if (resultat.erreur || !resultat.coursId) {
        setErreur(resultat.erreur ?? t("commun.erreurFormulaire"));
        return;
      }
      toasts.succes(t("rejoindre.reussite"));
      router.push(`/cours/${resultat.coursId}`);
    } catch {
      setErreur(t("commun.erreurFormulaire"));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="carte-vitrine animate-entree rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="degrade-brand grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-md shadow-brand-1/25">
            <BookOpen className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Insigne variante="secondaire" className="font-mono text-[11px]">
                {cours.code}
              </Insigne>
              {!cours.ouverte && (
                <Insigne variante="contour" className="text-[11px] text-amber-600 dark:text-amber-400">
                  {t("rejoindre.fermee")}
                </Insigne>
              )}
            </div>
            <h2 className="mt-2 text-lg font-semibold">{cours.titre}</h2>
            {cours.description && (
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                {cours.description}
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {t("cours.enseignant")} : {cours.enseignant || t("cours.sansEnseignant")} ·{" "}
              {t("cours.creditsCourt", { valeur: Number(cours.credits) })} ·{" "}
              {t("cours.semestreNumero", { numero: cours.semestre })}
            </p>
          </div>
        </div>
      </section>

      <InvitationApp connecte={connecte} />

      {!cours.ouverte ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-700 dark:text-amber-300">
          {t("rejoindre.inscriptionFermee")}
        </section>
      ) : connecte && !estEtudiant ? (
        <section className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 size-5 shrink-0" />
          <p>{t("rejoindre.reserveEtudiant")}</p>
        </section>
      ) : (
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          {connecte && estEtudiant ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{t("rejoindre.aideConnecte")}</p>
              {erreur && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {erreur}
                </p>
              )}
              <Bouton
                type="button"
                className="h-11 w-full"
                disabled={envoi}
                onClick={() => void rejoindreConnecte()}
              >
                <LogIn />
                {envoi ? t("commun.chargement") : t("rejoindre.boutonRejoindre")}
              </Bouton>
            </div>
          ) : (
            <form onSubmit={soumettre} className="space-y-4" noValidate>
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="size-4 text-brand-2" />
                {t("rejoindre.identite")}
              </div>

              {erreur && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {erreur}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Etiquette htmlFor="rejoindre-prenom">{t("etudiants.prenom")}</Etiquette>
                  <Saisie
                    id="rejoindre-prenom"
                    required
                    autoComplete="given-name"
                    value={valeurs.prenom}
                    onChange={(e) => maj("prenom", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Etiquette htmlFor="rejoindre-nom">{t("etudiants.nom")}</Etiquette>
                  <Saisie
                    id="rejoindre-nom"
                    required
                    autoComplete="family-name"
                    value={valeurs.nom}
                    onChange={(e) => maj("nom", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Etiquette htmlFor="rejoindre-matricule">
                  {t("etudiants.matricule")}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({t("finances.optionnel")})
                  </span>
                </Etiquette>
                <Saisie
                  id="rejoindre-matricule"
                  value={valeurs.matricule}
                  onChange={(e) => maj("matricule", e.target.value)}
                  placeholder={t("rejoindre.matriculePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Etiquette htmlFor="rejoindre-service">{t("auth.service")}</Etiquette>
                <Saisie
                  id="rejoindre-service"
                  required
                  autoComplete="username"
                  value={valeurs.service}
                  onChange={(e) => maj("service", e.target.value)}
                  placeholder={t("rejoindre.servicePlaceholder")}
                />
                <p className="text-xs text-muted-foreground">{t("rejoindre.serviceAide")}</p>
              </div>

              <div className="space-y-2">
                <Etiquette htmlFor="rejoindre-motdepasse">{t("auth.motDePasse")}</Etiquette>
                <Saisie
                  id="rejoindre-motdepasse"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={valeurs.motDePasse}
                  onChange={(e) => maj("motDePasse", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{t("auth.motDePasseAideInscription")}</p>
              </div>

              <Bouton
                type="submit"
                className="degrade-brand h-11 w-full border-0 text-white shadow-lg shadow-brand-1/20"
                disabled={envoi}
              >
                <LogIn />
                {envoi ? t("commun.chargement") : t("rejoindre.boutonRejoindre")}
              </Bouton>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
