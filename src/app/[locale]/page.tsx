import { getLocale } from "next-intl/server";
import { connection } from "next/server";

import { lireSession } from "@/bibliotheque/session";
import { redirect } from "@/i18n/navigation";

export default async function PageAccueil() {
  await connection();
  const locale = await getLocale();
  const session = await lireSession();
  redirect({ href: session ? "/accueil" : "/connexion", locale });
  return null;
}
