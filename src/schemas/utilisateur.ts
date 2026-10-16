import { z } from "zod";

const emailOptionnel = z
  .union([z.string().email("Adresse e-mail invalide."), z.literal("")])
  .optional();

const reellementOptionnel = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t ? t : undefined;
    });

/**
 * Tous les champs sont optionnels. Lorsqu'une information essentielle
 * (nom complet, identifiant ou mot de passe) est absente, le serveur la
 * génère automatiquement et renvoie les identifiants créés à l'appelant.
 */
export const schemaCreationUtilisateur = z.object({
  nomComplet: reellementOptionnel(200),
  nomUtilisateur: reellementOptionnel(100),
  email: emailOptionnel,
  telephone: z
    .string()
    .max(30)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  motDePasse: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .or(z.literal(""))
    .optional(),
});

export const schemaModificationUtilisateur = z.object({
  id: z.coerce.number().int().positive(),
  nomComplet: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  email: emailOptionnel,
  telephone: z
    .string()
    .max(30)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
});

export const schemaAttributionRoles = z.object({
  utilisateurId: z.coerce.number().int().positive(),
  roleIds: z.array(z.coerce.number().int().positive()).default([]),
});

export const schemaAttributionSuccursales = z.object({
  utilisateurId: z.coerce.number().int().positive(),
  succursaleIds: z.array(z.coerce.number().int().positive()).default([]),
});

export const schemaReinitialisationMotDePasse = z.object({
  utilisateurId: z.coerce.number().int().positive(),
  motDePasse: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export const schemaChangementMotDePasse = z
  .object({
    motDePasseActuel: z.string().min(1, "Champ requis."),
    nouveauMotDePasse: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
    confirmation: z.string().min(8, "Champ requis."),
  })
  .refine((d) => d.nouveauMotDePasse === d.confirmation, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmation"],
  });

export type DonneesCreationUtilisateur = z.infer<
  typeof schemaCreationUtilisateur
>;
export type DonneesModificationUtilisateur = z.infer<
  typeof schemaModificationUtilisateur
>;
export type DonneesChangementMotDePasse = z.infer<
  typeof schemaChangementMotDePasse
>;
