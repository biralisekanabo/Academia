import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { configuration } from "@/i18n/configuration";
import type { Database } from "@/types/database";

const intlMiddleware = createMiddleware(configuration);

export async function middleware(request: NextRequest) {
  // 1. Session Supabase à jour (rafraîchit le jeton si nécessaire)
  let reponseSupabase = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(biscuits) {
          biscuits.forEach(({ name, value }) => request.cookies.set(name, value));
          reponseSupabase = NextResponse.next({ request });
          biscuits.forEach(({ name, value, options }) =>
            reponseSupabase.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  // 2. Middleware i18n (routing, préfixe de langue supporté)
  const reponseIntl = intlMiddleware(request);

  // 3. Report des cookies de session sur la réponse finale
  reponseSupabase.cookies.getAll().forEach((biscuit) => {
    reponseIntl.cookies.set(biscuit);
  });

  return reponseIntl;
}

export const config = {
  matcher: ["/((?!_next|api|trpc|.*\\..*).*)"],
};