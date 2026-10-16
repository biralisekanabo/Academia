import { z } from "zod";

export const schemaRole = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z
    .string()
    .min(2, "Le code doit contenir au moins 2 caractères.")
    .max(80)
    .regex(
      /^[A-Z0-9_]+$/,
      "Le code doit être en majuscules (lettres, chiffres, underscore)."
    ),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  description: z.string().optional(),
});

export const schemaPermissionsRole = z.object({
  roleId: z.coerce.number().int().positive(),
  permissionIds: z.array(z.coerce.number().int().positive()).default([]),
});

export type DonneesRole = z.infer<typeof schemaRole>;
