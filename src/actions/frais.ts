"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { schemaFrais, schemaStatutFrais, type DonneesFrais } from "@/schemas/frais";
import type { FraisAcademique, Session } from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

function nettoyer(valeur?: string): string | null {
  const v = valeur?.trim();
  return v ? v : null;
}

async function fraisDansPerimetre(
  session: Session,
  id: number
): Promise<FraisAcademique | null> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("frais_academiques")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<FraisAcademique>();
  return data ?? null;
}

async function journaliser(
  session: Session,
  action: string,
  cibleId: number
): Promise<void> {
  await bd().from("journal_audit").insert({
    entreprise_id: session.entrepriseId,
    utilisateur_id: session.utilisateurId,
    action,
    table_concernee: "frais_academiques",
    enregistrement_id: cibleId,
  });
}

function tranchesValides(d: DonneesFrais): string | null {
  const tranches = d.tranches ?? [];
  if (tranches.length === 0) return null;
  const total = tranches.reduce((s, t) => s + t.pourcentage, 0);
  if (total > 100.5) {
    return "Le total des tranches ne peut pas dépasser 100 %.";
  }
  return null;
}

async function remplacerTranches(
  fraisId: number,
  tranches: DonneesFrais["tranches"]
): Promise<void> {
  const client = bd();
  await client.from("frais_tranches").delete().eq("frais_academique_id", fraisId);
  if (!tranches || tranches.length === 0) return;
  await client.from("frais_tranches").insert(
    tranches.map((t, index) => ({
      frais_academique_id: fraisId,
      numero: index + 1,
      libelle: nettoyer(t.libelle),
      pourcentage: t.pourcentage,
      date_limite: t.date_limite || null,
    }))
  );
}

export async function creerFrais(donnees: Record<string, unknown>): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "FRAIS.CREER");

  const parse = schemaFrais.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;
  const erreurTranches = tranchesValides(d);
  if (erreurTranches) return { erreur: erreurTranches };

  const { data, error } = await bd()
    .from("frais_academiques")
    .insert({
      entreprise_id: session.entrepriseId,
      annee_academique_id: d.annee_academique_id,
      faculte_id: d.faculte_id ?? null,
      domaine_id: d.domaine_id ?? null,
      promotion_id: d.promotion_id ?? null,
      libelle: d.libelle.trim(),
      montant: d.montant,
      devise_id: d.devise_id,
      date_limite: nettoyer(d.date_limite),
      modalites: nettoyer(d.modalites),
      statut: "ACTIF",
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: "Impossible de créer les frais." };

  await remplacerTranches(data.id, d.tranches);
  await journaliser(session, "CREATION_FRAIS", data.id);
  revalidatePath("/[locale]/frais", "page");
  return { ok: true, id: data.id };
}

export async function modifierFrais(
  donnees: Record<string, unknown> & { id: number }
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "FRAIS.MODIFIER");

  const parse = schemaFrais.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await fraisDansPerimetre(session, donnees.id))) {
    return { erreur: "Frais introuvables." };
  }
  const d = parse.data;
  const erreurTranches = tranchesValides(d);
  if (erreurTranches) return { erreur: erreurTranches };

  const { error } = await bd()
    .from("frais_academiques")
    .update({
      annee_academique_id: d.annee_academique_id,
      faculte_id: d.faculte_id ?? null,
      domaine_id: d.domaine_id ?? null,
      promotion_id: d.promotion_id ?? null,
      libelle: d.libelle.trim(),
      montant: d.montant,
      devise_id: d.devise_id,
      date_limite: nettoyer(d.date_limite),
      modalites: nettoyer(d.modalites),
    })
    .eq("id", donnees.id);
  if (error) return { erreur: "Impossible de modifier les frais." };

  await remplacerTranches(donnees.id, d.tranches);
  await journaliser(session, "MODIFICATION_FRAIS", donnees.id);
  revalidatePath("/[locale]/frais", "page");
  return { ok: true };
}

export async function definirStatutFrais(
  id: number,
  statut: "ACTIF" | "INACTIF"
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "FRAIS.MODIFIER");

  const parse = schemaStatutFrais.safeParse({ id, statut });
  if (!parse.success) return { erreur: "Statut invalide." };
  if (!(await fraisDansPerimetre(session, id))) return { erreur: "Frais introuvables." };

  const { error } = await bd().from("frais_academiques").update({ statut }).eq("id", id);
  if (error) return { erreur: "Impossible de modifier le statut." };

  await journaliser(session, "STATUT_FRAIS", id);
  revalidatePath("/[locale]/frais", "page");
  return { ok: true };
}

export async function supprimerFrais(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "FRAIS.SUPPRIMER");

  if (!(await fraisDansPerimetre(session, id))) return { erreur: "Frais introuvables." };

  const { error } = await bd()
    .from("frais_academiques")
    .update({ deleted_at: new Date().toISOString(), statut: "INACTIF" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (des dettes y sont liées)." };

  await journaliser(session, "SUPPRESSION_FRAIS", id);
  revalidatePath("/[locale]/frais", "page");
  return { ok: true };
}
