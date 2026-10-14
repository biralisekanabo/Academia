import { connection } from "next/server";

import { Logo } from "@/composants/partages/logo";

export const instant = false;

export default async function PageAccueil() {
  await connection();

  return (
    <div className="relative grid min-h-[70vh] place-items-center overflow-hidden">
      <div className="animate-flotter pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-brand-1/10 blur-3xl" />
      <div className="animate-flotter-lent pointer-events-none absolute -right-24 -bottom-24 size-64 rounded-full bg-brand-3/10 blur-3xl" />

      <div className="animate-apparition relative">
        <Logo taille={196} avecTexte={false} />
      </div>
    </div>
  );
}
