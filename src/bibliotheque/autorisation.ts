import "server-only";

import { cache } from "react";
import { getLocale } from "next-intl/server";

import { bd } from "@/bibliotheque/bd";
import { lireSession } from "@/bibliotheque/session";
import { redirect } from "@/i18n/navigation";
import type { Session } from "@/types/base";

/** Session obligatoire, sinon redirection vers la connexion. */
export const exigerSession = cache(async function exigerSession(): Promise<Session> {
  const session = await lireSession();
  if (!session) {
    const locale = await getLocale();
    redirect({ href: "/connexion", locale });
    throw new Error("Redirection vers la connexion");
  }
  return session;
});

/** Réservé au super administrateur de la plateforme. */
export async function exigerSuperAdmin(): Promise<Session> {
  const session = await exigerSession();
  if (!session.roles.includes("SUPER_ADMIN")) {
    const locale = await getLocale();
    redirect({ href: "/accueil", locale });
    throw new Error("Accès réservé au super administrateur");
  }
  return session;
}

export function estSuperAdmin(session: Session): boolean {
  return session.roles.includes("SUPER_ADMIN");
}

/** Charge la liste des codes de permission effectifs de l'utilisateur. */
export const chargerPermissions = cache(async function chargerPermissions(
  utilisateurId: number
): Promise<Set<string>> {
  const { data } = await bd()
    .from("utilisateur_roles")
    .select(
      "role_id, roles!inner(role_permissions!inner(permissions!inner(code)))"
    )
    .eq("utilisateur_id", utilisateurId);

  const codes = new Set<string>();
  type Ligne = {
    roles: {
      role_permissions: { permissions: { code: string } | null }[] | null;
    } | null;
  };
  for (const ligne of (data ?? []) as unknown as Ligne[]) {
    for (const rp of ligne.roles?.role_permissions ?? []) {
      if (rp.permissions?.code) codes.add(rp.permissions.code);
    }
  }
  return codes;
});

/** Exige une permission précise (module.action). */
export async function exigerPermission(
  session: Session,
  permission: string
): Promise<void> {
  if (session.roles.includes("SUPER_ADMIN")) return;
  const permissions = await chargerPermissions(session.utilisateurId);
  if (!permissions.has(permission)) {
    const locale = await getLocale();
    redirect({ href: "/accueil", locale });
    throw new Error("Permission insuffisante");
  }
}
