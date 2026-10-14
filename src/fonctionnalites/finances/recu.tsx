"use client";

import { Printer, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Logo } from "@/composants/partages/logo";
import { Bouton } from "@/composants/ui/bouton";

export function Recu({
  reference,
  libelle,
  montant,
  devise,
  datePaiement,
  methode,
  prenom,
  nom,
  matricule,
  filiere,
  faculte,
  montantLettres,
  locale,
}: {
  reference: string;
  libelle: string | null;
  montant: number;
  devise: string;
  datePaiement: string;
  methode: string;
  prenom: string;
  nom: string;
  matricule: string | null;
  filiere: string | null;
  faculte: string | null;
  montantLettres: string;
  locale: string;
}) {
  const t = useTranslations("recu");
  const tc = useTranslations("finances");

  const dateTexte = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(datePaiement));

  const montantTexte = new Intl.NumberFormat(
    locale === "fr" ? "fr-FR" : "en-GB",
    { maximumFractionDigits: 0 }
  ).format(montant);

  return (
    <div className="space-y-6">
      <div className="print:masquer flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center [&>*]:w-full sm:[&>*]:w-auto">
        <Bouton type="button" onClick={() => window.print()}>
          <Printer className="size-4" />
          {t("imprimer")}
        </Bouton>
        <Bouton
          type="button"
          variante="contour"
          onClick={() => window.history.back()}
        >
          <Undo2 className="size-4" />
          {t("fermer")}
        </Bouton>
      </div>

      <div className="carte-vitrine mx-auto w-full max-w-xl rounded-2xl border bg-card p-5 shadow-xl sm:p-8">
        {/* En-tête OPENLU */}
        <header className="text-center">
          <div className="mx-auto w-fit">
            <Logo />
          </div>
          <p className="text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
            {t("universiteSuffixe")}
          </p>

          <div className="degrade-brand mx-auto my-5 h-0.5 w-40 rounded-full" />

          <h1 className="text-xl font-black tracking-[0.2em] uppercase">
            {t("recu")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("sousTitre")}</p>
        </header>

        <div className="my-6 border-t border-dashed" />

        {/* Référence */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{t("numero")}</span>
          <span className="font-mono font-semibold tracking-wide">
            {reference}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{t("recuDe")}</span>
          <span className="font-medium">
            {prenom} {nom}
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {matricule}
            </span>
          </span>
        </div>
        {filiere && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{t("cursus")}</span>
            <span className="font-medium">
              {filiere}
              {faculte && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({faculte})
                </span>
              )}
            </span>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{t("date")}</span>
          <span>{dateTexte}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{tc("methode")}</span>
          <span className="capitalize">
            {tc(`methodes.${methode}`)}
          </span>
        </div>

        <div className="my-6 border-t border-dashed" />

        {/* Lignes du reçu */}
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">{t("libelle")}</span>
          <span className="text-right font-medium">{libelle ?? "—"}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-muted-foreground">{t("total")}</span>
          <span className="degrade-brand rounded-lg px-4 py-2 text-xl font-extrabold text-white shadow-md shadow-brand-1/25 sm:text-2xl">
            {montantTexte} {devise}
          </span>
        </div>

        <div className="my-6 border-t border-dashed" />

        {montantLettres && (
          <p className="text-sm capitalize text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("montantEnLettres")} :{" "}
            </span>
            {montantLettres} {devise.toLowerCase()}
          </p>
        )}

        <div className="mt-16 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <p className="max-w-full pt-2 text-xs text-muted-foreground sm:max-w-[12rem]">
            {t("mentions")}
          </p>
          <div className="text-center">
            <div className="w-full border-t border-foreground/40 pt-2 sm:w-44">
              <p className="text-xs font-medium">{t("signature")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}