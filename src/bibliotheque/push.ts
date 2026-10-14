import webpush from "web-push";

import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";

export type ChargePush = {
  titre: string;
  message?: string | null;
  lien?: string | null;
  type?: string;
};

let pret = false;

function configurer(): boolean {
  const publique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privee = process.env.VAPID_PRIVATE_KEY;
  if (!publique || !privee) return false;

  if (!pret) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:admin@openlu.app",
      publique,
      privee
    );
    pret = true;
  }
  return true;
}

/**
 * Envoie une notification Web Push à tous les appareils des utilisateurs ciblés.
 * Fonctionne même lorsque l'application est fermée : le message est poussé vers
 * le service worker du navigateur via le protocole Web Push.
 *
 * Best-effort : n'échoue jamais l'appelant. Les abonnements expirés (404/410)
 * sont supprimés automatiquement.
 */
export async function envoyerPush(
  utilisateurIds: string[],
  charge: ChargePush
): Promise<void> {
  if (utilisateurIds.length === 0 || !configurer()) return;

  try {
    const admin = creerClientAdmin();
    const { data: abonnements, error } = await admin
      .from("openlu_abonnements_push")
      .select("id, endpoint, p256dh, auth")
      .in("utilisateur_id", utilisateurIds);

    if (error || !abonnements?.length) return;

    const chargeUtile = JSON.stringify({
      titre: charge.titre,
      message: charge.message ?? null,
      lien: charge.lien ?? "/tableau-de-bord",
      type: charge.type ?? "info",
    });

    await Promise.allSettled(
      abonnements.map(async (abonnement) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: abonnement.endpoint,
              keys: { p256dh: abonnement.p256dh, auth: abonnement.auth },
            },
            chargeUtile
          );
        } catch (erreur) {
          const statut = (erreur as { statusCode?: number }).statusCode;
          if (statut === 404 || statut === 410) {
            await admin
              .from("openlu_abonnements_push")
              .delete()
              .eq("id", abonnement.id);
          }
        }
      })
    );
  } catch (erreur) {
    console.error("Échec de l'envoi Web Push.", erreur);
  }
}
