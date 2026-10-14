"use server";

import { getLocale, getTranslations } from "next-intl/server";

import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { redirect } from "@/i18n/navigation";
import {
  emailDepuisService,
  roleDepuisService,
  serviceValide,
} from "@/utilitaires/service";

export type ResultatConnexion = { erreur: string | null };

export async function seConnecter(donnees: {
  service: string;
  motDePasse: string;
}): Promise<ResultatConnexion> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth" });

  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailDepuisService(donnees.service),
    password: donnees.motDePasse,
  });

  if (error) {
    return { erreur: t("erreurIdentifiants") };
  }

  redirect({ href: "/accueil", locale });
  return { erreur: null };
}

export async function sInscrire(donnees: {
  service: string;
  motDePasse: string;
}): Promise<ResultatConnexion> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth" });

  if (!serviceValide(donnees.service)) {
    return { erreur: t("serviceInvalide") };
  }

  const supabase = await creerClientServeur();
  const { data, error } = await supabase.auth.signUp({
    email: emailDepuisService(donnees.service),
    password: donnees.motDePasse,
    options: {
      data: {
        nom: donnees.service.trim(),
        role: roleDepuisService(donnees.service),
      },
    },
  });

  if (error || (data.user && (data.user.identities?.length ?? 0) === 0)) {
    return { erreur: t("serviceDejaUtilise") };
  }

  redirect({ href: "/accueil", locale });
  return { erreur: null };
}

export async function seDeconnecter(): Promise<void> {
  const locale = await getLocale();
  const supabase = await creerClientServeur();
  await supabase.auth.signOut();
  redirect({ href: "/", locale });
}
