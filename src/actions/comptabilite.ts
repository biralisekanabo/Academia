"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { genererNumero } from "@/bibliotheque/numerotation";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import {
  schemaCompte,
  schemaEcriture,
  schemaJournal,
  schemaStatutCompte,
  type DonneesEcriture,
} from "@/schemas/comptabilite";
import type {
  CompteComptable,
  Ecriture,
  EcritureLigne,
  JournalComptable,
  Session,
} from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

function nettoyer(valeur?: string): string | null {
  const v = valeur?.trim();
  return v ? v : null;
}

async function journaliser(
  session: Session,
  action: string,
  table: string,
  cibleId: number
): Promise<void> {
  await bd().from("journal_audit").insert({
    entreprise_id: session.entrepriseId,
    utilisateur_id: session.utilisateurId,
    action,
    table_concernee: table,
    enregistrement_id: cibleId,
  });
}

// --- Plan comptable -------------------------------------------

async function compteDansPerimetre(
  session: Session,
  id: number
): Promise<CompteComptable | null> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("comptes_comptables")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<CompteComptable>();
  return data ?? null;
}

export async function creerCompte(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.CREER");

  const parse = schemaCompte.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;
  if (d.compte_parent_id && !(await compteDansPerimetre(session, d.compte_parent_id))) {
    return { erreur: "Compte parent introuvable." };
  }

  const { data, error } = await bd()
    .from("comptes_comptables")
    .insert({
      entreprise_id: session.entrepriseId,
      code: d.code.trim(),
      libelle: d.libelle.trim(),
      classe: d.classe,
      type_compte: d.type_compte,
      compte_parent_id: d.compte_parent_id ?? null,
      est_synthetique: d.est_synthetique ?? false,
      statut: "ACTIF",
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: "Impossible de créer le compte (code déjà utilisé ?)." };

  await journaliser(session, "CREATION_COMPTE", "comptes_comptables", data.id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true, id: data.id };
}

export async function modifierCompte(
  donnees: Record<string, unknown> & { id: number }
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.MODIFIER");

  const parse = schemaCompte.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await compteDansPerimetre(session, donnees.id))) {
    return { erreur: "Compte introuvable." };
  }
  const d = parse.data;
  if (d.compte_parent_id === donnees.id) {
    return { erreur: "Un compte ne peut pas être son propre parent." };
  }

  const { error } = await bd()
    .from("comptes_comptables")
    .update({
      code: d.code.trim(),
      libelle: d.libelle.trim(),
      classe: d.classe,
      type_compte: d.type_compte,
      compte_parent_id: d.compte_parent_id ?? null,
      est_synthetique: d.est_synthetique ?? false,
    })
    .eq("id", donnees.id);
  if (error) return { erreur: "Impossible de modifier le compte." };

  await journaliser(session, "MODIFICATION_COMPTE", "comptes_comptables", donnees.id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true };
}

export async function definirStatutCompte(
  id: number,
  statut: "ACTIF" | "INACTIF"
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.MODIFIER");

  const parse = schemaStatutCompte.safeParse({ id, statut });
  if (!parse.success) return { erreur: "Statut invalide." };
  if (!(await compteDansPerimetre(session, id))) return { erreur: "Compte introuvable." };

  const { error } = await bd().from("comptes_comptables").update({ statut }).eq("id", id);
  if (error) return { erreur: "Impossible de modifier le statut." };

  await journaliser(session, "STATUT_COMPTE", "comptes_comptables", id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true };
}

export async function supprimerCompte(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.SUPPRIMER");

  if (!(await compteDansPerimetre(session, id))) return { erreur: "Compte introuvable." };

  const { error } = await bd()
    .from("comptes_comptables")
    .update({ deleted_at: new Date().toISOString(), statut: "INACTIF" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (des écritures y sont liées)." };

  await journaliser(session, "SUPPRESSION_COMPTE", "comptes_comptables", id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true };
}

// --- Journaux --------------------------------------------------

async function journalDansPerimetre(
  session: Session,
  id: number
): Promise<JournalComptable | null> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("journaux")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<JournalComptable>();
  return data ?? null;
}

export async function creerJournal(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.CREER");

  const parse = schemaJournal.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;

  const { data, error } = await bd()
    .from("journaux")
    .insert({
      entreprise_id: session.entrepriseId,
      code: d.code.trim(),
      nom: d.nom.trim(),
      type: d.type,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: "Impossible de créer le journal (code déjà utilisé ?)." };

  await journaliser(session, "CREATION_JOURNAL", "journaux", data.id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true, id: data.id };
}

export async function modifierJournal(
  donnees: Record<string, unknown> & { id: number }
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.MODIFIER");

  const parse = schemaJournal.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await journalDansPerimetre(session, donnees.id))) {
    return { erreur: "Journal introuvable." };
  }
  const d = parse.data;

  const { error } = await bd()
    .from("journaux")
    .update({ code: d.code.trim(), nom: d.nom.trim(), type: d.type })
    .eq("id", donnees.id);
  if (error) return { erreur: "Impossible de modifier le journal." };

  await journaliser(session, "MODIFICATION_JOURNAL", "journaux", donnees.id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true };
}

export async function supprimerJournal(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.SUPPRIMER");

  if (!(await journalDansPerimetre(session, id))) return { erreur: "Journal introuvable." };

  const { error } = await bd()
    .from("journaux")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (des écritures y sont liées)." };

  await journaliser(session, "SUPPRESSION_JOURNAL", "journaux", id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true };
}

// --- Écritures comptables -------------------------------------

async function ecritureDansPerimetre(
  session: Session,
  id: number
): Promise<Ecriture | null> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("ecritures")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<Ecriture>();
  return data ?? null;
}

