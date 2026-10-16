import { z } from "zod";

export const schemaRemise = z.object({
  dette_id: z.coerce.number().int().positive(),
  montant: z.coerce.number().positive("Le montant de la remise doit être supérieur à 0."),
  motif: z.string().max(255).optional(),
});

export const schemaStatutDette = z.object({
  id: z.coerce.number().int().positive(),
  statut: z.enum(["IMPAYEE", "PARTIELLE", "PAYEE", "ANNULEE"]),
});

export type DonneesRemise = z.infer<typeof schemaRemise>;
