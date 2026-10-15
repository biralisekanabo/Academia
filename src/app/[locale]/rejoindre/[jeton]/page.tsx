import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { obtenirSession } from "@/bibliotheque/supabase/session";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { FormulaireRejoindre } from "@/fonctionnalites/cours/formulaire-rejoindre";

export const instant = false;

export default async function PageRejoindre({
  params,
}: {
  params: Promise<{ jeton: string }>;
}) {
  await connection();
  const { jeton } = await params;
  const t = await getTranslations();

  const supabase = await creerClientServeur();
  const { data } = await supabase.rpc("openlu_cours_par_jeton", { p_jeton: jeton });
  const cours = data?.[0];

  if (!cours) notFound();

  const session = await obtenirSession();

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-6 px-4 py-10 sm:px-6">
        <header className="animate-entree flex items-center gap-4">
          <span className="degrade-brand grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg shadow-brand-1/25">
            <GraduationCap className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.16em] text-brand-2">OPENLU</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("rejoindre.titre")}
            </h1>
          </div>
        </header>

        <FormulaireRejoindre
          jeton={jeton}
          cours={cours}
          connecte={Boolean(session.utilisateur)}
          role={session.profil?.role ?? null}
        />
      </div>
    </main>
  );
}
