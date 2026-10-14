import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Client Supabase avec la clé service_role.
 * À n'utiliser QUE côté serveur : contourne la RLS et gère les comptes Auth
 * (création d'utilisateurs sans e-mail de confirmation, etc.).
 */
export function creerClientAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
