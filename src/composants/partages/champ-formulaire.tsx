"use client";

import { useTranslations } from "next-intl";

import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { ZoneTexte } from "@/composants/ui/zone-texte";
import { cn } from "@/utilitaires/cn";

function Libelle({
  children,
  optionnel,
}: {
  children: React.ReactNode;
  optionnel?: boolean;
}) {
  const t = useTranslations("commun");
  return (
    <Etiquette className="flex items-center gap-1.5">
      <span>{children}</span>
      {optionnel && (
        <span className="text-xs font-normal text-muted-foreground">
          ({t("optionnel")})
        </span>
      )}
    </Etiquette>
  );
}

export const Champ = ({
  label,
  erreur,
  optionnel,
  ref,
  className,
  ...props
}: React.ComponentProps<typeof Saisie> & {
  label: string;
  erreur?: string;
  optionnel?: boolean;
}) => (
  <div className={cn("space-y-2", className)}>
    <Libelle optionnel={optionnel}>{label}</Libelle>
    <Saisie ref={ref} aria-invalid={Boolean(erreur)} {...props} />
    {erreur && <p className="text-xs text-destructive">{erreur}</p>}
  </div>
);

export const ChampSelecteur = ({
  label,
  erreur,
  optionnel,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Selecteur> & {
  label?: string;
  erreur?: string;
  optionnel?: boolean;
}) => (
  <div className={cn("space-y-2", className)}>
    {label && <Libelle optionnel={optionnel}>{label}</Libelle>}
    <Selecteur aria-invalid={Boolean(erreur)} {...props}>
      {children}
    </Selecteur>
    {erreur && <p className="text-xs text-destructive">{erreur}</p>}
  </div>
);

export const ChampZoneTexte = ({
  label,
  erreur,
  optionnel,
  className,
  ...props
}: React.ComponentProps<typeof ZoneTexte> & {
  label: string;
  erreur?: string;
  optionnel?: boolean;
}) => (
  <div className={cn("space-y-2", className)}>
    <Libelle optionnel={optionnel}>{label}</Libelle>
    <ZoneTexte aria-invalid={Boolean(erreur)} {...props} />
    {erreur && <p className="text-xs text-destructive">{erreur}</p>}
  </div>
);

export function SectionFormulaire({
  icone,
  titre,
  description,
  action,
  children,
}: {
  icone?: React.ReactNode;
  titre: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="carte-vitrine space-y-4 rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icone && (
            <span className="degrade-brand grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-md shadow-brand-1/25">
              {icone}
            </span>
          )}
          <div>
            <h2 className="text-base font-semibold">{titre}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
