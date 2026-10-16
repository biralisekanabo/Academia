import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Landmark } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { GestionComptabilite } from "@/fonctionnalites/comptabilite/gestion-comptabilite";
import type {
  EcritureVue,
  LigneBalance,
  LigneEcritureVue,
} from "@/fonctionnalites/comptabilite/types";
import type {
  CompteComptable,
  Ecriture,
  EcritureLigne,
  JournalComptable,
} from "@/types/base";

export default async function PageComptabilite() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.CONSULTER");
  const t = await getTranslations("comptabilite");

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const [comptesR, journauxR, ecrituresR] = await Promise.all([
    client.from("comptes_comptables").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("code").returns<CompteComptable[]>(),
    client.from("journaux").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("code").returns<JournalComptable[]>(),
    client.from("ecritures").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("date_ecriture", { ascending: false }).returns<Ecriture[]>(),
  ]);

  const comptes = comptesR.data ?? [];
  const journaux = journauxR.data ?? [];
  const ecritures = ecrituresR.data ?? [];

  const idsEcritures = ecritures.map((e) => e.id);
  const { data: lignesData } = idsEcritures.length
    ? await client.from("ecriture_lignes").select("*").in("ecriture_id", idsEcritures).returns<EcritureLigne[]>()
    : { data: [] as EcritureLigne[] };
  const lignes = lignesData ?? [];

  const lignesParEcriture = new Map<number, LigneEcritureVue[]>();
  for (const l of lignes) {
    const arr = lignesParEcriture.get(l.ecriture_id) ?? [];
    arr.push({ compte_id: l.compte_id, debit: Number(l.debit), credit: Number(l.credit), libelle: l.libelle });
    lignesParEcriture.set(l.ecriture_id, arr);
  }

  const ecrituresVues: EcritureVue[] = ecritures.map((e) => ({
    ...e,
    lignes: lignesParEcriture.get(e.id) ?? [],
  }));

  const idsValidees = new Set(ecritures.filter((e) => e.statut === "VALIDEE").map((e) => e.id));
  const cumul = new Map<number, { debit: number; credit: number }>();
  for (const l of lignes) {
    if (!idsValidees.has(l.ecriture_id)) continue;
    const agg = cumul.get(l.compte_id) ?? { debit: 0, credit: 0 };
    agg.debit += Number(l.debit);
    agg.credit += Number(l.credit);
    cumul.set(l.compte_id, agg);
  }
  const comptesParId = new Map(comptes.map((c) => [c.id, c]));
  const balance: LigneBalance[] = [...cumul.entries()]
    .map(([compte_id, v]) => {
      const compte = comptesParId.get(compte_id);
      return {
        compte_id,
        code: compte?.code ?? String(compte_id),
        libelle: compte?.libelle ?? "—",
        debit: v.debit,
        credit: v.credit,
        solde: v.debit - v.credit,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="space-y-6">
      <EnTetePage icone={Landmark} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionComptabilite
        comptes={comptes}
        journaux={journaux}
        ecritures={ecrituresVues}
        balance={balance}
      />
    </div>
  );
}
