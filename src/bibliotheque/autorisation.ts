import { getLocale } from "next-intl/server";

import { obtenirSession } from "@/bibliotheque/supabase/session";
import { redirect } from "@/i18n/navigation";
import type { TypeRole } from "@/types/database";

export const ROLES_ADMINISTRATIFS: TypeRole[] = [
  "administrateur",
  "reception",
  "finance",
  "personnel",
];

export function estRoleAdministratif(role: TypeRole): boolean {
  return ROLES_ADMINISTRATIFS.includes(role);
}

export async function obtenirProfilSousControle(
  rolesAutorises?: TypeRole[]
) {
  const locale = await getLocale();
  const session = await obtenirSession();

  if (!session.profil) {
    redirect({ href: "/connexion", locale });
    throw new Error("Redirection vers la connexion");
  }

  if (rolesAutorises && !rolesAutorises.includes(session.profil.role)) {
    redirect({ href: "/tableau-de-bord", locale });
    throw new Error("Accès non autorisé");
  }

  return session.profil;
}