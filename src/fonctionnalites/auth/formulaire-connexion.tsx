"use client";

import { useMemo, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, LockKeyhole, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { seConnecter } from "@/actions/auth";
import { ChampAuth } from "@/fonctionnalites/auth/champ-auth";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { useToast } from "@/composants/ui/toaster";

type Donnees = { service: string; motDePasse: string };

export function FormulaireConnexion() {
  const t = useTranslations("auth");
  const tGlobal = useTranslations();
  const toasts = useToast();

  const schema = useMemo(
    () =>
      z.object({
        service: z.string().min(1, { message: t("requis") }),
        motDePasse: z.string().min(6, { message: t("motDePasseCourt") }),
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
    defaultValues: { service: "", motDePasse: "" },
  });

  const soumettre = handleSubmit(async (valeurs) => {
    demarrer(async () => {
      const resultat = await seConnecter(valeurs);
      if (resultat.erreur) {
        setError("root", { type: "serveur", message: resultat.erreur });
        toasts.erreur(tGlobal("toasts.erreur"), resultat.erreur);
      }
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
        <Etiquette htmlFor="service">{t("service")}</Etiquette>
        <ChampAuth icone={Building2}>
          <Saisie
            id="service"
            autoComplete="username"
            placeholder={t("servicePlaceholder")}
            aria-invalid={!!errors.service}
            className="h-11 rounded-xl pl-11"
            {...register("service")}
          />
        </ChampAuth>
        {errors.service && (
          <p className="text-sm text-destructive">{errors.service.message}</p>
        )}
        {!errors.service && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("serviceAideConnexion")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Etiquette htmlFor="motDePasse">{t("motDePasse")}</Etiquette>
        <ChampAuth icone={LockKeyhole}>
          <Saisie
            id="motDePasse"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.motDePasse}
            className="h-11 rounded-xl pl-11"
            {...register("motDePasse")}
          />
        </ChampAuth>
        {errors.motDePasse && (
          <p className="text-sm text-destructive">
            {errors.motDePasse.message}
          </p>
        )}
        {!errors.motDePasse && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("motDePasseAideConnexion")}
          </p>
        )}
      </div>

      <Bouton
        type="submit"
        disabled={enCours}
        aria-busy={enCours}
        className="degrade-brand mt-1 h-11 w-full rounded-xl border-0 text-white shadow-lg shadow-brand-1/20 hover:opacity-90 hover:brightness-105"
      >
        {enCours && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        <span>{enCours ? t("enCours") : t("seConnecter")}</span>
      </Bouton>
    </form>
  );
}
