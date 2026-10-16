import "server-only";

import { cache } from "react";

import { bd } from "@/bibliotheque/bd";
import type { Session } from "@/types/base";

/**
 * Périmètre multi-tenant.
 *
 * Une succursale est une ligne de `entreprises` (est_mere = false,
 * entreprise_mere_id = id de la mère). Ces helpers centralisent toutes
 * les vérifications d'isolation afin qu'aucune action serveur n'oublie
 * de restreindre les données à l'établissement de l'utilisateur.
 */

export type EntrepriseLite = {
  id: number;
  nom: string;
  sigle: string | null;
  est_mere: boolean;
  entreprise_mere_id: number | null;
};

/** Retourne l'ID de l'entreprise mère (l'entreprise elle-même si c'en est une). */
export const entrepriseMereId = cache(async function entrepriseMereId(
  entrepriseId: number
): Promise<number> {
  const { data } = await bd()
    .from("entreprises")
    .select("id, est_mere, entreprise_mere_id")
    .eq("id", entrepriseId)
    .is("deleted_at", null)
    .maybeSingle<EntrepriseLite>();

  if (!data) return entrepriseId;
  return data.est_mere ? data.id : (data.entreprise_mere_id ?? data.id);
});

/** Liste des entreprises du périmètre : la mère et ses succursales. */
export const perimetreEntreprise = cache(async function perimetreEntreprise(
  entrepriseId: number
): Promise<number[]> {
  const mereId = await entrepriseMereId(entrepriseId);
  const { data } = await bd()
    .from("entreprises")
    .select("id")
    .or(`id.eq.${mereId},entreprise_mere_id.eq.${mereId}`)
    .is("deleted_at", null);

  const ids = (data ?? []).map((l) => (l as { id: number }).id);
  return ids.length > 0 ? ids : [entrepriseId];
});

/** Succursales déclarées (hors mère) du périmètre. */
export async function succursalesDe(entrepriseId: number): Promise<EntrepriseLite[]> {
  const mereId = await entrepriseMereId(entrepriseId);
  const { data } = await bd()
    .from("entreprises")
    .select("id, nom, sigle, est_mere, entreprise_mere_id")
    .eq("entreprise_mere_id", mereId)
    .is("deleted_at", null)
    .order("nom");
  return (data ?? []) as EntrepriseLite[];
}

/** Vérifie qu'une entreprise appartient au périmètre de l'utilisateur. */
export async function verifierPerimetre(
  session: Session,
  entrepriseId: number
): Promise<boolean> {
  if (session.roles.includes("SUPER_ADMIN")) return true;
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  return perimetre.includes(entrepriseId);
}

/** Lève une erreur si l'entreprise cible est hors périmètre. */
export async function exigerPerimetre(
  session: Session,
  entrepriseId: number
): Promise<void> {
  const ok = await verifierPerimetre(session, entrepriseId);
  if (!ok) {
    throw new Error(
      "Accès refusé : cette ressource appartient à un autre établissement."
    );
  }
}

/** Succursales explicitement autorisées pour un utilisateur. */
export async function succursalesAutorisees(
  utilisateurId: number
): Promise<number[]> {
  const { data } = await bd()
    .from("utilisateur_succursales")
    .select("succursale_id")
    .eq("utilisateur_id", utilisateurId);
  return (data ?? []).map((l) => (l as { succursale_id: number }).succursale_id);
}
