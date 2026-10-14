"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { seDeconnecter } from "@/actions/auth";
import { BasculerTheme } from "@/composants/partages/basculer-theme";
import { SelecteurLangue } from "@/composants/partages/selecteur-langue";
import { Bouton } from "@/composants/ui/bouton";
import type { TypeRole } from "@/types/database";

export function EntetePortail({
  prenom,
  nom,
  role,
}: {
  prenom: string;
  nom: string;
  role: TypeRole;
}) {
  const t = useTranslations("navigation");
  const tGlobal = useTranslations();
  const initiale = (prenom?.[0] ?? nom?.[0] ?? "?").toUpperCase();

  return (
    <header className="entree-portail-entete sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3 pl-12 md:pl-0">
        <span className="degrade-brand degrade-anime grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white shadow-md shadow-brand-1/25 ring-2 ring-brand-2/20 ring-offset-2 ring-offset-background transition-all duration-300 hover:scale-110 hover:ring-brand-2/50">
          {initiale}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">
            {prenom} {nom}
          </p>
          <p className="truncate text-xs text-muted-foreground">{tGlobal(`roles.${role}` as never)}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <SelecteurLangue className="hidden sm:flex" />
        <BasculerTheme className="hover:[&_svg]:rotate-[25deg]" />
        <form action={seDeconnecter}>
          <Bouton
            type="submit"
            variante="fantome"
            taille="icone"
            className="text-muted-foreground hover:text-destructive [&_svg]:hover:-translate-x-0.5"
            aria-label={t("deconnexion")}
          >
            <LogOut />
          </Bouton>
        </form>
      </div>
    </header>
  );
}