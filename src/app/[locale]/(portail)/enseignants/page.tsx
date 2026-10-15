import { getLocale } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import {
  ListeEnseignants,
  type EnseignantLigne,
} from "@/fonctionnalites/enseignants/liste-enseignants";

export default async function PageEnseignants() {
  await connection();
  const locale = await getLocale();
  const profil = await obtenirProfilSousControle([
    "administrateur",
    "reception",
    "personnel",
  ]);

  const supabase = await creerClientServeur();

  const resultat = await supabase
    .from("openlu_enseignants")
    .select("id, specialite, statut, date_embauche, openlu_profils(prenom, nom)")
    .order("cree_le", { ascending: false });

  if (resultat.error) {
    throw new Error("Impossible de charger la liste des enseignants.");
  }

  return (
    <ListeEnseignants
      enseignants={(resultat.data ?? []) as EnseignantLigne[]}
      role={profil.role}
      locale={locale}
    />
  );
}
