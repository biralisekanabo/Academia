import { cache } from "react";

import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import type { TypeRole } from "@/types/database";

export type Session = {
  utilisateur: {
    id: string;
    email: string | undefined;
  } | null;
  profil: {
    id: string;
    prenom: string;
    nom: string;
    role: TypeRole;
  } | null;
};

export const obtenirSession = cache(async (): Promise<Session> => {
  const supabase = await creerClientServeur();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { utilisateur: null, profil: null };
  }

  const { data: profil } = await supabase
    .from("openlu_profils")
    .select("id, prenom, nom, role")
    .eq("id", user.id)
    .single();

  return {
    utilisateur: { id: user.id, email: user.email ?? undefined },
    profil: profil
      ? {
          id: profil.id,
          prenom: profil.prenom,
          nom: profil.nom,
          role: profil.role,
        }
      : null,
  };
});