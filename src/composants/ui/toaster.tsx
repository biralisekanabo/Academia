"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, type LucideIcon } from "lucide-react";

import { cn } from "@/utilitaires/cn";

export type VarianteToast = "succes" | "erreur" | "info";

export type Toast = {
  id: number;
  titre: string;
  description?: string;
  variante: VarianteToast;
};

type OptionsToast = Omit<Toast, "id">;

type ContexteToasts = {
  toast: (options: OptionsToast) => void;
  succes: (titre: string, description?: string) => void;
  erreur: (titre: string, description?: string) => void;
  info: (titre: string, description?: string) => void;
};

const ContexteToasts = createContext<ContexteToasts | null>(null);

const DUREE = 5000;
const MAXIMUM = 5;

const STYLES: Record<
  VarianteToast,
  { icone: LucideIcon; barre: string; iconeFond: string }
> = {
  succes: {
    icone: CheckCircle2,
    barre: "from-emerald-500 to-teal-400",
    iconeFond: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  erreur: {
    icone: AlertTriangle,
    barre: "from-destructive to-rose-400",
    iconeFond: "bg-destructive/15 text-destructive",
  },
  info: {
    icone: Info,
    barre: "from-brand-1 via-brand-2 to-brand-3",
    iconeFond: "bg-brand-1/15 text-brand-2",
  },
};

export function useToast() {
  const contexte = useContext(ContexteToasts);
  if (!contexte) {
    throw new Error("useToast doit être utilisé dans <FournisseurToasts>.");
  }
  return contexte;
}

export function FournisseurToasts({ children }: { children: React.ReactNode }) {
  const [liste, setListe] = useState<Toast[]>([]);
  const compteur = useRef(0);

  const retirer = useCallback((id: number) => {
    setListe((precedent) => precedent.filter((element) => element.id !== id));
  }, []);

  const toast = useCallback(
    (options: OptionsToast) => {
      const id = compteur.current++;
      setListe((precedent) => [...precedent.slice(-(MAXIMUM - 1)), { id, ...options }]);
      window.setTimeout(() => retirer(id), DUREE);
    },
    [retirer]
  );

  const valeur = useMemo<ContexteToasts>(
    () => ({
      toast,
      succes: (titre, description) => toast({ titre, description, variante: "succes" }),
      erreur: (titre, description) => toast({ titre, description, variante: "erreur" }),
      info: (titre, description) => toast({ titre, description, variante: "info" }),
    }),
    [toast]
  );

  return (
    <ContexteToasts.Provider value={valeur}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-3 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {liste.map((element) => (
          <CarteToast key={element.id} toast={element} onFermer={() => retirer(element.id)} />
        ))}
      </div>
    </ContexteToasts.Provider>
  );
}

function CarteToast({ toast, onFermer }: { toast: Toast; onFermer: () => void }) {
  const config = STYLES[toast.variante];
  const Icone = config.icone;

  return (
    <div
      role="status"
      className="animate-toast pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border border-sidebar-border bg-card/95 shadow-2xl backdrop-blur-xl transition-shadow hover:shadow-brand-1/20"
    >
      <span className="absolute inset-x-0 top-0 h-1 bg-muted" aria-hidden />
      <span
        className={cn(
          "animate-depletion absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r",
          config.barre
        )}
        aria-hidden
      />
      <div className="flex items-start gap-3 p-4 pt-5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            config.iconeFond
          )}
        >
          <Icone className="size-5" />
        </span>
        <div className="flex-1 pt-0.5">
          <p className="text-sm font-semibold">{toast.titre}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onFermer}
          className="-mr-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-all duration-200 hover:rotate-90 hover:bg-accent hover:text-accent-foreground"
          aria-label="Fermer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
