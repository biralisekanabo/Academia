"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { Bouton } from "@/composants/ui/bouton";
import { cn } from "@/utilitaires/cn";

function sAbonner(rappeler: () => void) {
  const observateur = new MutationObserver(rappeler);
  observateur.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observateur.disconnect();
}

function lireSombre() {
  return document.documentElement.classList.contains("dark");
}

function lireSombreServeur() {
  return true;
}

export function BasculerTheme({ className }: { className?: string }) {
  const sombre = useSyncExternalStore(sAbonner, lireSombre, lireSombreServeur);

  function basculer() {
    const suivant = !sombre;
    document.documentElement.classList.toggle("dark", suivant);
    localStorage.setItem("openlu-theme", suivant ? "dark" : "light");
  }

  return (
    <Bouton
      variante="fantome"
      taille="icone"
      aria-label="Basculer le thème"
      className={cn("rounded-lg", className)}
      onClick={basculer}
    >
      {sombre ? <Sun /> : <Moon />}
    </Bouton>
  );
}
