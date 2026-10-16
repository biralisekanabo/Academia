import { Suspense } from "react";

import { chargerPermissions, exigerSession } from "@/bibliotheque/autorisation";
import { EntetePortail } from "@/composants/partages/entete-portail";
import { SidebarPortail } from "@/composants/partages/sidebar-portail";
import { SquelettePage } from "@/composants/partages/squelette-page";
import { TransitionRoute } from "@/composants/partages/transition-route";

export default function LayoutPortail({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <Suspense
        fallback={
          <div
            className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl md:block"
            aria-hidden="true"
          />
        }
      >
        <BarreLateraleConnectee />
      </Suspense>

      <div className="flex min-h-dvh flex-col md:pl-64">
        <Suspense
          fallback={
            <div className="h-16 shrink-0 border-b bg-background/80" aria-hidden="true" />
          }
        >
          <EnteteConnectee />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <Suspense fallback={<SquelettePage />}>
            <TransitionRoute>{children}</TransitionRoute>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

async function BarreLateraleConnectee() {
  const session = await exigerSession();
  const permissions = await chargerPermissions(session.utilisateurId);
  return (
    <SidebarPortail roles={session.roles} permissions={[...permissions]} />
  );
}

async function EnteteConnectee() {
  const session = await exigerSession();
  return (
    <EntetePortail nomComplet={session.nomComplet} roles={session.roles} />
  );
}
