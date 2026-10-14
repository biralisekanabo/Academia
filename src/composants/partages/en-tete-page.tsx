import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/utilitaires/cn";

export function EnTetePage({
  icone: Icone,
  titre,
  sousTitre,
  actions,
  className,
}: {
  icone: LucideIcon;
  titre: ReactNode;
  sousTitre?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-entree flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <span className="degrade-brand degrade-anime halo-gradiant grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-lg shadow-brand-1/30 ring-1 ring-white/20 transition-transform duration-500 hover:-rotate-6 hover:scale-110 sm:size-12">
          <Icone className="size-5 transition-transform duration-300 sm:size-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            {titre}
          </h1>
          {sousTitre && (
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {sousTitre}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex w-full items-center gap-2 [&>*]:w-full sm:w-auto sm:[&>*]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
