import { z } from "zod";

const emailRequis = z
  .string()
  .min(1, "Champ requis.")
  .email("Adresse e-mail invalide.");

const telephoneRequis = z.string().min(1, "Champ requis.");

export const schemaCreationUtilisateur = z.object({
  nomComplet: z.string().min(3, "Le nom doit contenir au moins 3 caractères."),
  nomUtilisateur: z
    .string()
    .min(3, "L'identifiant doit contenir au moins 3 caractères."),
  email: emailRequis,
  telephone: telephoneRequis,
  motDePasse: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères."),
});

export const schemaModificationUtilisateur = z.object({
  id: z.coerce.number().int().positive(),
  nomComplet: z.string().min(3, "Le nom doit contenir au moins 3 caractères."),
  email: emailRequis,
  telephone: telephoneRequis,
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
