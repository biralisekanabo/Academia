"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Bouton } from "@/composants/ui/bouton";
import { Modale } from "@/composants/partages/modale";

export type OptionsConfirmation = {
  titre: string;
  message: string;
  libelleConfirmer?: string;
  libelleAnnuler?: string;
  variante?: "defaut" | "destructive";
};

type EtatConfirmation = OptionsConfirmation & {
  regle?: (valeur: boolean) => void;
};

type ValeurConfirmation = {
  confirmer: (options: OptionsConfirmation) => Promise<boolean>;
};

const ContexteConfirmation = createContext<ValeurConfirmation | null>(null);

export function FournisseurConfirmation({ children }: { children: React.ReactNode }) {
  const t = useTranslations("commun");
  const [etat, setEtat] = useState<EtatConfirmation | null>(null);
  const resolverRef = useRef<((valeur: boolean) => void) | null>(null);

  const confirmer = useCallback((options: OptionsConfirmation) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setEtat({ ...options, regle: resolve });
    });
  }, []);

  const fermer = useCallback((valeur: boolean) => {
    resolverRef.current?.(valeur);
    resolverRef.current = null;
    setEtat(null);
  }, []);

  const valeur = useMemo(() => ({ confirmer }), [confirmer]);

  return (
    <ContexteConfirmation.Provider value={valeur}>
      {children}
      <Modale
        ouvert={etat !== null}
        titre={etat?.titre ?? ""}
        onFermer={() => fermer(false)}
      >
        <div className="space-y-5">
          <div className="flex gap-3">
            <span
              className={
                etat?.variante === "destructive"
                  ? "grid size-10 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"
                  : "grid size-10 shrink-0 place-items-center rounded-full bg-brand-1/10 text-brand-2"
              }
            >
              <AlertTriangle className="size-5" />
            </span>
            <p className="pt-1.5 text-sm leading-relaxed text-muted-foreground">{etat?.message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Bouton variante="contour" onClick={() => fermer(false)}>
              {etat?.libelleAnnuler ?? t("annuler")}
            </Bouton>
            <Bouton
              variante={etat?.variante === "destructive" ? "destructif" : "parDefaut"}
              onClick={() => fermer(true)}
            >
              {etat?.libelleConfirmer ?? t("confirmer")}
            </Bouton>
          </div>
        </div>
      </Modale>
    </ContexteConfirmation.Provider>
  );
}

export function useConfirmation() {
  const contexte = useContext(ContexteConfirmation);
  if (!contexte) {
    throw new Error("useConfirmation doit être utilisé dans <FournisseurConfirmation>.");
  }
  return contexte;
}