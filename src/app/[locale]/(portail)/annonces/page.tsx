import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import {
  GestionAnnonces,
  type AnnonceAdmin,
} from "@/fonctionnalites/annonces/gestion-annonces";
import { Megaphone } from "lucide-react";

export default async function PageGestionAnnonces() {
  await connection();
  await obtenirProfilSousControle(["administrateur"]);
  const [t, locale] = await Promise.all([
    getTranslations(),
    getLocale(),
  ]);
  const admin = creerClientAdmin();
  const { data, error } = await admin
    .from("openlu_annonces")
    .select(
      "id, titre, contenu, publiee, publiee_le, cree_le, openlu_annonces_fichiers(id, nom, chemin, type_mime, taille_octets)"
    )
    .order("cree_le", { ascending: false });

  if (error) {
    throw new Error("Impossible de charger les annonces.");
  }

  const annonces: AnnonceAdmin[] = await Promise.all(
    (data ?? []).map(async (annonce) => ({
      ...annonce,
      fichiers: await Promise.all(
        (annonce.openlu_annonces_fichiers ?? []).map(async (fichier) => {
          const { data: url, error: erreurUrl } = await admin.storage
            .from("openlu_annonces")
            .createSignedUrl(fichier.chemin, 60 * 60);
          if (erreurUrl) {
            throw new Error("Impossible de crÃ©er un lien temporaire pour une piÃ¨ce jointe.");
          }
          return { ...fichier, url: url.signedUrl };
        })
      ),
    }))
  );

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={Megaphone}
        titre={t("annonces.gestionTitre")}
        sousTitre={t("annonces.gestionSousTitre")}
      />
      <GestionAnnonces annonces={annonces} locale={locale} />
    </div>
  );
}
