"use server";

import bcrypt from "bcryptjs";

import { exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { ecrireSession } from "@/bibliotheque/session";
import { schemaChangementMotDePasse } from "@/schemas/utilisateur";

export type Resultat = { erreur?: string; ok?: boolean };

export async function changerMonMotDePasse(donnees: {
  motDePasseActuel: string;
  nouveauMotDePasse: string;
  confirmation: string;
}): Promise<Resultat> {
  const session = await exigerSession();

  const parse = schemaChangementMotDePasse.safeParse(donnees);
  if (!parse.success) {
    return { erreur: parse.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const client = bd();
  const { data: utilisateur } = await client
    .from("utilisateurs")
    .select("password_hash")
    .eq("id", session.utilisateurId)
    .maybeSingle<{ password_hash: string }>();

  if (!utilisateur) return { erreur: "Utilisateur introuvable." };

  const valide = await bcrypt.compare(
    parse.data.motDePasseActuel,
    utilisateur.password_hash
  );
  if (!valide) return { erreur: "Le mot de passe actuel est incorrect." };

  const hash = await bcrypt.hash(parse.data.nouveauMotDePasse, 12);
  const { error } = await client
    .from("utilisateurs")
    .update({ password_hash: hash, doit_changer_mot_de_passe: false })
    .eq("id", session.utilisateurId);
  if (error) return { erreur: "Impossible de changer le mot de passe." };

  await ecrireSession({ ...session, doitChangerMotDePasse: false });

  await client.from("journal_audit").insert({
    entreprise_id: session.entrepriseId,
    utilisateur_id: session.utilisateurId,
    action: "CHANGEMENT_MOT_DE_PASSE",
    table_concernee: "utilisateurs",
    enregistrement_id: session.utilisateurId,
  });

  return { ok: true };
}
