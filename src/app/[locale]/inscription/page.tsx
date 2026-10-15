import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirSession } from "@/bibliotheque/supabase/session";
import { FormulaireInscription } from "@/fonctionnalites/auth/formulaire-inscription";
import { DispositionAuth } from "@/fonctionnalites/auth/disposition-auth";
import { Link, redirect } from "@/i18n/navigation";

export const instant = false;

export default async function PageInscription() {
  await connection();
  const t = await getTranslations("auth");
  const locale = await getLocale();

  const session = await obtenirSession();
  if (session.utilisateur && session.profil) {
    redirect({ href: "/accueil", locale });
  }

  return (
    <DispositionAuth
      titre={t("inscriptionTitre")}
      sousTitre={t("inscriptionSousTitre")}
      type="inscription"
      enfants={<>
      <FormulaireInscription />

      <p className="text-center text-sm text-muted-foreground">
        {t("dejaUnCompte")}{" "}
        <Link
          href="/connexion"
          className="lien-anime font-medium text-brand-2 hover:text-brand-3"
        >
          {t("connexionLien")}
        </Link>
      </p>
      </>}
    >
    </DispositionAuth>
  );
}