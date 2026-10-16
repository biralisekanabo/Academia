import { z } from "zod";

export const schemaDevise = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z
    .string()
    .min(2, "Le code est requis.")
    .max(3, "Code ISO sur 3 caractères (ex. CDF, USD).")
    .regex(/^[A-Za-z]+$/, "Le code ne contient que des lettres.")
    .transform((v) => v.toUpperCase()),
  nom: z.string().min(2, "Le nom est requis.").max(60),
  symbole: z.string().max(10).optional(),
  nb_decimales: z.coerce.number().int().min(0).max(4).optional().default(2),
  est_reference: z.boolean().optional().default(false),
});

export const schemaStatutDevise = z.object({
  id: z.coerce.number().int().positive(),
  statut: z.enum(["ACTIVE", "INACTIVE"]),
});

export const schemaTaux = z.object({
  id: z.coerce.number().int().positive().optional(),
  devise_source_id: z.coerce.number().int().positive("Devise source requise."),
  devise_cible_id: z.coerce.number().int().positive("Devise cible requise."),
  taux: z.coerce.number().positive("Le taux doit être supérieur à 0."),
  date_effet: z.string().optional(),
});

export type DonneesDevise = z.infer<typeof schemaDevise>;
export type DonneesTaux = z.infer<typeof schemaTaux>;
