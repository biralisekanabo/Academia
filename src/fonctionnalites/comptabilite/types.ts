import type { Ecriture } from "@/types/base";

export type LigneEcritureVue = {
  compte_id: number;
  debit: number;
  credit: number;
  libelle: string | null;
};

export type EcritureVue = Ecriture & { lignes: LigneEcritureVue[] };

export type LigneBalance = {
  compte_id: number;
  code: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
};
