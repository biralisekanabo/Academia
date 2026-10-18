"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { demanderReinitialisation, verifierOtpEtReinitialiser } from "@/actions/mot-de-passe";
import { ChampAuth } from "@/fonctionnalites/auth/champ-auth";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { useToast } from "@/composants/ui/toaster";
import { useRouter } from "@/i18n/navigation";

type DonneesEtape1 = { identifiant: string };
type DonneesEtape2 = { code: string; motDePasse: string; confirmation: string };

export function FormulaireMotDePasseOublie() {
  const t = useTranslations("auth");
  const tGlobal = useTranslations();
  const toasts = useToast();
  const routeur = useRouter();
  const [etape, setEtape] = useState<1 | 2>(1);
  const [identifiant, setIdentifiant] = useState("");
  const [enCours, demarrer] = useTransition();

  const schema1 = z.object({ identifiant: z.string().min(1, { message: t("requis") }) });
  const schema2 = z.object({
    code: z.string().min(1, { message: t("requis") }),
    motDePasse: z.string().min(6, { message: t("motDePasseTropCourt") || t("requis") }),
    confirmation: z.string().min(1, { message: t("requis") }),
  }).refine((d) => d.motDePasse === d.confirmation, {
    message: t("motsDePasseNonIdentiques") || t("erreurIdentifiants"),
    path: ["confirmation"],
  });

  const form1 = useForm<DonneesEtape1>({ resolver: zodResolver(schema1), defaultValues: { identifiant: "" } });
  const form2 = useForm<DonneesEtape2>({ resolver: zodResolver(schema2), defaultValues: { code: "", motDePasse: "", confirmation: "" } });

  const envoyerCode = form1.handleSubmit((v) => {
    demarrer(async () => {
      const r = await demanderReinitialisation(v.identifiant);
      if (!r.ok) {
        toasts.erreur(tGlobal("toasts.erreur"), r.erreur || "");
        return;
      }
      setIdentifiant(v.identifiant);
      toasts.succes(tGlobal("toasts.succes"), t("codeEnvoye"));
      setEtape(2);
    });
  });

  const reinitialiser = form2.handleSubmit((v) => {
    demarrer(async () => {
      const r = await verifierOtpEtReinitialiser({ emailOuIdentifiant: identifiant, code: v.code, motDePasse: v.motDePasse, confirmation: v.confirmation });
      if (!r.ok) {
        toasts.erreur(tGlobal("toasts.erreur"), r.erreur || "");
        return;
      }
      toasts.succes(tGlobal("toasts.succes"), t("motDePasseMisAJour"));
      routeur.push("/connexion");
    });
  });

  if (etape === 1) {
    return (
      <form onSubmit={envoyerCode} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Etiquette htmlFor="identifiant">{t("identifiant")}</Etiquette>
          <ChampAuth icone={AtSign}>
            <Saisie id="identifiant" placeholder={t("identifiantPlaceholder")} {...form1.register("identifiant")} />
          </ChampAuth>
          {form1.formState.errors.identifiant && <p className="text-sm text-destructive">{form1.formState.errors.identifiant.message}</p>}
        </div>
        <Bouton type="submit" disabled={enCours} className="degrade-brand h-11 w-full rounded-xl text-white">
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("envoyerCode")}
        </Bouton>
      </form>
    );
  }

  return (
    <form onSubmit={reinitialiser} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Etiquette htmlFor="code">{t("codeOtp")}</Etiquette>
        <ChampAuth icone={KeyRound}>
          <Saisie id="code" placeholder="000000" {...form2.register("code")} />
        </ChampAuth>
        {form2.formState.errors.code && <p className="text-sm text-destructive">{form2.formState.errors.code.message}</p>}
      </div>
      <div className="space-y-2">
        <Etiquette htmlFor="motDePasse">{t("nouveauMotDePasse")}</Etiquette>
        <ChampAuth icone={LockKeyhole}>
          <Saisie id="motDePasse" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" {...form2.register("motDePasse")} />
        </ChampAuth>
        {form2.formState.errors.motDePasse && <p className="text-sm text-destructive">{form2.formState.errors.motDePasse.message}</p>}
      </div>
      <div className="space-y-2">
        <Etiquette htmlFor="confirmation">{t("confirmerMotDePasse")}</Etiquette>
        <ChampAuth icone={LockKeyhole}>
          <Saisie id="confirmation" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" {...form2.register("confirmation")} />
        </ChampAuth>
        {form2.formState.errors.confirmation && <p className="text-sm text-destructive">{form2.formState.errors.confirmation.message}</p>}
      </div>
      <Bouton type="submit" disabled={enCours} className="degrade-brand h-11 w-full rounded-xl text-white">
        {enCours && <LoaderCircle className="animate-spin" />}
        {t("reinitialiser")}
      </Bouton>
    </form>
  );
}

