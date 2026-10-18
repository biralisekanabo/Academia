"use server";

import { getLocale, getTranslations } from "next-intl/server";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";

import { bd } from "@/bibliotheque/bd";
import { envoyerMail } from "@/utilitaires/mail";
import type { Utilisateur } from "@/types/base";

export async function demanderReinitialisation(emailOuIdentifiant: string): Promise<{ ok: boolean; erreur?: string }> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth" });
  const client = bd();

  const valeur = emailOuIdentifiant.trim();
  if (!valeur) {
    return { ok: false, erreur: t("requis") };
  }

  type Candidat = Utilisateur & { password_hash: string; email: string };
  let utilisateur: Candidat | null = null;

  const { data: lignesNom } = await client
    .from("utilisateurs")
    .select("*")
    .ilike("nom_utilisateur", valeur)
    .is("deleted_at", null)
    .limit(1);
  utilisateur = ((lignesNom ?? []) as Candidat[])[0] ?? null;

  if (!utilisateur) {
    const { data: lignesEmail } = await client
      .from("utilisateurs")
      .select("*")
      .ilike("email", valeur)
      .is("deleted_at", null)
      .limit(1);
    utilisateur = ((lignesEmail ?? []) as Candidat[])[0] ?? null;
  }

  if (!utilisateur) {
    return { ok: true };
  }

  const { data: entreprise } = await client
    .from("entreprises")
    .select("id, statut")
    .eq("id", utilisateur.entreprise_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!entreprise || entreprise.statut !== "ACTIVE" || utilisateur.statut !== "ACTIF") {
    return { ok: true };
  }

  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 10);
  const expireLe = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await client.from("réinitialisations_mot_de_passe").insert({
    utilisateur_id: utilisateur.id,
    jeton_hash: codeHash,
    expire_le: expireLe,
  });

  try {
    await envoyerMail({
      to: utilisateur.email,
      subject: t("codeEnvoyeSujet") || "Code de réinitialisation",
      text: `${t("votreCodeEst")} ${code}. ${t("codeExpire15min")}`,
      html: `<p>${t("votreCodeEst")} <strong>${code}</strong>.</p><p>${t("codeExpire15min")}</p>`,
    });
  } catch {
    // ignore
  }

  return { ok: true };
}

export async function verifierOtpEtReinitialiser(params: {
  emailOuIdentifiant: string;
  code: string;
  motDePasse: string;
  confirmation: string;
}): Promise<{ ok: boolean; erreur?: string }> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "auth" });
  const client = bd();

  const valeur = params.emailOuIdentifiant.trim();
  const code = params.code.trim();
  const mdp = params.motDePasse;
  const conf = params.confirmation;

  if (!valeur || !code || !mdp || !conf) {
    return { ok: false, erreur: t("requis") };
  }
  if (mdp !== conf) {
    return { ok: false, erreur: t("motsDePasseNonIdentiques") || t("erreurIdentifiants") };
  }
  if (mdp.length < 6) {
    return { ok: false, erreur: t("motDePasseTropCourt") || t("erreurIdentifiants") };
  }

  type Candidat = Utilisateur & { password_hash: string; entreprise_id: number };
  let utilisateur: Candidat | null = null;

  const { data: lignesNom } = await client
    .from("utilisateurs")
    .select("*")
    .ilike("nom_utilisateur", valeur)
    .is("deleted_at", null)
    .limit(1);
  utilisateur = ((lignesNom ?? []) as Candidat[])[0] ?? null;

  if (!utilisateur) {
    const { data: lignesEmail } = await client
      .from("utilisateurs")
      .select("*")
      .ilike("email", valeur)
      .is("deleted_at", null)
      .limit(1);
    utilisateur = ((lignesEmail ?? []) as Candidat[])[0] ?? null;
  }

  if (!utilisateur) {
    return { ok: false, erreur: t("codeInvalide") || t("erreurIdentifiants") };
  }

  const { data: reinit } = await client
    .from("réinitialisations_mot_de_passe")
    .select("*")
    .eq("utilisateur_id", utilisateur.id)
    .is("utilise_le", null)
    .gt("expire_le", new Date().toISOString())
    .order("id", { ascending: false })
    .limit(1);

  const rec = reinit?.[0];
  if (!rec) {
    return { ok: false, erreur: t("codeInvalide") || t("erreurIdentifiants") };
  }

  const valide = await bcrypt.compare(code, rec.jeton_hash);
  if (!valide) {
    return { ok: false, erreur: t("codeInvalide") || t("erreurIdentifiants") };
  }

  const nouveauHash = await bcrypt.hash(mdp, 12);
  await client
    .from("utilisateurs")
    .update({ password_hash: nouveauHash, doit_changer_mot_de_passe: false })
    .eq("id", utilisateur.id);

  await client
    .from("réinitialisations_mot_de_passe")
    .update({ utilise_le: new Date().toISOString() })
    .eq("id", rec.id);

  await client.from("journal_audit").insert({
    entreprise_id: utilisateur.entreprise_id,
    utilisateur_id: utilisateur.id,
    action: "réinitialisation_MOT_DE_PASSE",
    table_concernee: "utilisateurs",
    enregistrement_id: utilisateur.id,
  });

  return { ok: true };
}



