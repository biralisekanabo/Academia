import { envoyerPush } from "@/bibliotheque/push";
import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";
import type { TypeNotification } from "@/types/database";

export type EntreeNotification = {
  titre: string;
  message?: string | null;
  type?: TypeNotification;
  lien?: string | null;
};

/**
 * Crée une notification pour chaque destinataire (fan-out) puis déclenche
 * l'envoi Web Push correspondant. Utilise le client service_role car les
 * notifications d'autrui ne sont pas inscriptibles via la RLS standard.
 */
export async function creerNotifications(
  destinataireIds: string[],
  entree: EntreeNotification
): Promise<void> {
  const ids = [...new Set(destinataireIds.filter(Boolean))];
  if (ids.length === 0) return;

  const type = entree.type ?? "info";
  const admin = creerClientAdmin();

  const lignes = ids.map((destinataire_id) => ({
    destinataire_id,
    titre: entree.titre,
    message: entree.message ?? null,
    type,
    lien: entree.lien ?? null,
  }));

  const { error } = await admin.from("openlu_notifications").insert(lignes);
  if (error) {
    console.error("Échec de la création des notifications.", error);
    return;
  }

  await envoyerPush(ids, {
    titre: entree.titre,
    message: entree.message,
    lien: entree.lien,
    type,
  });
}

/** Diffuse une notification à tous les comptes de la plateforme. */
export async function creerNotificationPourTous(
  entree: EntreeNotification
): Promise<void> {
  const admin = creerClientAdmin();
  const { data, error } = await admin.from("openlu_profils").select("id");
  if (error || !data) return;
  await creerNotifications(
    data.map((profil) => profil.id),
    entree
  );
}
