import { getTranslations } from "next-intl/server";
import { connection } from "next/server";

import { exigerSuperAdmin } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { Insigne } from "@/composants/ui/insigne";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import type { Entreprise, Utilisateur } from "@/types/base";

type LigneUtilisateur = Utilisateur & {
  entreprises: Pick<Entreprise, "nom" | "sigle"> | null;
};

export default async function PageUtilisateursPlateforme() {
  await connection();
  await exigerSuperAdmin();
  const t = await getTranslations("etablissements");

  const { data } = await bd()
    .from("utilisateurs")
    .select("*, entreprises(nom, sigle)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<LigneUtilisateur[]>();

  const utilisateurs = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("sectionUtilisateurs")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("nouveauSousTitre")}
        </p>
      </div>

      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("utilisateurNom")}</TableauEnteteCellule>
              <TableauEnteteCellule>
                {t("utilisateurIdentifiant")}
              </TableauEnteteCellule>
              <TableauEnteteCellule>{t("nom")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("statut")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {utilisateurs.map((u) => (
              <TableauLigne key={u.id}>
                <TableauCellule>
                  {u.nom_complet}
                  {u.est_admin_principal && (
                    <span className="ml-2 text-xs text-brand-2">
                      {t("adminPrincipal")}
                    </span>
                  )}
                </TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {u.nom_utilisateur}
                </TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {u.entreprises?.nom ?? "—"}
                </TableauCellule>
                <TableauCellule>
                  <Insigne
                    variante={u.statut === "ACTIF" ? "parDefaut" : "secondaire"}
                  >
                    {u.statut}
                  </Insigne>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>
    </div>
  );
}
