import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import type { OptionRecherche } from "@/composants/partages/selecteur-recherche";
import { Link } from "@/i18n/navigation";
import { FormulaireEtudiant } from "@/fonctionnalites/etudiants/formulaire-etudiant";

export const instant = false;

export default async function PageNouvelEtudiant() {
  await connection();
  const t = await getTranslations();
  await obtenirProfilSousControle(["administrateur", "reception", "personnel"]);

  const supabase = await creerClientServeur();

  const [facultes, filieres] = await Promise.all([
    supabase
      .from("openlu_facultes")
      .select("id, code, nom")
      .order("ordre", { ascending: true }),
    supabase
      .from("openlu_filieres")
      .select("id, nom, openlu_facultes(code)")
      .order("nom", { ascending: true }),
  ]);

  const optionsFacultes: OptionRecherche[] =
    facultes.data?.map((f) => ({
      valeur: f.id,
      libelle: `${f.code} — ${f.nom}`,
      sousLibelle: f.nom,
    })) ?? [];

  const idsParCode = new Map(facultes.data?.map((f) => [f.code, f.id]) ?? []);

  const optionsFilieres: OptionRecherche[] =
    filieres.data?.map((f) => ({
      valeur: f.id,
      libelle: f.nom,
      sousLibelle: f.openlu_facultes?.code,
      groupe: f.openlu_facultes?.code
        ? idsParCode.get(f.openlu_facultes.code)
        : undefined,
    })) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/etudiants"
          className="lien-anime mb-2 items-center gap-1 text-sm font-medium text-brand-2 hover:text-brand-3"
        >
          ← {t("commun.retour")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t("etudiants.nouveau")}
        </h1>
      </div>

      <FormulaireEtudiant
        facultes={optionsFacultes}
        filieres={optionsFilieres}
      />
    </div>
  );
}