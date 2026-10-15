import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { configuration } from "@/i18n/configuration";
import type { Database } from "@/types/database";

const intlMiddleware = createMiddleware(configuration);

export async function proxy(request: NextRequest) {
  // 1. Routage i18n (préfixe de langue). C'est la base : la réponse est
  //    toujours produite, même si Supabase est indisponible.
  const reponseIntl = intlMiddleware(request);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !cle) return reponseIntl;

  // Aucun cookie d'auth : rien à rafraîchir, on évite tout appel réseau.
  const aUnCookieAuth = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  if (!aUnCookieAuth) return reponseIntl;

  // 2. Rafraîchissement de la session Supabase, en best-effort : une panne
  //    d'auth ne doit jamais casser le routage (erreur 500 middleware).
  //    On utilise getSession() (lecture locale + refresh si expiré) plutôt que
  //    getUser() (aller-retour réseau systématique) : la validation
  //    authoritative est faite côté rendu par obtenirSession().
  try {
    let reponseSupabase = NextResponse.next({ request });
    const supabase = createServerClient<Database>(url, cle, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(biscuits) {
          biscuits.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          reponseSupabase = NextResponse.next({ request });
          biscuits.forEach(({ name, value, options }) =>
            reponseSupabase.cookies.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.getSession();

    reponseSupabase.cookies.getAll().forEach((biscuit) => {
      reponseIntl.cookies.set(biscuit);
    });
  } catch (erreur) {
    console.error("Proxy Supabase indisponible :", erreur);
  }

  return reponseIntl;
}

export const config = {
  matcher: ["/((?!_next|api|trpc|.*\\..*).*)"],
};
