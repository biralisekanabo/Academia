import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { configuration } from "@/i18n/configuration";

const intlMiddleware = createMiddleware(configuration);

export async function proxy(request: NextRequest) {
  // Routage i18n (préfixe de langue). La session applicative est un cookie
  // signé lu côté serveur (voir bibliotheque/session.ts) : aucun appel réseau
  // n'est nécessaire ici.
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|api|trpc|.*\\..*).*)"],
};
