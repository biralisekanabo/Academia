"use server";

import { revalidatePath } from "next/cache";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { entrepriseMereId } from "@/bibliotheque/portee";

export type Resultat = { erreur?: string; ok?: boolean; id?: number };

function nettoyer(valeur?: string): string | null {
  const v = valeur?.trim();
  return v ? v : null;
}

type DonneesSuccursale = {
  nom: string;
  sigle?: string;
  ville?: string;
  province?: string;
  pays?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
};

async function succursaleDansPerimetre(
  entrepriseId: number,
  succursaleId: number
): Promise<boolean> {
  const mereId = await entrepriseMereId(entrepriseId);
  const { data } = await bd()
    .from("entreprises")
    .select("id")
    .eq("id", succursaleId)
    .eq("entreprise_mere_id", mereId)
    .is("deleted_at", null)
    .maybeSingle();
  return Boolean(data);
}

export async function creerSuccursale(
  donnees: DonneesSuccursale
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "SUCCURSALES.CREER");

  if (!donnees.nom?.trim() || donnees.nom.trim().length < 2) {
    return { erreur: "Le nom de la succursale est requis." };
  }

  const mereId = await entrepriseMereId(session.entrepriseId);

  const { data, error } = await bd()
    .from("entreprises")
    .insert({
      nom: donnees.nom.trim(),
      sigle: nettoyer(donnees.sigle),
      type_entreprise: "SUCCURSALE",
      ville: nettoyer(donnees.ville),
      province: nettoyer(donnees.province),
      pays: nettoyer(donnees.pays),
      telephone: nettoyer(donnees.telephone),
      email: nettoyer(donnees.email),
      adresse: nettoyer(donnees.adresse),
      est_mere: false,
      entreprise_mere_id: mereId,
      statut: "ACTIVE",
    })
    .select("id")
    .single<{ id: number }>();

  if (error || !data) {
    return { erreur: "Impossible de créer la succursale." };
  }

  await bd().from("journal_audit").insert({
    entreprise_id: mereId,
    utilisateur_id: session.utilisateurId,
    action: "CREATION_SUCCURSALE",
    table_concernee: "entreprises",
    enregistrement_id: data.id,
  });

  revalidatePath("/[locale]/succursales", "page");
  return { ok: true, id: data.id };
}

export async function modifierSuccursale(
  donnees: DonneesSuccursale & { id: number }
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "SUCCURSALES.MODIFIER");

  if (!(await succursaleDansPerimetre(session.entrepriseId, donnees.id))) {
    return { erreur: "Succursale introuvable." };
  }

  const { error } = await bd()
    .from("entreprises")
    .update({
      nom: donnees.nom.trim(),
      sigle: nettoyer(donnees.sigle),
      ville: nettoyer(donnees.ville),
      province: nettoyer(donnees.province),
      pays: nettoyer(donnees.pays),
      telephone: nettoyer(donnees.telephone),
      email: nettoyer(donnees.email),
      adresse: nettoyer(donnees.adresse),
    })
    .eq("id", donnees.id);

  if (error) return { erreur: "Impossible de modifier la succursale." };

  revalidatePath("/[locale]/succursales", "page");
  return { ok: true };
}

export async function definirStatutSuccursale(
  id: number,
  statut: "ACTIVE" | "SUSPENDUE" | "INACTIVE"
): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "SUCCURSALES.MODIFIER");

  if (!(await succursaleDansPerimetre(session.entrepriseId, id))) {
    return { erreur: "Succursale introuvable." };
  }

  const { error } = await bd().from("entreprises").update({ statut }).eq("id", id);
  if (error) return { erreur: "Impossible de modifier le statut." };

  revalidatePath("/[locale]/succursales", "page");
  return { ok: true };
}

export async function supprimerSuccursale(id: number): Promise<Resultat> {
  const session = await exigerSession();
  await exigerPermission(session, "SUCCURSALES.SUPPRIMER");

  if (!(await succursaleDansPerimetre(session.entrepriseId, id))) {
    return { erreur: "Succursale introuvable." };
  }

  const { error } = await bd()
    .from("entreprises")
    .update({ deleted_at: new Date().toISOString(), statut: "INACTIVE" })
    .eq("id", id);
  if (error) return { erreur: "Impossible de supprimer la succursale." };

  revalidatePath("/[locale]/succursales", "page");
  return { ok: true };
}
