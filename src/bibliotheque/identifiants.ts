import "server-only";

import { bd } from "@/bibliotheque/bd";

/** Raccourci aléatoire sécurisé. */
export function aleatoire(longueur: number): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let sortie = "";
  for (let i = 0; i < longueur; i += 1) {
    sortie += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return sortie;
}

/** Mot de passe par défaut lisible et raisonnablement robuste. */
export function genererMotDePasse(): string {
  return `Acad-${aleatoire(8)}`;
}

/** Compose un identifiant à partir du nom ou de l'e-mail fournis. */
export function baseIdentifiant(sources: (string | undefined | null)[]): string {
  for (const source of sources) {
    const valeur = source?.trim();
    if (!valeur) continue;
    const base = valeur
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");
    if (base) return base.slice(0, 40);
  }
  return "utilisateur";
}

/** Garantit que l'identifiant n'existe pas déjà globalement. */
export async function identifiantUnique(base: string): Promise<string> {
  const client = bd();
  let candidat = base;
  for (let i = 0; i < 50; i += 1) {
    const { data } = await client
      .from("utilisateurs")
      .select("id")
      .ilike("nom_utilisateur", candidat)
      .limit(1);
    if (!data || data.length === 0) return candidat;
    candidat = `${base}.${i + 1}`;
  }
  return `${base}.${Date.now().toString(36)}`;
}
