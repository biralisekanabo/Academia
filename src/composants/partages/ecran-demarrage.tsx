"use client";

import { useEffect, useState } from "react";

import { Logo } from "@/composants/partages/logo";
import { cn } from "@/utilitaires/cn";

export function EcranDemarrage() {
  const [monte, setMonte] = useState(true);
  const [parti, setParti] = useState(false);

  useEffect(() => {
    const fondu = window.setTimeout(() => setParti(true), 1300);
    const retrait = window.setTimeout(() => setMonte(false), 1800);
    return () => {
      window.clearTimeout(fondu);
      window.clearTimeout(retrait);
    };
  }, []);

  if (!monte) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center gap-7 overflow-hidden bg-background transition-opacity duration-500",
        parti ? "pointer-events-none opacity-0" : "opacity-100"
      )}
    >
      <div className="animate-flotter absolute -top-24 -left-24 size-80 rounded-full bg-brand-1/15 blur-3xl" />
      <div className="animate-flotter-lent absolute -right-24 -bottom-24 size-72 rounded-full bg-brand-3/15 blur-3xl" />

      <div className="animate-apparition relative flex flex-col items-center gap-5">
        <Logo taille={92} avecTexte={false} />
        <span className="text-3xl font-extrabold tracking-tight">
          Open<span className="texte-degrade">Lu</span>
        </span>
      </div>

      <div className="relative h-1 w-40 overflow-hidden rounded-full bg-muted">
        <span className="degrade-brand animate-charge absolute inset-y-0 left-0 w-1/2 rounded-full" />
      </div>
    </div>
  );
}
