import { getLocale } from "next-intl/server";
import { connection } from "next/server";

import { obtenirSession } from "@/bibliotheque/supabase/session";
import { EntetePortail } from "@/composants/partages/entete-portail";
import { SidebarPortail } from "@/composants/partages/sidebar-portail";
import { TransitionRoute } from "@/composants/partages/transition-route";
import { redirect } from "@/i18n/navigation";

export const instant = false;

export default async function LayoutPortail({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const locale = await getLocale();
  const session = await obtenirSession();

  if (!session.utilisateur || !session.profil) {
    redirect({ href: "/connexion", locale });
    throw new Error("Redirection vers la connexion");
  }

  const { prenom, nom, role } = session.profil;

  return (
    <div className="min-h-dvh">
      <SidebarPortail role={role} />

      <div className="flex min-h-dvh flex-col md:pl-64">
        <EntetePortail prenom={prenom} nom={nom} role={role} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <TransitionRoute>{children}</TransitionRoute>
        </main>
      </div>
    </div>
  );
}