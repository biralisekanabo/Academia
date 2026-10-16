import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { lireSession } from "@/bibliotheque/session";
import { initialisationRequise } from "@/actions/initialisation";
import { FormulaireConnexion } from "@/fonctionnalites/auth/formulaire-connexion";
import { DispositionAuth } from "@/fonctionnalites/auth/disposition-auth";
import { Link, redirect } from "@/i18n/navigation";

export default async function PageConnexion() {
  await connection();
  const t = await getTranslations("auth");
  const locale = await getLocale();

  const session = await lireSession();
  if (session) {
    redirect({ href: "/accueil", locale });
  }

  const aInitialiser = await initialisationRequise();

  return (
    <DispositionAuth
      titre={t("connexionTitre")}
      sousTitre={t("connexionSousTitre")}
      type="connexion"
      enfants={
        <>
          <FormulaireConnexion />

          {aInitialiser && (
            <p className="text-center text-sm text-muted-foreground">
              {t("premiereUtilisation")}{" "}
              <Link
                href="/initialisation"
                className="lien-anime font-medium text-brand-2 hover:text-brand-3"
              >
                {t("initialiserPlateforme")}
              </Link>
            </p>
          )}
        </>
      }
    ></DispositionAuth>
  );
}
