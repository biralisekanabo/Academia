import { z } from "zod";

export const schemaInscription = z.object({
  etudiant_id: z.coerce.number().int().positive("L'étudiant est requis."),
  annee_academique_id: z.coerce.number().int().positive("L'année académique est requise."),
  faculte_id: z.coerce.number().int().positive("La faculté est requise."),
  domaine_id: z.coerce.number().int().positive("Le domaine est requis."),
  promotion_id: z.coerce.number().int().positive("La promotion est requise."),
  numero_inscription: z
    .string()
    .max(40)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  type_inscription: z
    .enum(["INITIALE", "REINSCRIPTION"])
    .optional()
    .default("INITIALE"),
  date_inscription: z.string().optional(),
  observations: z.string().optional(),
});

export type DonneesInscription = z.infer<typeof schemaInscription>;
