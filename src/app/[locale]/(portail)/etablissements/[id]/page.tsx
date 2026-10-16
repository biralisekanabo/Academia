import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { ArrowLeft, Building2, Users } from "lucide-react";

import { exigerSuperAdmin } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import {
  Carte,
  CarteContenu,
  CarteTitre,
} from "@/composants/ui/carte";
import { Insigne } from "@/composants/ui/insigne";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import { Link } from "@/i18n/navigation";
import type { Entreprise, Utilisateur } from "@/types/base";

export default async function PageDetailEtablissement({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await exigerSuperAdmin();
  const t = await getTranslations("etablissements");
  const { id } = await params;
  const identifiant = Number(id);

  if (!Number.isInteger(identifiant)) {
    notFound();
  }

  const client = bd();

  const { data: etablissement } = await client
    .from("entreprises")
    .select("*")
    .eq("id", identifiant)
    .is("deleted_at", null)
    .maybeSingle<Entreprise>();

  if (!etablissement) {
    notFound();
  }

  const [{ data: succursales }, { data: utilisateurs }] = await Promise.all([
    client
      .from("entreprises")
      .select("*")
      .eq("entreprise_mere_id", identifiant)
      .is("deleted_at", null)
      .order("nom")
      .returns<Entreprise[]>(),
    client
      .from("utilisateurs")
      .select("*")
      .eq("entreprise_id", identifiant)
      .is("deleted_at", null)
      .order("nom_complet")
      .returns<Utilisateur[]>(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/etablissements"
          className="grid size-9 place-items-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent"
          aria-label={t("retour")}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {etablissement.nom}
          </h1>
          <p className="text-sm text-muted-foreground">
            {etablissement.sigle ?? "—"} · {etablissement.ville ?? "—"}
          </p>
        </div>
        <Insigne variante="parDefaut">
          {t(`statuts.${etablissement.statut}` as never)}
        </Insigne>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Info libelle={t("type")}>
          {t(`types.${etablissement.type_entreprise ?? "AUTRE"}` as never)}
        </Info>
        <Info libelle={t("telephone")}>{etablissement.telephone ?? "—"}</Info>
        <Info libelle={t("email")}>{etablissement.email ?? "—"}</Info>
      </div>

      <Carte className="rounded-3xl">
        <CarteContenu className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <CarteTitre className="text-base">
              {t("sectionSuccursales")}
            </CarteTitre>
          </div>
          {succursales && succursales.length > 0 ? (
            <ul className="divide-y rounded-xl border">
              {succursales.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="font-medium">{s.nom}</span>
                  <span className="text-muted-foreground">
                    {s.ville ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("aucuneSuccursale")}
            </p>
          )}
        </CarteContenu>
      </Carte>

      <Carte className="overflow-hidden rounded-3xl">
        <CarteContenu className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <CarteTitre className="text-base">
              {t("sectionUtilisateurs")}
            </CarteTitre>
          </div>
          {utilisateurs && utilisateurs.length > 0 ? (
            <Tableau>
              <TableauEntete>
                <TableauLigne>
                  <TableauEnteteCellule>{t("utilisateurNom")}</TableauEnteteCellule>
                  <TableauEnteteCellule>{t("utilisateurIdentifiant")}</TableauEnteteCellule>
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
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("aucunUtilisateur")}
            </p>
          )}
        </CarteContenu>
      </Carte>
    </div>
  );
}

function Info({
  libelle,
  children,
}: {
  libelle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="carte-vitrine rounded-2xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{libelle}</p>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}
