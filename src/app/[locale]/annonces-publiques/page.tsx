import { Megaphone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { TableauPublicAnnonces } from "@/fonctionnalites/annonces/tableau-public-annonces";

export default async function PageAnnoncesPubliques() {
  await connection();
  const [t, locale, supabase] = await Promise.all([
    getTranslations(),
    getLocale(),
    creerClientServeur(),
  ]);
  const { data, error } = await supabase
    .from("openlu_annonces")
    .select(
      "id, titre, contenu, publiee_le, cree_le, openlu_annonces_fichiers(id, nom, chemin, type_mime, taille_octets)"
    )
    .eq("publiee", true)
    .order("publiee_le", { ascending: false });

  if (error) {
    throw new Error("Impossible de charger les annonces publiques.");
  }

  const admin = creerClientAdmin();
  const annonces = await Promise.all(
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
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-8 sm:py-14">
        <header className="animate-entree flex items-center gap-4">
          <span className="degrade-brand grid size-12 place-items-center rounded-2xl text-white shadow-lg shadow-brand-1/25">
            <Megaphone className="size-6" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-brand-2">
              OPENLU
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("annonces.publiquesTitre")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("annonces.publiquesSousTitre")}
            </p>
          </div>
        </header>
        <TableauPublicAnnonces annonces={annonces} locale={locale} />
      </div>
    </main>
  );
}
