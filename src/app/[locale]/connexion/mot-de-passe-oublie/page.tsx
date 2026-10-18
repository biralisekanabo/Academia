import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { redirect } from "@/i18n/navigation";
import { lireSession } from "@/bibliotheque/session";
import { DispositionAuth } from "@/fonctionnalites/auth/disposition-auth";
import { FormulaireMotDePasseOublie } from "@/fonctionnalites/auth/formulaire-mot-de-passe-oublie";

export default async function PageMotDePasseOublie() {
  await connection();
  const t = await getTranslations("auth");
  const locale = await getLocale();
  const session = await lireSession();
  if (session) {
    redirect({ href: "/accueil", locale });
  }
  return (
    <DispositionAuth
      titre={t("motDePasseOublie")}
      sousTitre={t("saisirIdentifiantPourCode")}
      type="connexion"
      enfants={<FormulaireMotDePasseOublie />}
    />
  );
}