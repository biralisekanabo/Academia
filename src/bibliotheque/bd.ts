import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Client base de données avec la clé service_role (PostgREST).
 * À utiliser EXCLUSIVEMENT côté serveur : contourne la RLS.
 * Toutes les tables applicatives vivent dans le schéma `public`.
 */
export function bd(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !cle) {
    throw new Error(
      "Configuration base manquante : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  client = createClient(url, cle, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: { schema: "public" },
  });

  return client;
}

/** Nom de table typé libre (les types métier viendront au fil des modules). */
export type Table =
  | "entreprises"
  | "utilisateurs"
  | "roles"
  | "permissions"
  | "role_permissions"
  | "utilisateur_roles"
  | "journal_audit"
  | "annees_academiques"
  | "facultes"
  | "domaines"
  | "promotions"
  | "etudiants"
  | "inscriptions"
  | "devises"
  | "taux_changes"
  | "frais_academiques"
  | "frais_tranches"
  | "dettes"
  | "caisses"
  | "paiements"
  | "paiement_dettes"
  | "mouvements_caisse"
  | "journal_caisse"
  | "comptes_comptables"
  | "journaux"
  | "ecritures"
  | "ecriture_lignes"
  | "utilisateur_succursales"
  | "sequences_documents"
  | "remises_dettes"
  | "sessions_caisse"
  | "reinitialisations_mot_de_passe"
  | "vue_solde_caisse"
  | "vue_situation_etudiants"
  | "vue_dettes_entreprise";
