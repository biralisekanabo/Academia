import { z } from "zod";

export const schemaCours = z.object({
  code: z.string().min(2, "Code obligatoire."),
  titre: z.string().min(3, "Intitulé obligatoire."),
  description: z.string().optional(),
  credits: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, "Crédits invalides."),
  semestre: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => Number.isInteger(v) && v >= 1 && v <= 8, "Semestre invalide."),
  enseignantId: z.string().optional(),
});

export const TYPES_EVALUATION = ["devoir", "examen", "projet", "partiel"] as const;

export const schemaEvaluation = z.object({
  coursId: z.string().min(1, "Sélectionnez un cours."),
  titre: z.string().min(2, "Titre obligatoire."),
  type: z.enum(TYPES_EVALUATION),
  coefficient: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, "Coefficient invalide."),
  bareme: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, "Barème invalide."),
  dateEcheance: z.string().optional(),
});

export const schemaNote = z.object({
  etudiantId: z.string().min(1),
  valeur: z.number().min(0),
  appreciation: z.string().optional(),
});

export const schemaNotes = z.object({
  evaluationId: z.string().min(1),
  notes: z.array(schemaNote),
});

export type DonneesCours = z.infer<typeof schemaCours>;
export type DonneesEvaluation = z.infer<typeof schemaEvaluation>;
export type NoteSaisie = z.infer<typeof schemaNote>;
