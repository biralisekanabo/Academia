import "server-only";

import { bd } from "@/bibliotheque/bd";

/**
 * Génère un numéro unique par établissement via la fonction SQL
 * `prochain_numero` (compteurs atomiques, table sequences_documents).
 */
export async function genererNumero(
  entrepriseId: number,
  cle: string,
  prefixe: string,
  annee?: number | null,
  largeur = 5
): Promise<string> {
  const { data, error } = await bd().rpc("prochain_numero", {
    p_entreprise: entrepriseId,
    p_cle: cle,
    p_prefixe: prefixe,
    p_annee: annee ?? null,
    p_largeur: largeur,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Numérotation indisponible.");
  }

  return String(data);
}
