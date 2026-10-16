import { z } from "zod";

export const schemaCaisse = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z.string().min(1, "Le code est requis.").max(30),
  nom: z.string().min(2, "Le nom est requis.").max(120),
  devise_id: z.coerce.number().int().positive("La devise est requise."),
  caissier_id: z.coerce.number().int().positive().optional(),
  solde_initial: z.coerce.number().min(0).optional().default(0),
});

export const schemaStatutCaisse = z.object({
  id: z.coerce.number().int().positive(),
  statut: z.enum(["FERMEE", "OUVERTE", "SUSPENDUE"]),
});

export const schemaOuvrirSession = z.object({
  caisse_id: z.coerce.number().int().positive(),
  fonds_initial: z.coerce.number().min(0).optional().default(0),
});

export const schemaCloturerSession = z.object({
  session_id: z.coerce.number().int().positive(),
  montant_compte: z.coerce.number().min(0, "Le montant compté est invalide."),
  observations: z.string().max(1000).optional(),
});

export type DonneesCaisse = z.infer<typeof schemaCaisse>;
