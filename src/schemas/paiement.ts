import { z } from "zod";

export const schemaAllocation = z.object({
  dette_id: z.coerce.number().int().positive(),
  montant: z.coerce.number().positive("Le montant affecté doit être supérieur à 0."),
});

export const schemaPaiement = z.object({
  etudiant_id: z.coerce.number().int().positive("L'étudiant est requis."),
  caisse_id: z.coerce.number().int().positive("La caisse est requise."),
  methode: z.enum([
    "ESPECES",
    "MOBILE_MONEY",
    "CARTE_BANCAIRE",
    "VIREMENT",
    "CHEQUE",
    "AUTRE",
  ]),
  reference_transaction: z.string().max(80).optional(),
  date_paiement: z.string().optional(),
  allocations: z
    .array(schemaAllocation)
    .min(1, "Sélectionnez au moins une dette à régler."),
});

export type DonneesPaiement = z.infer<typeof schemaPaiement>;
