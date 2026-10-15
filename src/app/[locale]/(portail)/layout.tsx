import { Suspense } from "react";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { EntetePortail } from "@/composants/partages/entete-portail";
import { SidebarPortail } from "@/composants/partages/sidebar-portail";
import { TransitionRoute } from "@/composants/partages/transition-route";

export default function LayoutPortail({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={null}>
        <BarreLateraleConnectee />
      </Suspense>

      <div className="flex min-h-dvh flex-col md:pl-64">
        <Suspense fallback={<div className="h-16 shrink-0" aria-hidden="true" />}>
          <EnteteConnectee />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <Suspense
            fallback={
              <div className="animate-apparition min-h-32" aria-hidden="true" />
            }
          >
            <TransitionRoute>{children}</TransitionRoute>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

async function BarreLateraleConnectee() {
  const profil = await obtenirProfilSousControle();
  return <SidebarPortail role={profil.role} />;
}

async function EnteteConnectee() {
  const profil = await obtenirProfilSousControle();

  return (
    <EntetePortail
      utilisateurId={profil.id}
      prenom={profil.prenom}
      nom={profil.nom}
      role={profil.role}
    />
  );
}