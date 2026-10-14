import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

export async function creerClientServeur() {
  const jar = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(biscuits) {
          try {
            biscuits.forEach(({ name, value, options }) => {
              jar.set(name, value, options);
            });
          } catch {
            // Appelé hors d'une Server Action / Route Handler : ignoré
          }
        },
      },
    }
  );
}