async function remplacerLignes(
  ecritureId: number,
  lignes: DonneesEcriture["lignes"]
): Promise<{ erreur?: string }> {
  const client = bd();
  const { error: erreurSuppression } = await client
    .from("ecriture_lignes")
    .delete()
    .eq("ecriture_id", ecritureId);
  if (erreurSuppression) return { erreur: "Impossible de mettre à jour les lignes." };

  const { error } = await client.from("ecriture_lignes").insert(
    lignes.map((l) => ({
      ecriture_id: ecritureId,
      compte_id: l.compte_id,
      debit: l.debit,
      credit: l.credit,
      libelle: nettoyer(l.libelle),
    }))
  );
  if (error) return { erreur: "Impossible d'enregistrer les lignes." };
  return {};
}

export async function creerEcriture(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.CREER");

  const parse = schemaEcriture.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;
  if (!(await journalDansPerimetre(session, d.journal_id))) {
    return { erreur: "Journal introuvable." };
  }

  const annee = new Date(d.date_ecriture).getFullYear();
  let numero: string;
  try {
    numero = await genererNumero(session.entrepriseId, "ECRITURE", "ECR", annee, 5);
  } catch {
    return { erreur: "Numérotation indisponible." };
  }

  const { data, error } = await bd()
    .from("ecritures")
    .insert({
      entreprise_id: session.entrepriseId,
      journal_id: d.journal_id,
      numero,
      date_ecriture: d.date_ecriture,
      libelle: d.libelle.trim(),
      piece_reference: nettoyer(d.piece_reference),
      statut: "BROUILLON",
    })
    .select("id")
    .single<{ id: number }>();
  if (error || !data) return { erreur: "Impossible de créer l'écriture." };

  const res = await remplacerLignes(data.id, d.lignes);
  if (res.erreur) return { erreur: res.erreur };

  await journaliser(session, "CREATION_ECRITURE", "ecritures", data.id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true, id: data.id };
}

export async function modifierEcriture(
  donnees: Record<string, unknown> & { id: number }
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.MODIFIER");

  const parse = schemaEcriture.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const existante = await ecritureDansPerimetre(session, donnees.id);
  if (!existante) return { erreur: "Écriture introuvable." };
  if (existante.statut !== "BROUILLON") {
    return { erreur: "Seules les écritures en brouillon peuvent être modifiées." };
  }
  const d = parse.data;
  if (!(await journalDansPerimetre(session, d.journal_id))) {
    return { erreur: "Journal introuvable." };
  }

  const { error } = await bd()
    .from("ecritures")
    .update({
      journal_id: d.journal_id,
      date_ecriture: d.date_ecriture,
      libelle: d.libelle.trim(),
      piece_reference: nettoyer(d.piece_reference),
    })
    .eq("id", donnees.id);
  if (error) return { erreur: "Impossible de modifier l'écriture." };

  const res = await remplacerLignes(donnees.id, d.lignes);
  if (res.erreur) return { erreur: res.erreur };

  await journaliser(session, "MODIFICATION_ECRITURE", "ecritures", donnees.id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true };
}

export async function validerEcriture(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.VALIDER");

  const existante = await ecritureDansPerimetre(session, id);
  if (!existante) return { erreur: "Écriture introuvable." };
  if (existante.statut !== "BROUILLON") return { erreur: "Écriture déjà traitée." };

  const { error } = await bd()
    .from("ecritures")
    .update({
      statut: "VALIDEE",
      validee_par: session.utilisateurId,
      validee_le: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { erreur: "Écriture non équilibrée : les débits doivent égaler les crédits." };

  await journaliser(session, "VALIDATION_ECRITURE", "ecritures", id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true };
}

export async function contrePasserEcriture(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "COMPTABILITE.ANNULER");

  const existante = await ecritureDansPerimetre(session, id);
  if (!existante) return { erreur: "Écriture introuvable." };
  if (existante.statut !== "VALIDEE") {
    return { erreur: "Seule une écriture validée peut être contre-passée." };
  }

  const { data: lignes } = await bd()
    .from("ecriture_lignes")
    .select("*")
    .eq("ecriture_id", id)
    .returns<EcritureLigne[]>();
  if (!lignes || lignes.length === 0) return { erreur: "Écriture sans lignes." };

  const client = bd();
  const aujourdHui = new Date().toISOString().slice(0, 10);
  let numero: string;
  try {
    numero = await genererNumero(
      session.entrepriseId,
      "ECRITURE",
      "ECR",
      new Date().getFullYear(),
      5
    );
  } catch {
    return { erreur: "Numérotation indisponible." };
  }

  const { data: nouvelle, error } = await client
    .from("ecritures")
    .insert({
      entreprise_id: session.entrepriseId,
      journal_id: existante.journal_id,
      numero,
      date_ecriture: aujourdHui,
      libelle: `Contre-passation de ${existante.numero}`,
      piece_reference: existante.numero,
      statut: "VALIDEE",
      validee_par: session.utilisateurId,
      validee_le: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: number }>();
  if (error || !nouvelle) return { erreur: "Impossible de créer la contre-passation." };

  const { error: erreurLignes } = await client.from("ecriture_lignes").insert(
    lignes.map((l) => ({
      ecriture_id: nouvelle.id,
      compte_id: l.compte_id,
      debit: l.credit,
      credit: l.debit,
      libelle: l.libelle,
    }))
  );
  if (erreurLignes) return { erreur: "Impossible d'enregistrer les lignes de contre-passation." };

  await journaliser(session, "CONTRE_PASSATION_ECRITURE", "ecritures", nouvelle.id);
  revalidatePath("/[locale]/comptabilite", "page");
  return { ok: true, id: nouvelle.id };
}
