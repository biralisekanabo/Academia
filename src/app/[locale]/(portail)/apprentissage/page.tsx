import { ArrowRight, BookOpen, Layers, MonitorPlay, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { obtenirProfilSousControle } from "@/bibliotheque/autorisation";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { Insigne } from "@/composants/ui/insigne";
import { Link } from "@/i18n/navigation";

export const instant = false;

type ClasseItem = {
  id: string;
  code: string;
  titre: string;
  description: string | null;
  credits: number;
  semestre: number;
  enseignantNom: string | null;
};

export default async function PageApprentissage() {
  await connection();
  const t = await getTranslations();
  const profil = await obtenirProfilSousControle([
    "administrateur",
    "enseignant",
    "etudiant",
  ]);

  const supabase = await creerClientServeur();
  let classes: ClasseItem[] = [];

  if (profil.role === "etudiant") {
    const { data } = await supabase
      .from("openlu_inscriptions_cours")
      .select(
        "cours_id, openlu_cours(id, code, titre, description, credits, semestre, openlu_enseignants(openlu_profils(prenom, nom)))"
      )
      .eq("etudiant_id", profil.id)
      .order("date_inscription", { ascending: false });
    classes =
      data?.map((ligne) => {
        const c = ligne.openlu_cours;
        if (!c) return null;
        const prof = c.openlu_enseignants?.openlu_profils;
        return {
          id: c.id,
          code: c.code,
          titre: c.titre,
          description: c.description,
          credits: c.credits,
          semestre: c.semestre,
          enseignantNom: prof ? `${prof.prenom} ${prof.nom}`.trim() : null,
        } satisfies ClasseItem;
      })
        .filter(Boolean) as ClasseItem[] ?? [];
  } else if (profil.role === "enseignant") {
    const { data } = await supabase
      .from("openlu_cours")
      .select(
        "id, code, titre, description, credits, semestre, openlu_enseignants(openlu_profils(prenom, nom))"
      )
      .eq("enseignant_id", profil.id)
      .order("semestre", { ascending: true })
      .order("code", { ascending: true });
    classes =
      data?.map((c) => {
        const prof = c.openlu_enseignants?.openlu_profils;
        return {
          id: c.id,
          code: c.code,
          titre: c.titre,
          description: c.description,
          credits: c.credits,
          semestre: c.semestre,
          enseignantNom: prof ? `${prof.prenom} ${prof.nom}`.trim() : null,
        } satisfies ClasseItem;
      }) ?? [];
  } else {
    const { data } = await supabase
      .from("openlu_cours")
      .select(
        "id, code, titre, description, credits, semestre, openlu_enseignants(openlu_profils(prenom, nom))"
      )
      .order("semestre", { ascending: true })
      .order("code", { ascending: true });
    classes =
      data?.map((c) => {
        const prof = c.openlu_enseignants?.openlu_profils;
        return {
          id: c.id,
          code: c.code,
          titre: c.titre,
          description: c.description,
          credits: c.credits,
          semestre: c.semestre,
          enseignantNom: prof ? `${prof.prenom} ${prof.nom}`.trim() : null,
        } satisfies ClasseItem;
      }) ?? [];
  }

  const parSemestre = new Map<number, ClasseItem[]>();
  for (const c of classes) {
    const liste = parSemestre.get(c.semestre) ?? [];
    liste.push(c);
    parSemestre.set(c.semestre, liste);
  }
  const groupes = [...parSemestre.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="space-y-6">
      <EnTetePage
        icone={MonitorPlay}
        titre={t("apprentissage.titre")}
        sousTitre={t("apprentissage.sousTitre")}
      />

      {classes.length === 0 ? (
        <div className="carte-vitrine halo-gradiant animate-entree flex flex-col items-center gap-4 rounded-2xl border bg-card py-20 text-center shadow-sm">
          <span className="degrade-brand grid size-14 place-items-center rounded-2xl text-white shadow-md shadow-brand-1/25">
            <MonitorPlay className="size-7" />
          </span>
          <p className="text-sm text-muted-foreground">{t("apprentissage.aucun")}</p>
        </div>
      ) : (
        groupes.map(([semestre, liste]) => (
          <section key={semestre} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Layers className="size-4" />
              {t("cours.semestreNumero", { numero: semestre })}
              <Insigne variante="secondaire">{liste.length}</Insigne>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {liste.map((c) => (
                <article
                  key={c.id}
                  className="carte-vitrine balayage-survol animate-entree group relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-1/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="degrade-brand degrade-anime grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-md shadow-brand-1/25">
                      <BookOpen className="size-5" />
                    </span>
                    <Insigne variante="secondaire" className="font-mono text-[11px]">
                      {c.code}
                    </Insigne>
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/cours/${c.id}`}
                      className="block truncate font-semibold transition-colors hover:text-brand-2"
                    >
                      {c.titre}
                    </Link>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 truncate">
                      <User className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {c.enseignantNom ?? t("cours.sansEnseignant")}
                      </span>
                    </span>
                    <span>{t("cours.creditsCourt", { valeur: c.credits })}</span>
                  </div>
                  <Link
                    href={`/cours/${c.id}`}
                    className="lien-anime inline-flex w-fit items-center gap-1.5 text-xs font-medium"
                  >
                    {t("cours.ouvrirClasse")}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
