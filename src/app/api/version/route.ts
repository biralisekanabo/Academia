import { NextResponse } from "next/server";

/**
 * Renvoie l'identifiant de la version déployée (commit Git sur Vercel).
 * Le client compare cette valeur à celle chargée au démarrage pour détecter
 * un nouveau déploiement et proposer un rechargement.
 */
export function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_APP_VERSION ??
    "dev";

  return NextResponse.json(
    { version },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
