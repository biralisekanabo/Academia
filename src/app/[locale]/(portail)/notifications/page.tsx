import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirSession } from "@/bibliotheque/supabase/session";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { EspaceNotifications } from "@/fonctionnalites/notifications/espace-notifications";

export const instant = false;

export default async function PageNotifications() {
  await connection();
  const t = await getTranslations();
  const session = await obtenirSession();

  if (!session.utilisateur) {
    return null;
  }

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={Bell}
        titre={t("notifications.titre")}
        sousTitre={t("notifications.sousTitre")}
      />
      <EspaceNotifications utilisateurId={session.utilisateur.id} />
    </div>
  );
}
