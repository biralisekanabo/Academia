"use server";

import { getLocale, getTranslations } from "next-intl/server";

import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";
import { debloquerCompteBloque } from "@/bibliotheque/supabase/comptes";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { redirect } from "@/i18n/navigation";
import type { TypeRole } from "@/types/database";
import {
  emailDepuisService,
  roleDepuisService,
  serviceValide,
} from "@/utilitaires/service";

export type ResultatConnexion = {
  erreur: string | null;
  role?: TypeRole | null;
};

export async function seConnecter(donnees: {
  service: string;
  motDePasse: string;
}): Promise<ResultatConnexion> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth" });

  const supabase = await creerClientServeur();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailDepuisService(donnees.service),
    password: donnees.motDePasse,
  });

  if (error || !data.user) {
    return { erreur: t("erreurIdentifiants") };
  }

  const { data: profil } = await supabase
    .from("openlu_profils")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profil) {
    await supabase.auth.signOut();
    return { erreur: t("profilIntrouvable") };
  }

  return { erreur: null, role: profil.role };
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

  const email = emailDepuisService(donnees.service);
  const role = roleDepuisService(donnees.service);

  // Compte créé via la clé service_role avec email_confirm : les adresses
  // fictives `...@openlu.edu` ne peuvent pas recevoir de mail de
  // confirmation, ce qui bloquait la connexion (« service déjà utilisé »
  // à l'inscription puis service introuvable à la connexion).
  const admin = creerClientAdmin();
  const metadata = { nom: donnees.service.trim(), role };
  const { data: cree, error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: donnees.motDePasse,
    email_confirm: true,
    user_metadata: metadata,
  });

  let idUtilisateur = cree?.user?.id ?? null;

  if (erreurAuth || !idUtilisateur) {
    const deja = /already|existe|registered/i.test(erreurAuth?.message ?? "");

    // Un compte resté non confirmé par l'ancien flux est débloqué au lieu
    // de renvoyer « déjà utilisé » : personne ne peut s'en servir.
    if (deja) {
      idUtilisateur = await debloquerCompteBloque(admin, email, {
        motDePasse: donnees.motDePasse,
        metadata,
      });
    }

    if (!idUtilisateur) {
      return { erreur: deja ? t("serviceDejaUtilise") : t("erreurInscription") };
    }
  }

  // Établit la session (cookie) du nouveau compte pour être connecté
  // immédiatement après l'inscription.
  const supabase = await creerClientServeur();
  const { error: erreurConnexion } = await supabase.auth.signInWithPassword({
    email,
    password: donnees.motDePasse,
  });

  if (erreurConnexion) {
    return { erreur: t("erreurIdentifiants") };
  }

  return { erreur: null, role };
}

export async function seDeconnecter(): Promise<void> {
  const locale = await getLocale();
  const supabase = await creerClientServeur();
  await supabase.auth.signOut();
  redirect({ href: "/", locale });
}
