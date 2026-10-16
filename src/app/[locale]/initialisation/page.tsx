import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { initialisationRequise } from "@/actions/initialisation";
import { FormulaireInitialisation } from "@/fonctionnalites/auth/formulaire-initialisation";
import { DispositionAuth } from "@/fonctionnalites/auth/disposition-auth";
import { redirect } from "@/i18n/navigation";

export default async function PageInitialisation() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations("auth");

  if (!(await initialisationRequise())) {
    redirect({ href: "/connexion", locale });
  }

  return (
    <DispositionAuth
      titre={t("initialisationTitre")}
      sousTitre={t("initialisationSousTitre")}
      type="initialisation"
      enfants={<FormulaireInitialisation />}
    ></DispositionAuth>
  );
}
