"use client";

import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Saisie } from "@/composants/ui/saisie";
import { cn } from "@/utilitaires/cn";

export type OptionRecherche = {
  valeur: string;
  libelle: string;
  sousLibelle?: string;
  groupe?: string;
};

function normaliser(texte: string) {
  return texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function SelecteurRecherche({
  options = [],
  valeur,
  onChange,
  placeholder,
  vide,
  className,
}: {
  options: OptionRecherche[];
  valeur: string | null;
  onChange: (valeur: string) => void;
  placeholder: string;
  vide: string;
  className?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState("");

  const selectionnee = options.find((o) => o.valeur === valeur) ?? null;

  const filtrees = options.filter((o) =>
    normaliser(o.libelle).includes(normaliser(requete))
  );

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOuvert((etat) => !etat)}
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] duration-200 hover:border-brand-2/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={ouvert}
      >
        <span
          className={cn(
            "truncate",
            !selectionnee && "text-muted-foreground"
          )}
        >
          {selectionnee ? selectionnee.libelle : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            ouvert && "rotate-180"
          )}
        />
      </button>

      {ouvert && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOuvert(false)}
          />
          <div
            role="listbox"
            className="animate-apparition border-input absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl"
          >
            <div className="border-b p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Saisie
                  autoFocus
                  value={requete}
                  onChange={(e) => setRequete(e.target.value)}
                  placeholder={placeholder}
                  className="h-8 pl-8"
                />
              </div>
            </div>

            <ul className="max-h-64 overflow-y-auto p-1.5">
              {filtrees.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {vide}
                </li>
              )}
              {filtrees.map((option) => {
                const active = option.valeur === valeur;
                return (
                  <li key={option.valeur}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(option.valeur);
                        setOuvert(false);
                        setRequete("");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{option.libelle}</span>
                        {option.sousLibelle && (
                          <span
                            className={cn(
                              "block truncate text-xs",
                              active ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            {option.sousLibelle}
                          </span>
                        )}
                      </span>
                      {active && <Check className="size-4 shrink-0" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}