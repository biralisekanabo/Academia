"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import {
  schemaDevise,
  schemaStatutDevise,
  schemaTaux,
} from "@/schemas/monnaie";
import type { Devise, Session } from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

function nettoyer(valeur?: string): string | null {
  const v = valeur?.trim();
  return v ? v : null;
}

async function deviseDansPerimetre(session: Session, id: number): Promise<Devise | null> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("devises")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<Devise>();
  return data ?? null;
}

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

// --- Devises --------------------------------------------------

export async function creerDevise(donnees: Record<string, unknown>): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "MONNAIES.CREER");

  const parse = schemaDevise.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;
  const client = bd();

  if (d.est_reference) {
    await client
      .from("devises")
      .update({ est_reference: false })
      .eq("entreprise_id", session.entrepriseId)
      .eq("est_reference", true);
  }

  const { data, error } = await client
    .from("devises")
    .insert({
      entreprise_id: session.entrepriseId,
      code: d.code,
      nom: d.nom.trim(),
      symbole: nettoyer(d.symbole),
      nb_decimales: d.nb_decimales ?? 2,
      est_reference: d.est_reference ?? false,
      statut: "ACTIVE",
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) {
    const deja = /duplicate|unique/i.test(error?.message ?? "");
    return { erreur: deja ? "Cette devise existe déjà." : "Impossible de créer la devise." };
  }

  await journaliser(session, "CREATION_DEVISE", "devises", data.id);
  revalidatePath("/[locale]/monnaies", "page");
  return { ok: true, id: data.id };
}

export async function modifierDevise(
  donnees: Record<string, unknown> & { id: number }
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "MONNAIES.MODIFIER");

  const parse = schemaDevise.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (!(await deviseDansPerimetre(session, donnees.id))) {
    return { erreur: "Devise introuvable." };
  }
  const d = parse.data;
  const client = bd();

  if (d.est_reference) {
    await client
      .from("devises")
      .update({ est_reference: false })
      .eq("entreprise_id", session.entrepriseId)
      .eq("est_reference", true);
  }

  const { error } = await client
    .from("devises")
    .update({
      nom: d.nom.trim(),
      symbole: nettoyer(d.symbole),
      nb_decimales: d.nb_decimales ?? 2,
      est_reference: d.est_reference ?? false,
    })
    .eq("id", donnees.id);

  if (error) return { erreur: "Impossible de modifier la devise." };

  await journaliser(session, "MODIFICATION_DEVISE", "devises", donnees.id);
  revalidatePath("/[locale]/monnaies", "page");
  return { ok: true };
}

export async function definirStatutDevise(
  id: number,
  statut: "ACTIVE" | "INACTIVE"
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "MONNAIES.MODIFIER");

  const parse = schemaStatutDevise.safeParse({ id, statut });
  if (!parse.success) return { erreur: "Statut invalide." };
  if (!(await deviseDansPerimetre(session, id))) return { erreur: "Devise introuvable." };

  const { error } = await bd().from("devises").update({ statut }).eq("id", id);
  if (error) return { erreur: "Impossible de modifier le statut." };

  await journaliser(session, "STATUT_DEVISE", "devises", id, { statut });
  revalidatePath("/[locale]/monnaies", "page");
  return { ok: true };
}

export async function definirDeviseReference(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "MONNAIES.MODIFIER");

  if (!(await deviseDansPerimetre(session, id))) return { erreur: "Devise introuvable." };

  const client = bd();
  await client
    .from("devises")
    .update({ est_reference: false })
    .eq("entreprise_id", session.entrepriseId)
    .eq("est_reference", true);
  const { error } = await client.from("devises").update({ est_reference: true }).eq("id", id);
  if (error) return { erreur: "Impossible de définir la devise de référence." };

  await journaliser(session, "DEVISE_REFERENCE", "devises", id);
  revalidatePath("/[locale]/monnaies", "page");
  return { ok: true };
}

export async function supprimerDevise(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "MONNAIES.SUPPRIMER");

  const devise = await deviseDansPerimetre(session, id);
  if (!devise) return { erreur: "Devise introuvable." };
  if (devise.est_reference) {
    return { erreur: "La devise de référence ne peut pas être supprimée." };
  }

  const { error } = await bd()
    .from("devises")
    .update({ deleted_at: new Date().toISOString(), statut: "INACTIVE" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer (elle est peut-être utilisée)." };

  await journaliser(session, "SUPPRESSION_DEVISE", "devises", id);
  revalidatePath("/[locale]/monnaies", "page");
  return { ok: true };
}

// --- Taux de change -------------------------------------------

export async function definirTaux(donnees: Record<string, unknown>): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "MONNAIES.MODIFIER");

  const parse = schemaTaux.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;
  if (d.devise_source_id === d.devise_cible_id) {
    return { erreur: "Les devises source et cible doivent être différentes." };
  }
  if (
    !(await deviseDansPerimetre(session, d.devise_source_id)) ||
    !(await deviseDansPerimetre(session, d.devise_cible_id))
  ) {
    return { erreur: "Devise introuvable dans votre périmètre." };
  }

  const client = bd();
  await client
    .from("taux_changes")
    .update({ est_courant: false })
    .eq("entreprise_id", session.entrepriseId)
    .eq("devise_source_id", d.devise_source_id)
    .eq("devise_cible_id", d.devise_cible_id)
    .eq("est_courant", true);

  const { data, error } = await client
    .from("taux_changes")
    .insert({
      entreprise_id: session.entrepriseId,
      devise_source_id: d.devise_source_id,
      devise_cible_id: d.devise_cible_id,
      taux: d.taux,
      date_effet: d.date_effet || new Date().toISOString().slice(0, 10),
      est_courant: true,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: "Impossible d'enregistrer le taux." };

  await journaliser(session, "TAUX_CHANGE", "taux_changes", data.id, {
    source: d.devise_source_id,
    cible: d.devise_cible_id,
    taux: d.taux,
  });
  revalidatePath("/[locale]/monnaies", "page");
  return { ok: true, id: data.id };
}

export async function supprimerTaux(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "MONNAIES.SUPPRIMER");

  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data: taux } = await bd()
    .from("taux_changes")
    .select("id, est_courant")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .maybeSingle<{ id: number; est_courant: boolean }>();

  if (!taux) return { erreur: "Taux introuvable." };
  if (taux.est_courant) {
    return { erreur: "Le taux courant ne peut pas être supprimé : remplacez-le." };
  }

  const { error } = await bd().from("taux_changes").delete().eq("id", id);
  if (error) return { erreur: "Impossible de supprimer le taux." };

  await journaliser(session, "SUPPRESSION_TAUX", "taux_changes", id);
  revalidatePath("/[locale]/monnaies", "page");
  return { ok: true };
}
