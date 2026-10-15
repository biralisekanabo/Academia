import { connection } from "next/server";

import { Logo } from "@/composants/partages/logo";

export default async function PageAccueil() {
  await connection();

  return (
    <div className="relative grid min-h-[calc(100dvh-7rem)] place-items-center overflow-hidden">
      <div className="animate-flotter pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-brand-1/10 blur-3xl" />
      <div className="animate-flotter-lent pointer-events-none absolute -right-24 -bottom-24 size-64 rounded-full bg-brand-3/10 blur-3xl" />

      <div className="animate-apparition relative">
        <Logo taille={132} avecTexte={false} className="sm:hidden" />
        <Logo taille={196} avecTexte={false} className="hidden sm:flex" />
      </div>
    </div>
  );
}
