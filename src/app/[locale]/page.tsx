import { getLocale } from "next-intl/server";
import { connection } from "next/server";

import { obtenirSession } from "@/bibliotheque/supabase/session";
import { redirect } from "@/i18n/navigation";

export const instant = false;

export default async function PageAccueil() {
  await connection();
  const locale = await getLocale();
  const session = await obtenirSession();
  redirect({
    href: session.utilisateur && session.profil ? "/accueil" : "/connexion",
    locale,
  });
  return null;
}