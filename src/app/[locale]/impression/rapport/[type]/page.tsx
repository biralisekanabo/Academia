import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { BoutonImpression } from "@/fonctionnalites/caisse/bouton-impression";
import type {
  Caisse,
  Devise,
  Dette,
  Entreprise,
  Etudiant,
  FraisAcademique,
  Paiement,
  VueSituationEtudiant,
  VueSoldeCaisse,
} from "@/types/base";

const TYPES = ["etudiants", "dettes", "caisse", "encaissements"] as const;
type TypeRapport = (typeof TYPES)[number];

export default async function PageRapportImpression({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}) {
  await connection();
  const { type } = await params;
  if (!TYPES.includes(type as TypeRapport)) notFound();
  const typeRapport = type as TypeRapport;

  const session = await exigerSession();
  await exigerPermission(session, "RAPPORTS.CONSULTER");
  const t = await getTranslations("rapports");
  const tc = await getTranslations("caisse");
  const tf = await getTranslations("frais");

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const { data: entreprise } = await client
    .from("entreprises")
    .select("*")
    .eq("id", session.entrepriseId)
    .maybeSingle<Entreprise>();
  const { data: devises } = await client
    .from("devises")
    .select("*")
    .in("entreprise_id", perimetre)
    .returns<Devise[]>();
  const deviseParId = new Map((devises ?? []).map((d) => [d.id, d.code]));

  let contenu: React.ReactNode = null;

  if (typeRapport === "etudiants") {
    const { data } = await client
      .from("vue_situation_etudiants")
      .select("*")
      .in("entreprise_id", perimetre)
      .order("nom")
      .returns<VueSituationEtudiant[]>();
    const lignes = data ?? [];
    contenu = (
      <Tableau
        entetes={[t("colonnes.matricule"), t("colonnes.nom"), t("colonnes.du"), t("colonnes.reduction"), t("colonnes.paye"), t("colonnes.solde")]}
        lignes={lignes.map((e) => [
          e.matricule,
          [e.nom, e.postnom, e.prenom].filter(Boolean).join(" "),
          e.total_du,
          e.total_reduction,
          e.total_paye,
          e.total_solde,
        ])}
      />
    );
  } else if (typeRapport === "dettes") {
    const [{ data: dettes }, { data: etudiants }, { data: frais }] = await Promise.all([
      client.from("dettes").select("*").in("entreprise_id", perimetre).is("deleted_at", null).order("created_at", { ascending: false }).returns<Dette[]>(),
      client.from("etudiants").select("*").in("entreprise_id", perimetre).returns<Etudiant[]>(),
      client.from("frais_academiques").select("*").in("entreprise_id", perimetre).returns<FraisAcademique[]>(),
    ]);
    const etudiantParId = new Map((etudiants ?? []).map((e) => [e.id, e]));
    const fraisParId = new Map((frais ?? []).map((f) => [f.id, f]));
    const lignes = dettes ?? [];
    contenu = (
      <Tableau
        entetes={[t("colonnes.etudiant"), t("colonnes.frais"), t("colonnes.initial"), t("colonnes.reduction"), t("colonnes.paye"), t("colonnes.solde"), t("colonnes.statut")]}
        lignes={lignes.map((d) => {
          const e = etudiantParId.get(d.etudiant_id);
          return [
            e ? `${e.matricule} — ${e.nom} ${e.prenom}` : "—",
            fraisParId.get(d.frais_academique_id)?.libelle ?? "—",
            d.montant_initial,
            d.montant_reduction,
            d.montant_paye,
            `${d.solde} ${deviseParId.get(d.devise_id) ?? ""}`,
            tf(`statutsDette.${d.statut}` as never),
          ];
        })}
      />
    );
  } else if (typeRapport === "caisse") {
    const { data } = await client
      .from("vue_solde_caisse")
      .select("*")
      .in("entreprise_id", perimetre)
      .order("code")
      .returns<VueSoldeCaisse[]>();
    const lignes = data ?? [];
    contenu = (
      <Tableau
        entetes={[t("colonnes.code"), t("colonnes.nom"), t("colonnes.statut"), t("colonnes.soldeInitial"), t("colonnes.soldeCourant")]}
        lignes={lignes.map((c) => [
          c.code,
          c.nom,
          tc(`statuts.${c.statut}` as never),
          `${c.solde_initial} ${deviseParId.get(c.devise_id) ?? ""}`,
          `${c.solde_courant} ${deviseParId.get(c.devise_id) ?? ""}`,
        ])}
      />
    );
  } else {
    const { data: paiements } = await client
      .from("paiements")
      .select("*")
      .in("entreprise_id", perimetre)
      .is("deleted_at", null)
      .order("date_paiement", { ascending: false })
      .returns<Paiement[]>();
    const [{ data: etudiants }, { data: caisses }] = await Promise.all([
      client.from("etudiants").select("*").in("entreprise_id", perimetre).returns<Etudiant[]>(),
      client.from("caisses").select("*").in("entreprise_id", perimetre).returns<Caisse[]>(),
    ]);
    const etudiantParId = new Map((etudiants ?? []).map((e) => [e.id, e]));
    const caisseParId = new Map((caisses ?? []).map((c) => [c.id, c]));
    const lignes = paiements ?? [];
    contenu = (
      <Tableau
        entetes={[t("colonnes.recu"), t("colonnes.date"), t("colonnes.etudiant"), t("colonnes.caisse"), t("colonnes.methode"), t("colonnes.montant"), t("colonnes.statut")]}
        lignes={lignes.map((p) => {
          const e = etudiantParId.get(p.etudiant_id);
          return [
            p.numero_recu,
            new Date(p.date_paiement).toLocaleDateString(),
            e ? `${e.nom} ${e.prenom}` : "—",
            caisseParId.get(p.caisse_id)?.nom ?? "—",
            tc(`methodes.${p.methode}` as never),
            `${p.montant} ${deviseParId.get(p.devise_id) ?? ""}`,
            tc(`statutsPaiement.${p.statut}` as never),
          ];
        })}
      />
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-white p-8 text-slate-900 print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <BoutonImpression />
      </div>
      <div className="rounded-2xl border p-8 print:border-0">
        <header className="mb-6 flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            {entreprise?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entreprise.logo} alt={entreprise.nom} className="h-14 w-14 rounded-xl object-contain" />
            )}
            <div>
              <h1 className="text-lg font-bold uppercase">{entreprise?.nom ?? ""}</h1>
              {entreprise?.sigle && <p className="text-sm text-slate-600">{entreprise.sigle}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{t(`${typeRapport}.titre` as never)}</p>
            <p className="text-xs text-slate-500">{new Date().toLocaleString()}</p>
          </div>
        </header>
        {contenu}
      </div>
    </div>
  );
}

function Tableau({
  entetes,
  lignes,
}: {
  entetes: string[];
  lignes: (string | number)[][];
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-y bg-slate-50 text-left">
          {entetes.map((e, i) => (
            <th key={i} className="py-2 pr-3">{e}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.length === 0 && (
          <tr>
            <td colSpan={entetes.length} className="py-8 text-center text-slate-400">
              —
            </td>
          </tr>
        )}
        {lignes.map((ligne, i) => (
          <tr key={i} className="border-b">
            {ligne.map((cellule, j) => (
              <td key={j} className="py-2 pr-3">{cellule}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
