import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirSession } from "@/bibliotheque/supabase/session";
import { FormulaireConnexion } from "@/fonctionnalites/auth/formulaire-connexion";
import { DispositionAuth } from "@/fonctionnalites/auth/disposition-auth";
import { Link, redirect } from "@/i18n/navigation";

export default async function PageConnexion() {
  await connection();
  const t = await getTranslations("auth");
  const locale = await getLocale();

  const session = await obtenirSession();
  if (session.utilisateur && session.profil) {
    redirect({ href: "/accueil", locale });
  }

  return (
    <DispositionAuth
      titre={t("connexionTitre")}
      sousTitre={t("connexionSousTitre")}
      type="connexion"
      enfants={<>
      <FormulaireConnexion />

      <p className="text-center text-sm text-muted-foreground">
        {t("pasDeCompte")}{" "}
        <Link
          href="/inscription"
          className="lien-anime font-medium text-brand-2 hover:text-brand-3"
        >
          {t("creerUnCompte")}
        </Link>
      </p>
      </>}
    >
    </DispositionAuth>
  );
}
