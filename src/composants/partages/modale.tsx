"use client";

import { X } from "lucide-react";

export function Modale({
  ouvert,
  titre,
  sousTitre,
  onFermer,
  children,
}: {
  ouvert: boolean;
  titre: string;
  sousTitre?: string;
  onFermer: () => void;
  children: React.ReactNode;
}) {
  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="animate-fondu fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onFermer}
        aria-hidden
      />
      <div className="animate-apparition relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border bg-card shadow-2xl sm:rounded-3xl">
        <span className="degrade-brand degrade-anime absolute inset-x-0 top-0 z-10 h-1" />
        <div className="overflow-y-auto p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{titre}</h2>
              {sousTitre && (
                <p className="mt-0.5 text-sm text-muted-foreground">{sousTitre}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onFermer}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-all duration-150 hover:rotate-90 hover:bg-accent hover:text-accent-foreground"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}