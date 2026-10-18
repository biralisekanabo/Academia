import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import type { Session } from "@/types/base";

const NOM_COOKIE = "eduplex_session";
const DUREE_SECONDES = 60 * 60 * 8; // 8 heures

function cle() {
  const secret = process.env.SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SESSION_SECRET manquant pour signer la session.");
  }
  return new TextEncoder().encode(secret);
}

export async function ecrireSession(session: Session): Promise<void> {
  const jeton = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_SECONDES}s`)
    .sign(cle());

  const magasin = await cookies();
  magasin.set(NOM_COOKIE, jeton, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DUREE_SECONDES,
  });
}

export const lireSession = cache(async function lireSession(): Promise<Session | null> {
  const magasin = await cookies();
  const jeton = magasin.get(NOM_COOKIE)?.value;
  if (!jeton) return null;

  try {
    const { payload } = await jwtVerify(jeton, cle());
    return {
      utilisateurId: Number(payload.utilisateurId),
      entrepriseId: Number(payload.entrepriseId),
      nomComplet: String(payload.nomComplet ?? ""),
      nomUtilisateur: String(payload.nomUtilisateur ?? ""),
      roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : [],
      estAdminPrincipal: Boolean(payload.estAdminPrincipal),
      doitChangerMotDePasse: Boolean(payload.doitChangerMotDePasse),
    };
  } catch {
    return null;
  }
});

export async function effacerSession(): Promise<void> {
  const magasin = await cookies();
  magasin.delete(NOM_COOKIE);
}
