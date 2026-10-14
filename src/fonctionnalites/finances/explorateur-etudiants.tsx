"use client";

import { useMemo, useState } from "react";
import { GraduationCap, Search, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Insigne } from "@/composants/ui/insigne";
import { Saisie } from "@/composants/ui/saisie";
import type { TypeNiveau, TypeStatut } from "@/types/database";
import { cn } from "@/utilitaires/cn";

export type FaculteExploration = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
};

export type FiliereExploration = {
  id: string;
  nom: string;
  faculteId: string;
};

export type EtudiantExploration = {
  id: string;
  matricule: string;
  prenom: string;
  nom: string;
  filiereId: string | null;
  niveau: TypeNiveau;
  statut: TypeStatut;
};

function normaliser(texte: string) {
  return texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function varianteStatut(statut: TypeStatut): string {
  switch (statut) {
    case "actif":
      return "text-emerald-600 border-emerald-600/25 bg-emerald-500/10 dark:text-emerald-400";
    case "diplome":
      return "text-brand-2 border-brand-2/25 bg-brand-1/10";
    case "en_attente":
      return "text-amber-600 border-amber-600/25 bg-amber-500/10 dark:text-amber-400";
    case "suspendu":
    case "rejete":
      return "text-rose-600 border-rose-600/25 bg-rose-500/10 dark:text-rose-400";
    default:
      return "text-muted-foreground border-border bg-muted/50";
  }
}

export function ExplorateurEtudiants({
  facultes,
  filieres,
  etudiants,
}: {
  facultes: FaculteExploration[];
  filieres: FiliereExploration[];
  etudiants: EtudiantExploration[];
}) {
  const t = useTranslations();
  const [faculteId, setFaculteId] = useState<string>(facultes[0]?.id ?? "");
  const [requete, setRequete] = useState("");

  const actuelle = facultes.find((f) => f.id === faculteId) ?? null;

  const filieresIds = useMemo(
    () => new Set(filieres.filter((f) => f.faculteId === faculteId).map((f) => f.id)),
    [filieres, faculteId]
  );

  const nomFiliere = useMemo(() => {
    const table = new Map(filieres.map((f) => [f.id, f.nom]));
    return (id: string | null) => (id ? (table.get(id) ?? "—") : "—");
  }, [filieres]);

  const etudiantsFaculte = useMemo(() => {
    const base = etudiants.filter(
      (e) => e.filiereId !== null && filieresIds.has(e.filiereId)
    );
    const q = normaliser(requete.trim());
    if (!q) return base;
    return base.filter((e) =>
      normaliser(`${e.prenom} ${e.nom} ${e.matricule}`).includes(q)
    );
  }, [etudiants, filieresIds, requete]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {facultes.map((f, index) => {
          const active = f.id === faculteId;
          const nombre = etudiants.filter((e) => {
            if (!e.filiereId) return false;
            const filiere = filieres.find((x) => x.id === e.filiereId);
            return filiere?.faculteId === f.id;
          }).length;
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
                <span className="degrade-brand grid size-9 place-items-center rounded-lg text-white shadow-md shadow-brand-1/25 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <GraduationCap className="size-4" />
                </span>
                <Insigne
                  variante={active ? "parDefaut" : "secondaire"}
                  className="font-mono text-xs"
                >
                  {f.code}
                </Insigne>
              </div>
              <h3 className="mt-3 text-sm leading-snug font-semibold">{f.nom}</h3>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {nombre} étudiant{nombre > 1 ? "s" : ""}
              </p>
            </button>
          );
        })}
      </div>

      <section className="carte-vitrine rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {actuelle ? actuelle.nom : "—"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("finances.etudiantsSousTitre")}
            </p>
          </div>

          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Saisie
              value={requete}
              onChange={(e) => setRequete(e.target.value)}
              placeholder={t("etudiants.recherche")}
              className="pl-9"
              aria-label={t("etudiants.recherche")}
            />
          </div>
        </div>

        {etudiantsFaculte.length === 0 ? (
          <div className="grid place-items-center py-12 text-center">
            <span className="degrade-brand icone-flottante mb-3 grid size-12 place-items-center rounded-2xl text-white shadow-md shadow-brand-1/25">
              <Users className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              {requete ? t("commun.aucunResultat") : t("etudiants.aucun")}
            </p>
          </div>
        ) : (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {etudiantsFaculte.map((e, index) => (
              <li
                key={e.id}
                style={{ ["--delai" as string]: `${Math.min(index, 18) * 35}ms` }}
                className="ligne-animee animate-entree flex items-center gap-3 rounded-xl border bg-background/40 px-4 py-3 transition-colors hover:border-brand-2/30 hover:bg-brand-1/5"
              >
                <span className="degrade-brand grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-sm shadow-brand-1/20">
                  {(e.prenom?.[0] ?? e.nom?.[0] ?? "?").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {e.prenom} {e.nom}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {e.matricule} · {nomFiliere(e.filiereId)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Insigne variante="secondaire">{e.niveau}</Insigne>
                  <Insigne variante="contour" className={varianteStatut(e.statut)}>
                    {t(`statuts.${e.statut}` as never)}
                  </Insigne>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
