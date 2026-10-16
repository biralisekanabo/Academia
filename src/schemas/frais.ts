import { z } from "zod";

export const schemaTranche = z.object({
  libelle: z.string().max(120).optional(),
  pourcentage: z.coerce
    .number()
    .positive("Le pourcentage doit être supérieur à 0.")
    .max(100, "Le pourcentage ne peut dépasser 100."),
  date_limite: z.string().optional(),
});

export const schemaFrais = z.object({
  id: z.coerce.number().int().positive().optional(),
  annee_academique_id: z.coerce.number().int().positive("L'année académique est requise."),
  faculte_id: z.coerce.number().int().positive().optional(),
  domaine_id: z.coerce.number().int().positive().optional(),
  promotion_id: z.coerce.number().int().positive().optional(),
  libelle: z.string().min(2, "Le libellé est requis.").max(150),
  montant: z.coerce.number().min(0, "Le montant est invalide."),
  devise_id: z.coerce.number().int().positive("La devise est requise."),
  date_limite: z.string().optional(),
  modalites: z.string().optional(),
  tranches: z.array(schemaTranche).optional().default([]),
});

export const schemaStatutFrais = z.object({
  id: z.coerce.number().int().positive(),
  statut: z.enum(["ACTIF", "INACTIF"]),
});

export type DonneesFrais = z.infer<typeof schemaFrais>;
