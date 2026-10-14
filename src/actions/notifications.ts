"use server";

import { obtenirSession } from "@/bibliotheque/supabase/session";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import type { Notification } from "@/types/database";

type ResultatNotification = { erreur?: string; ok?: boolean };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listerNotifications(limite = 30): Promise<Notification[]> {
  const session = await obtenirSession();
  if (!session.utilisateur) return [];

  const supabase = await creerClientServeur();
  const { data, error } = await supabase
    .from("openlu_notifications")
    .select("id, destinataire_id, titre, message, type, lien, lue, cree_le")
    .order("cree_le", { ascending: false })
    .limit(Math.min(Math.max(limite, 1), 100));

  if (error || !data) return [];
  return data as Notification[];
}

export async function marquerNotificationLue(
  id: string
): Promise<ResultatNotification> {
  const session = await obtenirSession();
  if (!session.utilisateur) return { erreur: "Non authentifié." };
  if (!UUID.test(id)) return { erreur: "Identifiant invalide." };

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("openlu_notifications")
    .update({ lue: true })
    .eq("id", id);

  if (error) return { erreur: "Impossible de marquer la notification." };
  return { ok: true };
}

export async function marquerToutesNotificationsLues(): Promise<ResultatNotification> {
  const session = await obtenirSession();
  if (!session.utilisateur) return { erreur: "Non authentifié." };

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("openlu_notifications")
    .update({ lue: true })
    .eq("destinataire_id", session.utilisateur.id)
    .eq("lue", false);

  if (error) return { erreur: "Impossible de tout marquer comme lu." };
  return { ok: true };
}

export async function supprimerNotification(
  id: string
): Promise<ResultatNotification> {
  const session = await obtenirSession();
  if (!session.utilisateur) return { erreur: "Non authentifié." };
  if (!UUID.test(id)) return { erreur: "Identifiant invalide." };

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("openlu_notifications")
    .delete()
    .eq("id", id);

  if (error) return { erreur: "Impossible de supprimer la notification." };
  return { ok: true };
}

export async function enregistrerAbonnementPush(donnees: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<ResultatNotification> {
  const session = await obtenirSession();
  if (!session.utilisateur) return { erreur: "Non authentifié." };

  const { endpoint, p256dh, auth } = donnees;
  if (!endpoint || endpoint.length > 1000 || !p256dh || !auth) {
    return { erreur: "Abonnement push invalide." };
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.from("openlu_abonnements_push").upsert(
    {
      utilisateur_id: session.utilisateur.id,
      endpoint,
      p256dh,
      auth,
      user_agent: donnees.userAgent?.slice(0, 400) ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) return { erreur: "Impossible d'enregistrer l'abonnement." };
  return { ok: true };
}

export async function supprimerAbonnementPush(
  endpoint: string
): Promise<ResultatNotification> {
  const session = await obtenirSession();
  if (!session.utilisateur) return { erreur: "Non authentifié." };

  const supabase = await creerClientServeur();
  const { error } = await supabase
    .from("openlu_abonnements_push")
    .delete()
    .eq("endpoint", endpoint)
    .eq("utilisateur_id", session.utilisateur.id);

  if (error) return { erreur: "Impossible de supprimer l'abonnement." };
  return { ok: true };
}
