import { CalendarDays, FileText, Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";

import type { FichierAnnonceVue } from "@/fonctionnalites/annonces/gestion-annonces";

type AnnoncePublique = {
  id: string;
  titre: string;
  contenu: string;
  publiee_le: string | null;
  cree_le: string;
  fichiers: FichierAnnonceVue[];
};

function libelleTaille(octets: number) {
  return octets < 1024 * 1024
    ? `${Math.max(1, Math.round(octets / 1024))} Ko`
    : `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export function TableauPublicAnnonces({
  annonces,
  locale,
}: {
  annonces: AnnoncePublique[];
  locale: string;
}) {
  const t = useTranslations();

  if (!annonces.length) {
    return (
      <div className="animate-entree grid min-h-64 place-items-center rounded-3xl border border-dashed bg-card/70 px-6 py-14 text-center">
        <div>
          <span className="degrade-brand mx-auto mb-4 grid size-14 place-items-center rounded-2xl text-white shadow-lg shadow-brand-1/20">
            <Megaphone className="size-7" />
          </span>
          <h2 className="font-semibold">{t("annonces.aucunePublique")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("annonces.revenirPlusTard")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {annonces.map((annonce, index) => (
        <article
          key={annonce.id}
          className="carte-vitrine halo-gradiant animate-entree rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
          style={{ ["--delai" as string]: `${Math.min(index, 10) * 50}ms` }}
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-1/10 text-brand-2">
              <Megaphone className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="size-3.5" />
                <time dateTime={annonce.publiee_le ?? annonce.cree_le}>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "long",
                    timeStyle: "short",
                  }).format(new Date(annonce.publiee_le ?? annonce.cree_le))}
                </time>
              </div>
              <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                {annonce.titre}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                {annonce.contenu}
              </p>
              {annonce.fichiers.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
                  {annonce.fichiers.map((fichier) => (
                    <a
                      key={fichier.id}
                      href={fichier.url}
                      target="_blank"
                      rel="noreferrer"
                      className="lien-anime inline-flex max-w-full items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-sm font-medium hover:border-brand-2/40 hover:bg-brand-1/5"
                    >
                      <FileText className="size-4 shrink-0 text-brand-2" />
                      <span className="truncate">{fichier.nom}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {libelleTaille(fichier.taille_octets)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
