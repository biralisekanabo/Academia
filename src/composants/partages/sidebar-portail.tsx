"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Logo } from "@/composants/partages/logo";
import { SelecteurLangue } from "@/composants/partages/selecteur-langue";
import { Link, usePathname } from "@/i18n/navigation";
import { navigationParRole } from "@/constantes/navigation-portail";
import type { TypeRole } from "@/types/database";
import { cn } from "@/utilitaires/cn";

export function SidebarPortail({ role }: { role: TypeRole }) {
  const t = useTranslations();
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);

  const elements = navigationParRole[role] ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="fixed top-4 left-4 z-40 grid size-10 place-items-center rounded-lg border bg-card text-foreground shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-accent hover:shadow-md md:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" />
      </button>

      {ouvert && (
        <div
          className="animate-fondu fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOuvert(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar/95 shadow-[12px_0_40px_-28px_rgba(20,18,50,0.35)] backdrop-blur-xl transition-transform duration-300",
          "md:translate-x-0 md:shadow-none",
          ouvert ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <Link href="/accueil" prefetch onClick={() => setOuvert(false)}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent md:hidden"
            aria-label="Fermer le menu"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {elements.map(({ titreCle, lien, icone: Icone }, index) => {
            const actif =
              chemin === lien || (lien !== "/" && chemin.startsWith(lien));

            return (
              <Link
                key={lien}
                href={lien}
                prefetch
                onClick={() => setOuvert(false)}
                style={{ ["--delai" as string]: `${index * 45}ms` }}
                className={cn(
                  "group animate-entree relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300",
                  actif
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <span
                  className={cn(
                    "absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-brand-1 to-brand-3 transition-all duration-300",
                    actif ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                  )}
                />
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg transition-all duration-300",
                    actif
                      ? "degrade-brand degrade-anime text-white shadow-md shadow-brand-1/25"
                      : "bg-sidebar-accent/70 text-sidebar-foreground/70 group-hover:-rotate-6 group-hover:scale-110 group-hover:text-brand-2"
                  )}
                >
                  <Icone className="size-4" />
                </span>
                {t(titreCle)}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent/50 px-3 py-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <p className="text-xs font-medium text-muted-foreground">OPENLU · v0.1</p>
          </div>
          <div className="mt-3 flex justify-center border-t pt-3 md:hidden">
            <SelecteurLangue />
          </div>
        </div>
      </aside>
    </>
  );
}