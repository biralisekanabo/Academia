"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise } from "@/bibliotheque/portee";
import { schemaRemise } from "@/schemas/dette";
import type { Dette, Session } from "@/types/base";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

async function detteDansPerimetre(session: Session, id: number): Promise<Dette | null> {
  const perimetre = await perimetreEntreprise(session.entrepriseId);
  const { data } = await bd()
    .from("dettes")
    .select("*")
    .eq("id", id)
    .in("entreprise_id", perimetre)
    .is("deleted_at", null)
    .maybeSingle<Dette>();
  return data ?? null;
}

async function journaliser(
  session: Session,
  action: string,
  cibleId: number,
  details?: Record<string, unknown>
): Promise<void> {
  await bd().from("journal_audit").insert({
    entreprise_id: session.entrepriseId,
    utilisateur_id: session.utilisateurId,
    action,
    table_concernee: "dettes",
    enregistrement_id: cibleId,
    details: details ?? null,
  });
}

export async function accorderRemise(
  donnees: Record<string, unknown>
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "FRAIS.MODIFIER");

  const parse = schemaRemise.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const d = parse.data;

  const dette = await detteDansPerimetre(session, d.dette_id);
  if (!dette) return { erreur: "Dette introuvable." };
  if (dette.statut === "ANNULEE") return { erreur: "Cette dette est annulée." };

  const restant = dette.montant_initial - dette.montant_reduction - dette.montant_paye;
  if (d.montant > restant + 0.001) {
    return { erreur: "La remise dépasse le solde restant." };
  }

  const { data, error } = await bd()
    .from("remises_dettes")
    .insert({
      entreprise_id: session.entrepriseId,
      dette_id: d.dette_id,
      montant: d.montant,
      motif: d.motif?.trim() || null,
      accordee_par: session.utilisateurId,
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) return { erreur: "Impossible d'accorder la remise." };

  await journaliser(session, "REMISE_DETTE", d.dette_id, { montant: d.montant });
  revalidatePath("/[locale]/frais", "page");
  return { ok: true, id: data.id };
}

export async function annulerDette(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "FRAIS.MODIFIER");

  const dette = await detteDansPerimetre(session, id);
  if (!dette) return { erreur: "Dette introuvable." };
  if (dette.montant_paye > 0) {
    return { erreur: "Impossible d'annuler une dette déjà partiellement payée." };
  }

  const { error } = await bd().from("dettes").update({ statut: "ANNULEE" }).eq("id", id);
  if (error) return { erreur: "Impossible d'annuler la dette." };

  await journaliser(session, "ANNULATION_DETTE", id);
  revalidatePath("/[locale]/frais", "page");
  return { ok: true };
}
