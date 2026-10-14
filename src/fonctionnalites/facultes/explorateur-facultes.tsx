"use client";

import { useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Insigne } from "@/composants/ui/insigne";
import { Saisie } from "@/composants/ui/saisie";
import { cn } from "@/utilitaires/cn";

export type FaculteDeRecherche = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
};

export type FiliereDeRecherche = {
  id: string;
  code: string;
  nom: string;
  faculteId: string;
};

function normaliser(texte: string) {
  return texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function ExplorateurFacultes({
  facultes,
  filieres,
}: {
  facultes: FaculteDeRecherche[];
  filieres: FiliereDeRecherche[];
}) {
  const t = useTranslations();
  const [faculteId, setFaculteId] = useState<string>(
    facultes[0]?.id ?? ""
  );
  const [requete, setRequete] = useState("");

  const actuelle = facultes.find((f) => f.id === faculteId) ?? null;

  const filieresFaculte = useMemo(() => {
    const liste = filieres.filter((f) => f.faculteId === faculteId);
    const q = normaliser(requete.trim());
    if (!q) return liste;
    return liste.filter((f) =>
      normaliser(f.nom + " " + f.code).includes(q)
    );
  }, [filieres, faculteId, requete]);

  return (
    <div className="space-y-6">
      {/* Sélecteur de faculté */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {facultes.map((f, index) => {
          const active = f.id === faculteId;
          const nombre = filieres.filter((x) => x.faculteId === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFaculteId(f.id);
                setRequete("");
              }}
              style={{ ["--delai" as string]: `${Math.min(index, 12) * 50}ms` }}
              className={cn(
                "carte-vitrine balayage-survol animate-entree group rounded-2xl border p-4 text-left",
                active
                  ? "halo-gradiant border-brand-2/40 bg-brand-1/5 shadow-lg shadow-brand-1/10"
                  : "bg-card"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "degrade-brand grid size-9 place-items-center rounded-lg text-white shadow-md transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110",
                    !active && "shadow-brand-1/25"
                  )}
                >
                  <Building2 className="size-4" />
                </span>
                <Insigne
                  variante={active ? "parDefaut" : "secondaire"}
                  className="font-mono text-xs"
                >
                  {f.code}
                </Insigne>
              </div>
              <h3 className="mt-3 text-sm font-semibold leading-snug">{f.nom}</h3>
              {f.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {f.description}
                </p>
              )}
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {nombre} filière{nombre > 1 ? "s" : ""}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filières de la faculté sélectionnée */}
      <section className="carte-vitrine rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {actuelle ? actuelle.nom : "—"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {actuelle ? `${actuelle.code} · ${actuelle.description ?? ""}` : ""}
            </p>
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Saisie
              value={requete}
              onChange={(e) => setRequete(e.target.value)}
              placeholder={t("factures.filiereRecherche")}
              className="pl-9"
              aria-label={t("factures.filiereRecherche")}
            />
          </div>
        </div>

        {filieresFaculte.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {requete ? t("factures.aucunResultat") : t("factures.aucuneFiliere")}
          </p>
        ) : (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {filieresFaculte.map((f, index) => (
              <li
                key={f.id}
                style={{ ["--delai" as string]: `${Math.min(index, 16) * 40}ms` }}
                className="ligne-animee animate-entree flex items-center justify-between gap-3 rounded-xl border bg-background/40 px-4 py-3 transition-colors hover:border-brand-2/30 hover:bg-brand-1/5"
              >
                <span className="text-sm font-medium">{f.nom}</span>
                <Insigne
                  variante="contour"
                  className="font-mono text-xs text-muted-foreground"
                >
                  {f.code}
                </Insigne>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}