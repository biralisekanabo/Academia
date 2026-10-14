"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { Bouton } from "@/composants/ui/bouton";
import { cn } from "@/utilitaires/cn";

export type PreferenceTheme = "system" | "light" | "dark";

const CLE = "openlu-theme";
const EVENEMENT = "openlu-theme";

function estPreference(valeur: string | null): valeur is PreferenceTheme {
  return valeur === "system" || valeur === "light" || valeur === "dark";
}

export function appliquerPreference(preference: PreferenceTheme) {
  const sombre =
    preference === "dark" ||
    (preference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", sombre);
  localStorage.setItem(CLE, preference);
  window.dispatchEvent(new Event(EVENEMENT));
}

function sAbonner(rappeler: () => void) {
  const observateur = new MutationObserver(rappeler);
  observateur.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(EVENEMENT, rappeler);
  media.addEventListener("change", rappeler);
  return () => {
    observateur.disconnect();
    window.removeEventListener(EVENEMENT, rappeler);
    media.removeEventListener("change", rappeler);
  };
}

function lirePreference(): PreferenceTheme {
  try {
    const valeur = localStorage.getItem(CLE);
    return estPreference(valeur) ? valeur : "system";
  } catch {
    return "system";
  }
}

function lirePreferenceServeur(): PreferenceTheme {
  return "system";
}

const ORDRE: PreferenceTheme[] = ["system", "light", "dark"];

export function BasculerTheme({ className }: { className?: string }) {
  const t = useTranslations("theme");
  const preference = useSyncExternalStore(
    sAbonner,
    lirePreference,
    lirePreferenceServeur
  );

  function basculer() {
    const index = ORDRE.indexOf(preference);
    appliquerPreference(ORDRE[(index + 1) % ORDRE.length]);
  }

  const Icone =
    preference === "system" ? Monitor : preference === "dark" ? Moon : Sun;

  const libelle =
    preference === "system"
      ? t("systeme")
      : preference === "dark"
        ? t("sombre")
        : t("clair");

  return (
    <Bouton
      variante="fantome"
      taille="icone"
      aria-label={libelle}
      title={libelle}
      className={cn("rounded-lg", className)}
      onClick={basculer}
    >
      <Icone />
    </Bouton>
  );
}
