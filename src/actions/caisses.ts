"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import {
  schemaCloturerSession,
  schemaCaisse,
  schemaOuvrirSession,
} from "@/schemas/caisse";
import type { Caisse, JournalCaisse, SessionCaisse, Session } from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

async function journaliser(
  session: Session,
  action: string,
  table: string,
  cibleId: number,
  details?: Record<string, unknown>
): Promise<void> {
  await bd().from("journal_audit").insert({
    entreprise_id: session.entrepriseId,
    utilisateur_id: session.utilisateurId,
    action,
    table_concernee: table,
    enregistrement_id: cibleId,
    details: details ?? null,
  });
}

async function caisseDansPerimetre(session: Session, id: number): Promise<Caisse | null> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("caisses")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<Caisse>();
  return data ?? null;
}

// --- Caisses ---------------------------------------------------

export async function creerCaisse(donnees: Record<string, unknown>): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.CREER");

  const parse = schemaCaisse.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;

  const { data, error } = await bd()
    .from("caisses")
    .insert({
      entreprise_id: session.entrepriseId,
      code: d.code.trim(),
      nom: d.nom.trim(),
      devise_id: d.devise_id,
      caissier_id: d.caissier_id ?? null,
      solde_initial: d.solde_initial ?? 0,
      statut: "FERMEE",
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) {
    const deja = /duplicate|unique/i.test(error?.message ?? "");
    return { erreur: deja ? "Ce code de caisse existe déjà." : "Impossible de créer la caisse." };
  }

  await journaliser(session, "CREATION_CAISSE", "caisses", data.id);
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true, id: data.id };
}

export async function modifierCaisse(
  donnees: Record<string, unknown> & { id: number }
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.MODIFIER");

  const parse = schemaCaisse.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await caisseDansPerimetre(session, donnees.id))) {
    return { erreur: "Caisse introuvable." };
  }
  const d = parse.data;

  const { error } = await bd()
    .from("caisses")
    .update({
      nom: d.nom.trim(),
      devise_id: d.devise_id,
      caissier_id: d.caissier_id ?? null,
    })
    .eq("id", donnees.id);
  if (error) return { erreur: "Impossible de modifier la caisse." };

  await journaliser(session, "MODIFICATION_CAISSE", "caisses", donnees.id);
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true };
}

export async function suspendreCaisse(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.MODIFIER");

  const caisse = await caisseDansPerimetre(session, id);
  if (!caisse) return { erreur: "Caisse introuvable." };
  if (caisse.statut === "OUVERTE") {
    return { erreur: "Clôturez la session en cours avant de suspendre la caisse." };
  }

  const { error } = await bd()
    .from("caisses")
    .update({ statut: caisse.statut === "SUSPENDUE" ? "FERMEE" : "SUSPENDUE" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de changer le statut." };

  await journaliser(session, "STATUT_CAISSE", "caisses", id);
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true };
}

export async function supprimerCaisse(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.SUPPRIMER");

  const caisse = await caisseDansPerimetre(session, id);
  if (!caisse) return { erreur: "Caisse introuvable." };
  if (caisse.statut === "OUVERTE") {
    return { erreur: "Impossible de supprimer une caisse ouverte." };
  }

  const { error } = await bd()
    .from("caisses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (des opérations y sont liées)." };

  await journaliser(session, "SUPPRESSION_CAISSE", "caisses", id);
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true };
}

// --- Sessions --------------------------------------------------

export async function ouvrirSession(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.CREER");

  const parse = schemaOuvrirSession.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const caisse = await caisseDansPerimetre(session, parse.data.caisse_id);
  if (!caisse) return { erreur: "Caisse introuvable." };
  if (caisse.statut === "OUVERTE") return { erreur: "Cette caisse est déjà ouverte." };

  const client = bd();
  const { data, error } = await client
    .from("sessions_caisse")
    .insert({
      entreprise_id: session.entrepriseId,
      caisse_id: caisse.id,
      caissier_id: session.utilisateurId,
      fonds_initial: parse.data.fonds_initial ?? 0,
      statut: "OUVERTE",
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) {
    const doublon = /duplicate|unique/i.test(error?.message ?? "");
    return { erreur: doublon ? "Une session est déjà ouverte sur cette caisse." : "Impossible d'ouvrir la session." };
  }

  await client
    .from("caisses")
    .update({
      statut: "OUVERTE",
      ouverte_le: new Date().toISOString(),
      fermee_le: null,
      caissier_id: session.utilisateurId,
    })
    .eq("id", caisse.id);

  await journaliser(session, "OUVERTURE_SESSION", "sessions_caisse", data.id, {
    caisse_id: caisse.id,
  });
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true, id: data.id };
}

export async function cloturerSession(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "CAISSE.MODIFIER");

  const parse = schemaCloturerSession.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data: ouverte } = await bd()
    .from("sessions_caisse")
    .select("*")
    .eq("id", parse.data.session_id)
    .in("entreprise_id", perimetre)
    .maybeSingle<SessionCaisse>();

  if (!ouverte) return { erreur: "Session introuvable." };
  if (ouverte.statut !== "OUVERTE") return { erreur: "Cette session est déjà clôturée." };

  const { data: journal } = await bd()
    .from("journal_caisse")
    .select("sens, montant")
    .eq("caisse_id", ouverte.caisse_id)
    .gte("cree_le", ouverte.ouverte_le)
    .returns<JournalCaisse[]>();

  let entrees = 0;
  let sorties = 0;
  for (const ligne of journal ?? []) {
    if (ligne.sens === "ENTREE") entrees += Number(ligne.montant);
    else sorties += Number(ligne.montant);
  }

  const theorique = Number(ouverte.fonds_initial) + entrees - sorties;
  const ecart = parse.data.montant_compte - theorique;

  const client = bd();
  const { error } = await client
    .from("sessions_caisse")
    .update({
      statut: "CLOTUREE",
      cloturee_le: new Date().toISOString(),
      total_entrees: entrees,
      total_sorties: sorties,
      solde_theorique: theorique,
      montant_compte: parse.data.montant_compte,
      ecart,
      observations: parse.data.observations?.trim() || null,
    })
    .eq("id", ouverte.id);
  if (error) return { erreur: "Impossible de clôturer la session." };

  await client
    .from("caisses")
    .update({ statut: "FERMEE", fermee_le: new Date().toISOString() })
    .eq("id", ouverte.caisse_id);

  await journaliser(session, "CLOTURE_SESSION", "sessions_caisse", ouverte.id, {
    theorique,
    montant_compte: parse.data.montant_compte,
    ecart,
  });
  revalidatePath("/[locale]/caisse", "page");
  return { ok: true };
}
