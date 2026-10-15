import type { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";

type ClientAdmin = ReturnType<typeof creerClientAdmin>;

export type DonneesDeblocage = {
  motDePasse: string;
  metadata: Record<string, unknown>;
};

/**
 * Débloque un compte Auth resté non confirmé.
 *
 * L ancien flux d inscription créait les comptes avec `signUp` (clé anon) :
 * comme les adresses sont fictives (`...@openlu.edu`), le mail de
 * confirmation n était jamais reçu et le compte restait inexploitable.
 * Il bloquait alors l inscription (« déjà utilisé ») et la connexion
 * (identifiants refusés). Ce helper confirme un tel compte et lui
 * applique le mot de passe demandé.
 *
 * Un compte déjà confirmé n est jamais détourné : il appartient à son
 * propriétaire et reste protégé par « déjà utilisé ».
 *
 * @returns l identifiant du compte débloqué, ou null.
 */
export async function debloquerCompteBloque(
  admin: ClientAdmin,
  email: string,
  donnees: DonneesDeblocage
): Promise<string | null> {
  const cible = email.toLowerCase();
  const parPage = 1000;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: parPage,
    });
    if (error) return null;

    const utilisateurs = data?.users ?? [];
    const compte = utilisateurs.find(
      (utilisateur) => (utilisateur.email ?? "").toLowerCase() === cible
    );

    if (compte) {
      if (compte.email_confirmed_at) return null;

      const { error: erreurMaj } = await admin.auth.admin.updateUserById(
        compte.id,
        {
          email_confirm: true,
          password: donnees.motDePasse,
          user_metadata: donnees.metadata,
        }
      );

      return erreurMaj ? null : compte.id;
    }

    if (utilisateurs.length < parPage) return null;
  }

  return null;
}
