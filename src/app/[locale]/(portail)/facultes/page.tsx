import { School } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import {
  ExplorateurFacultes,
  type FaculteDeRecherche,
  type FiliereDeRecherche,
} from "@/fonctionnalites/facultes/explorateur-facultes";

export const instant = false;

export default async function PageFacultes() {
  await connection();
  const t = await getTranslations();
  await obtenirProfilSousControle(["administrateur", "reception"]);

  const supabase = await creerClientServeur();

  const [facultes, filieres] = await Promise.all([
    supabase
      .from("openlu_facultes")
      .select("id, code, nom, description")
      .order("ordre", { ascending: true }),
    supabase
      .from("openlu_filieres")
      .select("id, code, nom, faculteId:faculte_id")
      .order("nom", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={School}
        titre={t("factures.titre")}
        sousTitre={t("factures.sousTitre")}
      />

      <ExplorateurFacultes
        facultes={(facultes.data ?? []) as FaculteDeRecherche[]}
        filieres={(filieres.data ?? []) as FiliereDeRecherche[]}
      />
    </div>
  );
}