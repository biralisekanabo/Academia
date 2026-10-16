import { z } from "zod";

export const schemaMouvement = z.object({
  caisse_id: z.coerce.number().int().positive("La caisse est requise."),
  type: z.enum(["ENTREE", "SORTIE", "TRANSFERT", "REMBOURSEMENT", "CORRECTION"]),
  montant: z.coerce.number().positive("Le montant doit être supérieur à 0."),
  devise_id: z.coerce.number().int().positive("La devise est requise."),
  motif: z.string().min(2, "Le motif est requis.").max(2000),
  beneficiaire: z.string().max(150).optional(),
  categorie: z.string().max(80).optional(),
  reference: z.string().max(80).optional(),
  caisse_destination_id: z.coerce.number().int().positive().optional(),
  date_mouvement: z.string().optional(),
});

export type DonneesMouvement = z.infer<typeof schemaMouvement>;
