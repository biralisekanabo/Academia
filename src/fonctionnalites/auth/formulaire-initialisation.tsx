"use client";

import { useMemo, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, LockKeyhole, User, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { creerSuperAdminInitial } from "@/actions/initialisation";
import { ChampAuth } from "@/fonctionnalites/auth/champ-auth";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { useToast } from "@/composants/ui/toaster";
import { useRouter } from "@/i18n/navigation";

type Donnees = { nomComplet: string; nomUtilisateur: string; motDePasse: string };

export function FormulaireInitialisation() {
  const t = useTranslations("auth");
  const tGlobal = useTranslations();
  const toasts = useToast();
  const routeur = useRouter();

  const schema = useMemo(
    () =>
      z.object({
        nomComplet: z.string().min(3, { message: t("requis") }),
        nomUtilisateur: z.string().min(3, { message: t("requis") }),
        motDePasse: z.string().min(8, { message: t("motDePasseCourt") }),
      }),
    [t]
  );

  const [enCours, demarrer] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Donnees>({
    resolver: zodResolver(schema),
    defaultValues: { nomComplet: "", nomUtilisateur: "", motDePasse: "" },
  });

  const soumettre = handleSubmit((valeurs) => {
    demarrer(async () => {
      const resultat = await creerSuperAdminInitial(valeurs);
      if (resultat.erreur) {
        setError("root", { type: "serveur", message: resultat.erreur });
        toasts.erreur(tGlobal("toasts.erreur"), resultat.erreur);
        return;
      }
      toasts.succes(tGlobal("toasts.succes"), t("initReussie"));
      routeur.push("/connexion");
    });
  });

  return (
    <form onSubmit={soumettre} className="space-y-5" noValidate>
      {errors.root && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {errors.root.message}
        </p>
      )}

      <div className="space-y-2">
        <Etiquette htmlFor="nomComplet">{t("nom")}</Etiquette>
        <ChampAuth icone={UserCheck}>
          <Saisie
            id="nomComplet"
            autoComplete="name"
            aria-invalid={!!errors.nomComplet}
            className="h-11 rounded-xl pl-11"
            {...register("nomComplet")}
          />
        </ChampAuth>
        {errors.nomComplet && (
          <p className="text-sm text-destructive">{errors.nomComplet.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Etiquette htmlFor="nomUtilisateur">{t("identifiant")}</Etiquette>
        <ChampAuth icone={User}>
          <Saisie
            id="nomUtilisateur"
            autoComplete="username"
            aria-invalid={!!errors.nomUtilisateur}
            className="h-11 rounded-xl pl-11"
            {...register("nomUtilisateur")}
          />
        </ChampAuth>
        {errors.nomUtilisateur && (
          <p className="text-sm text-destructive">
            {errors.nomUtilisateur.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Etiquette htmlFor="motDePasse">{t("motDePasse")}</Etiquette>
        <ChampAuth icone={LockKeyhole}>
          <Saisie
            id="motDePasse"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.motDePasse}
            className="h-11 rounded-xl pl-11"
            {...register("motDePasse")}
          />
        </ChampAuth>
        {errors.motDePasse && (
          <p className="text-sm text-destructive">{errors.motDePasse.message}</p>
        )}
      </div>

      <Bouton
        type="submit"
        disabled={enCours}
        aria-busy={enCours}
        className="degrade-brand mt-1 h-11 w-full rounded-xl border-0 text-white shadow-lg shadow-brand-1/20 hover:opacity-90 hover:brightness-105"
      >
        {enCours && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        <span>{enCours ? t("enCours") : t("initialiserPlateforme")}</span>
      </Bouton>
    </form>
  );
}
