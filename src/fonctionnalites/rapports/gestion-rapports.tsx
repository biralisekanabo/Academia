"use client";

import {
  ArrowRight,
  Banknote,
  GraduationCap,
  Receipt,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";

type TypeRapport = "etudiants" | "dettes" | "caisse" | "encaissements";

const RAPPORTS: {
  type: TypeRapport;
  titre: string;
  description: string;
  icone: LucideIcon;
}[] = [
  { type: "etudiants", titre: "rapports.etudiants.titre", description: "rapports.etudiants.description", icone: GraduationCap },
  { type: "dettes", titre: "rapports.dettes.titre", description: "rapports.dettes.description", icone: Banknote },
  { type: "caisse", titre: "rapports.caisse.titre", description: "rapports.caisse.description", icone: Wallet },
  { type: "encaissements", titre: "rapports.encaissements.titre", description: "rapports.encaissements.description", icone: Receipt },
];

export function GestionRapports() {
  const t = useTranslations();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {RAPPORTS.map(({ type, titre, description, icone: Icone }) => (
        <Link
          key={type}
          href={`/impression/rapport/${type}`}
          className="carte-vitrine group flex flex-col justify-between gap-4 rounded-3xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
        >
          <span className="degrade-brand grid size-11 place-items-center rounded-2xl text-white shadow-md shadow-brand-1/25">
            <Icone className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold">{t(titre as never)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t(description as never)}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-2">
            {t("rapports.consulter")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  );
}
