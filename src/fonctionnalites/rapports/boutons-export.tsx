"use client";

import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Bouton } from "@/composants/ui/bouton";
import { exporterExcel, exporterPDF } from "@/utilitaires/export";

type Props = {
  entetes: string[];
  lignes: (string | number)[][];
  donnees: Record<string, unknown>[];
  titrePdf: string;
  sousTitrePdf?: string;
  nomFichier: string;
  type: "liste" | "filtre";
};

export function BoutonsExport({ entetes, lignes, donnees, titrePdf, sousTitrePdf, nomFichier, type }: Props) {
  const t = useTranslations("rapports");

  function imprimer() {
    window.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bouton variante="contour" taille="sm" onClick={imprimer}>
        <Printer className="size-4" />
        {t("imprimer")}
      </Bouton>
      <Bouton variante="contour" taille="sm" onClick={() => exporterPDF(entetes, lignes, titrePdf, `${nomFichier}-${type}`, sousTitrePdf)}>
        <Download className="size-4" />
        PDF
      </Bouton>
      <Bouton variante="contour" taille="sm" onClick={() => exporterExcel(donnees, `${nomFichier}-${type}`, "Rapport")}>
        <FileSpreadsheet className="size-4" />
        Excel
      </Bouton>
    </div>
  );
}

