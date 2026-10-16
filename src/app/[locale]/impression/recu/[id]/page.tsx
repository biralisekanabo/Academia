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
  PaiementDette,
  Utilisateur,
} from "@/types/base";

export default async function PageRecu({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await connection();
  const { id } = await params;
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.CONSULTER");
  const t = await getTranslations("caisse");

  const paiementId = Number(id);
  if (!Number.isFinite(paiementId)) notFound();

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const client = bd();

  const { data: paiement } = await client
    .from("paiements")
    .select("*")
    .eq("id", paiementId)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<Paiement>();
  if (!paiement) notFound();

  const [etudiantR, caisseR, deviseR, entrepriseR, allocationsR, utilisateurR] =
    await Promise.all([
      client.from("etudiants").select("*").eq("id", paiement.etudiant_id).maybeSingle<Etudiant>(),
      client.from("caisses").select("*").eq("id", paiement.caisse_id).maybeSingle<Caisse>(),
      client.from("devises").select("*").eq("id", paiement.devise_id).maybeSingle<Devise>(),
      client.from("entreprises").select("*").eq("id", paiement.entreprise_id).maybeSingle<Entreprise>(),
      client.from("paiement_dettes").select("*").eq("paiement_id", paiement.id).returns<PaiementDette[]>(),
      paiement.enregistre_par
        ? client.from("utilisateurs").select("*").eq("id", paiement.enregistre_par).maybeSingle<Utilisateur>()
        : Promise.resolve({ data: null }),
    ]);

  const allocations = allocationsR.data ?? [];
  const idsDettes = allocations.map((a) => a.dette_id);
  const { data: dettes } = idsDettes.length
    ? await client.from("dettes").select("*").in("id", idsDettes).returns<Dette[]>()
    : { data: [] as Dette[] };
  const idsFrais = [...new Set((dettes ?? []).map((d) => d.frais_academique_id))];
  const { data: frais } = idsFrais.length
    ? await client.from("frais_academiques").select("*").in("id", idsFrais).returns<FraisAcademique[]>()
    : { data: [] as FraisAcademique[] };

  const dettesParId = new Map((dettes ?? []).map((d) => [d.id, d]));
  const fraisParId = new Map((frais ?? []).map((f) => [f.id, f]));

  const etudiant = etudiantR.data;
  const entreprise = entrepriseR.data;
  const devise = deviseR.data;
  const caisse = caisseR.data;
  const utilisateur = utilisateurR?.data ?? null;

  const nomComplet = etudiant
    ? [etudiant.nom, etudiant.postnom, etudiant.prenom].filter(Boolean).join(" ")
    : "—";

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-white p-8 text-slate-900 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <BoutonImpression />
      </div>

      <div className="rounded-2xl border p-8 print:border-0">
        <header className="flex items-start justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            {entreprise?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entreprise.logo} alt={entreprise.nom} className="h-16 w-16 rounded-xl object-contain" />
            )}
            <div>
              <h1 className="text-xl font-bold uppercase">{entreprise?.nom ?? ""}</h1>
              {entreprise?.sigle && <p className="text-sm text-slate-600">{entreprise.sigle}</p>}
              <p className="text-xs text-slate-500">
                {[entreprise?.adresse, entreprise?.ville, entreprise?.telephone]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{t("recuTitre")}</p>
            <p className="font-mono text-sm">{paiement.numero_recu}</p>
            <p className="text-xs text-slate-500">
              {new Date(paiement.date_paiement).toLocaleString()}
            </p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-500">{t("etudiant")}</p>
            <p className="font-semibold">{nomComplet}</p>
            <p className="font-mono text-xs">{etudiant?.matricule ?? ""}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-slate-500">{t("caisse")}</p>
            <p className="font-semibold">{caisse?.nom ?? "—"}</p>
            <p className="text-xs text-slate-500">
              {t("methode")} : {t(`methodes.${paiement.methode}` as never)}
            </p>
          </div>
        </section>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y bg-slate-50 text-left">
              <th className="py-2">{t("frais")}</th>
              <th className="py-2 text-right">{t("montant")}</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => {
              const dette = dettesParId.get(a.dette_id);
              const frais = dette ? fraisParId.get(dette.frais_academique_id) : undefined;
              return (
                <tr key={a.dette_id} className="border-b">
                  <td className="py-2">{frais?.libelle ?? "—"}</td>
                  <td className="py-2 text-right font-mono">{a.montant}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 text-right font-semibold">{t("total")}</td>
              <td className="pt-3 text-right font-mono text-lg font-bold">
                {paiement.montant} {devise?.code ?? ""}
              </td>
            </tr>
            {paiement.montant_reference !== null && (
              <tr>
                <td className="text-right text-xs text-slate-500">{t("montantReference")}</td>
                <td className="text-right font-mono text-xs text-slate-500">
                  {paiement.montant_reference}
                </td>
              </tr>
            )}
          </tfoot>
        </table>

        {paiement.reference_transaction && (
          <p className="mt-3 text-xs text-slate-500">
            {t("reference")} : {paiement.reference_transaction}
          </p>
        )}

        <footer className="mt-10 flex items-end justify-between text-xs text-slate-500">
          <div>
            <p>{t("enregistrePar")} : {utilisateur?.nom_complet ?? "—"}</p>
            <p className="mt-1">{t("recuMention")}</p>
          </div>
          <div className="text-center">
            <div className="h-12" />
            <p className="border-t pt-1">{t("signatureCachet")}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
