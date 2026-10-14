import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { Recu } from "@/fonctionnalites/finances/recu";
import { montantEnLettresFr } from "@/utilitaires/format";

type ParametresPage = {
  searchParams: Promise<{ id?: string }>;
};

export const instant = false;

export default async function PageRecu({ searchParams }: ParametresPage) {
  await connection();
  const t = await getTranslations();
  const locale = await getLocale();
  await obtenirProfilSousControle(["finance"]);

  const { id } = await searchParams;

  if (!id) {
    return <p className="text-sm text-muted-foreground">{t("finances.aucun")}</p>;
  }

  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("openlu_paiements")
    .select(
      "reference, libelle, montant, methode, statut, date_paiement, openlu_profils(prenom, nom, openlu_etudiants(matricule, openlu_filieres(nom, openlu_facultes(nom))))"
    )
    .eq("id", id)
    .single();

  if (!data) {
    return <p className="text-sm text-muted-foreground">{t("finances.aucun")}</p>;
  }

  const profil = data.openlu_profils;
  const dossier = profil?.openlu_etudiants;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Recu
        reference={data.reference}
        libelle={data.libelle}
        montant={Number(data.montant)}
        devise="FCFA"
        datePaiement={data.date_paiement}
        methode={data.methode}
        prenom={profil?.prenom ?? ""}
        nom={profil?.nom ?? ""}
        matricule={dossier?.matricule ?? null}
        filiere={dossier?.openlu_filieres?.nom ?? null}
        faculte={dossier?.openlu_filieres?.openlu_facultes?.nom ?? null}
        montantLettres={montantEnLettresFr(Number(data.montant))}
        locale={locale}
      />
    </div>
  );
}