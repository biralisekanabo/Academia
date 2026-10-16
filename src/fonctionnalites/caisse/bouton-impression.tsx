"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Bouton } from "@/composants/ui/bouton";

export function BoutonImpression() {
  const t = useTranslations();
  return (
    <Bouton onClick={() => window.print()} className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20 print:hidden">
      <Printer />
      {t("caisse.imprimer")}
    </Bouton>
  );
}
