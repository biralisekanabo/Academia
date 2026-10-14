import Image from "next/image";

import { cn } from "@/utilitaires/cn";

export function Logo({
  avecTexte = true,
  className,
  taille = 36,
}: {
  avecTexte?: boolean;
  className?: string;
  taille?: number;
}) {
  return (
    <span className={cn("group/logo flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-white/25 bg-white shadow-md shadow-brand-1/25 ring-1 ring-black/5 transition-transform duration-300 group-hover/logo:scale-105"
        style={{ width: taille, height: taille }}
      >
        <Image
          src="/openlu-logo.png"
          alt="OpenLu"
          fill
          sizes="96px"
          priority
          className="object-contain"
        />
        <span className="animate-brillant pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 transition-opacity duration-300 group-hover/logo:opacity-100" />
      </span>
      {avecTexte && (
        <span className="text-lg font-bold tracking-tight">
          OPEN<span className="texte-degrade">LU</span>
        </span>
      )}
    </span>
  );
}
