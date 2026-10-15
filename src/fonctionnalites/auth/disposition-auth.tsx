import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, BookOpen, ShieldCheck, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/composants/partages/logo";
import { SelecteurLangue } from "@/composants/partages/selecteur-langue";
import { BasculerTheme } from "@/composants/partages/basculer-theme";
import { TransitionRoute } from "@/composants/partages/transition-route";
import {
  Carte,
  CarteContenu,
  CarteDescription,
  CarteEntete,
  CarteTitre,
} from "@/composants/ui/carte";

export async function DispositionAuth({
  titre,
  sousTitre,
  enfants,
  type,
}: {
  titre: string;
  sousTitre: string;
  enfants: ReactNode;
  type: "connexion" | "inscription";
}) {
  const t = await getTranslations("auth");

  return (
    <TransitionRoute>
    <div className="relative grid h-dvh overflow-y-auto overscroll-contain bg-background sans-scrollbar lg:grid-cols-2">
      <div className="degrade-brand relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-20">
        <div className="animate-flotter absolute -top-28 -left-28 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="animate-flotter-lent absolute -right-20 -bottom-24 size-80 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(255,255,255,0.16),transparent_34%),linear-gradient(145deg,transparent_38%,rgba(17,24,39,0.14))]" />

        <div className="relative mx-auto flex w-full max-w-xl flex-col items-center text-center">
          <div className="group mb-8 flex cursor-default flex-col items-center gap-4">
            <span className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-[1.75rem] border border-white/35 bg-white p-2.5 shadow-2xl shadow-indigo-950/25 ring-1 ring-white/20 transition-all duration-500 ease-out group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-[0_24px_70px_-20px_rgba(255,255,255,0.65)] sm:size-28">
              <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-white/70 via-transparent to-brand-3/20 opacity-70" />
              <Image
                src="/openlu-logo.png"
                alt="Logo OPENLU"
                fill
                sizes="112px"
                priority
                className="relative z-10 scale-[0.88] object-contain transition-transform duration-500 ease-out group-hover:scale-100"
              />
            </span>
            <span className="text-2xl font-extrabold tracking-[0.18em] text-white drop-shadow-sm transition-all duration-300 group-hover:tracking-[0.24em] sm:text-3xl">
              OPENLU
            </span>
          </div>

          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
            <Sparkles className="size-3.5" />
            {t(type === "connexion" ? "accrocheConnexion" : "accrocheInscription")}
          </span>
          <p className="max-w-md text-4xl leading-tight font-bold tracking-tight text-balance xl:text-5xl">
            {t("promesseTitre")}
          </p>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/75">
            {t("promesseTexte")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90 backdrop-blur-sm">
              <BookOpen className="size-4" />
              {t("promesseCours")}
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90 backdrop-blur-sm">
              <ShieldCheck className="size-4" />
              {t("promesseCompte")}
            </span>
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/70">
          <span className="inline-block size-2 rounded-full bg-white/80" />
          Open Learning University
          <ArrowRight className="ml-auto size-4 opacity-70" />
        </div>
      </div>

      <div className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-20 sm:px-8 sm:py-16">
        <header className="absolute top-4 right-4 flex items-center gap-2 sm:top-6 sm:right-8">
          <SelecteurLangue />
          <BasculerTheme />
        </header>

        <div className="animate-apparition my-auto flex w-full max-w-md flex-col gap-6">
          <div className="flex justify-center lg:hidden">
            <Logo taille={52} />
          </div>

          <Carte className="halo-gradiant w-full gap-0 overflow-hidden rounded-3xl border bg-card/90 py-0 shadow-xl shadow-brand-1/10 backdrop-blur-xl">
            <CarteEntete className="justify-items-center gap-2 px-6 pt-7 pb-5 text-center sm:px-8 sm:pt-9">
              <span
                className="animate-entree mb-1 inline-flex w-fit items-center gap-2 rounded-full bg-brand-1/8 px-3 py-1.5 text-xs font-semibold text-brand-2 ring-1 ring-brand-2/15"
                style={{ ["--delai" as string]: "100ms" }}
              >
                <ShieldCheck className="size-3.5" />
                {t(type === "connexion" ? "badgeConnexion" : "badgeInscription")}
              </span>
              <CarteTitre
                className="animate-entree text-2xl font-bold tracking-tight"
                style={{ ["--delai" as string]: "190ms" }}
              >
                {titre}
              </CarteTitre>
              <CarteDescription
                className="animate-entree text-sm leading-relaxed"
                style={{ ["--delai" as string]: "280ms" }}
              >
                {sousTitre}
              </CarteDescription>
            </CarteEntete>
            <CarteContenu className="space-y-6 px-6 pb-7 sm:px-8 sm:pb-9">
              {enfants}
            </CarteContenu>
          </Carte>
        </div>
      </div>
    </div>
    </TransitionRoute>
  );
}
