import { getLocale } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import {
  ListeEtudiants,
  type EtudiantLigne,
} from "@/fonctionnalites/etudiants/liste-etudiants";

export default async function PageEtudiants() {
  await connection();
  const locale = await getLocale();
  const profil = await obtenirProfilSousControle([
    "administrateur",
    "reception",
    "personnel",
    "finance",
  ]);

  const supabase = await creerClientServeur();

  const [resultatEtudiants, resultatFacultes, resultatFilieres] =
    await Promise.all([
      supabase
        .from("openlu_etudiants")
        .select(
          "id, matricule, filiere_id, niveau, annee_universitaire, statut, date_inscription, openlu_profils(prenom, nom), openlu_filieres(nom, faculte_id, openlu_facultes(code, nom))"
        )
        .order("cree_le", { ascending: false }),
      supabase
        .from("openlu_facultes")
        .select("id, code, nom")
        .order("ordre", { ascending: true }),
      supabase
        .from("openlu_filieres")
        .select("id, faculte_id, nom")
        .order("nom", { ascending: true }),
    ]);

  if (resultatEtudiants.error) {
    throw new Error("Impossible de charger la liste des Ã©tudiants.");
  }
  if (resultatFacultes.error) {
    throw new Error("Impossible de charger les facultÃ©s des Ã©tudiants.");
  }
  if (resultatFilieres.error) {
    throw new Error("Impossible de charger les filiÃ¨res des Ã©tudiants.");
  }

  return (
    <ListeEtudiants
      etudiants={(resultatEtudiants.data ?? []) as EtudiantLigne[]}
      role={profil.role}
      locale={locale}
      facultes={resultatFacultes.data ?? []}
      filieres={resultatFilieres.data ?? []}
    />
  );
}
