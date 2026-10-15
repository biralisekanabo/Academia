import { ArrowRight, BookOpen, LayoutDashboard, Users } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { obtenirSession } from "@/bibliotheque/supabase/session";
import { Compteur } from "@/composants/partages/compteur";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import { navigationParRole } from "@/constantes/navigation-portail";
import { Link } from "@/i18n/navigation";
import type { TypeRole } from "@/types/database";
import { formatDateLongue } from "@/utilitaires/format";

export default async function PageTableauDeBord() {
  await connection();
  const t = await getTranslations();
  const locale = await getLocale();
  const session = await obtenirSession();
  const profil = session.profil;

  if (!profil) return null;

  const estFinance = profil.role === "finance";

  const supabase = await creerClientServeur();

  const [etudiants, cours, enseignants, derniersEtudiants] = await Promise.all([
    supabase.from("openlu_etudiants").select("*", { count: "exact", head: true }),
    supabase.from("openlu_cours").select("*", { count: "exact", head: true }),
    supabase.from("openlu_enseignants").select("*", { count: "exact", head: true }),
    supabase
      .from("openlu_etudiants")
      .select(
        "id, matricule, niveau, date_inscription, statut, openlu_profils(prenom, nom), openlu_filieres(nom, openlu_facultes(code))"
      )
      .order("cree_le", { ascending: false })
      .limit(5),
  ]);

  let encaissements = 0;
  if (estFinance) {
    const { data } = await supabase
      .from("openlu_paiements")
      .select("montant")
      .eq("statut", "valide");
    encaissements = (data ?? []).reduce((somme, p) => somme + Number(p.montant), 0);
  }

  const accesRapide = navigationParRole[profil.role as TypeRole]?.slice(0, 4) ?? [];

  return (
    <div className="space-y-8">
      <EnTetePage
        icone={LayoutDashboard}
        titre={
          <>
            {t("commun.bienvenue")},{" "}
            <span className="texte-degrade">{profil.prenom}</span>
          </>
        }
        sousTitre={t("tableauDeBord.sousTitre")}
      />

      {/* Statistiques */}
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
        <CarteStat
          delai={0}
          icone={() => <Users className="size-4" />}
          valeur={etudiants.count ?? 0}
          libelle={t("tableauDeBord.etudiantsActifs")}
        />
        <CarteStat
          delai={80}
          icone={() => <BookOpen className="size-4" />}
          valeur={cours.count ?? 0}
          libelle={t("tableauDeBord.coursProposes")}
        />
        <CarteStat
          delai={160}
          icone={() => <Users className="size-4" />}
          valeur={enseignants.count ?? 0}
          libelle={t("tableauDeBord.enseignantsActifs")}
        />
        {estFinance && (
          <CarteStat
            delai={240}
            icone={() => <span className="text-sm font-bold">F</span>}
            valeur={encaissements}
            libelle="EncaissÃ©"
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* AccÃ¨s rapide */}
        <section
          className="animate-entree rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2"
          style={{ ["--delai" as string]: "120ms" }}
        >
          <h2 className="mb-4 text-lg font-semibold">
            {t("tableauDeBord.accesRapide")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {accesRapide.map(({ titreCle, lien, icone: Icone }) => (
              <Link
                key={lien}
                href={lien}
                className="carte-vitrine halo-gradiant balayage-survol group flex items-center gap-3 rounded-xl border bg-background/40 p-3"
              >
                <span className="degrade-brand degrade-anime grid size-9 shrink-0 place-items-center rounded-lg text-white shadow-md shadow-brand-1/25 transition-transform duration-300 group-hover:scale-110">
                  <Icone className="size-4" />
                </span>
                <span className="flex-1 text-sm font-medium">
                  {t(titreCle as never)}
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-brand-2" />
              </Link>
            ))}
          </div>
        </section>

        {/* DerniÃ¨res inscriptions */}
        <section
          className="animate-entree rounded-2xl border bg-card p-5 shadow-sm lg:col-span-3"
          style={{ ["--delai" as string]: "200ms" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {t("tableauDeBord.dernieresInscriptions")}
            </h2>
            <Link
              href="/etudiants"
              className="lien-anime text-sm font-medium text-brand-2 hover:text-brand-3"
            >
              {t("tableauDeBord.afficherTout")}
            </Link>
          </div>

          {(derniersEtudiants.data?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("tableauDeBord.aucuneInscription")}
            </p>
          ) : (
            <Tableau>
              <TableauEntete>
                <tr>
                  <TableauEnteteCellule>{t("etudiants.matricule")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("etudiants.nom")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("etudiants.filiere")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("etudiants.dateInscription")}</TableauEnteteCellule>
                </tr>
              </TableauEntete>
              <TableauCorps>
                {derniersEtudiants.data?.map((e) => (
                  <TableauLigne key={e.id} className="ligne-animee">
                    <TableauCellule className="font-mono text-xs text-muted-foreground">
                      {e.matricule}
                    </TableauCellule>
                    <TableauCellule className="font-medium">
                      {e.openlu_profils?.prenom} {e.openlu_profils?.nom}
                    </TableauCellule>
                    <TableauCellule>
                      {e.openlu_filieres?.nom}
                      <span className="text-xs text-muted-foreground">
                        {" Â· "}
                        {e.openlu_filieres?.openlu_facultes?.code}
                      </span>
                    </TableauCellule>
                    <TableauCellule className="text-muted-foreground">
                      {formatDateLongue(e.date_inscription, locale)}
                    </TableauCellule>
                  </TableauLigne>
                ))}
              </TableauCorps>
            </Tableau>
          )}
        </section>
      </div>
    </div>
  );
}

function CarteStat({
  icone: Icone,
  valeur,
  libelle,
  delai = 0,
}: {
  icone: () => React.ReactNode;
  valeur: number;
  libelle: string;
  delai?: number;
}) {
  return (
    <div
      className="carte-vitrine halo-gradiant balayage-survol animate-entree group flex flex-col rounded-2xl border bg-card p-3.5 shadow-sm"
      style={{ ["--delai" as string]: `${delai}ms` }}
    >
      <span className="degrade-brand degrade-anime grid size-9 place-items-center rounded-lg text-white shadow-md shadow-brand-1/25 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
        <Icone />
      </span>
      <p className="mt-3 text-2xl font-extrabold tracking-tight tabular-nums">
        <Compteur valeur={valeur} />
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{libelle}</p>
    </div>
  );
}
