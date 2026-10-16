import { z } from "zod";

const STATUTS_ACADEMIQUE = ["ACTIVE", "INACTIVE", "ARCHIVEE"] as const;

export const schemaAnnee = z.object({
  id: z.coerce.number().int().positive().optional(),
  libelle: z
    .string()
    .min(4, "Le libellé est requis (ex. 2026-2027).")
    .max(20),
  date_debut: z.string().min(1, "La date de début est requise."),
  date_fin: z.string().min(1, "La date de fin est requise."),
  est_active: z.boolean().optional().default(false),
});

export const schemaFaculte = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z
    .string()
    .min(1, "Le code est requis.")
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, "Code invalide (lettres, chiffres, - et _)."),
  nom: z.string().min(2, "Le nom est requis.").max(150),
  description: z.string().optional(),
  ordre: z.coerce.number().int().min(0).optional().default(0),
  statut: z.enum(STATUTS_ACADEMIQUE).optional().default("ACTIVE"),
});

export const schemaDomaine = z.object({
  id: z.coerce.number().int().positive().optional(),
  faculte_id: z.coerce.number().int().positive("La faculté est requise."),
  code: z
    .string()
    .min(1, "Le code est requis.")
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, "Code invalide (lettres, chiffres, - et _)."),
  nom: z.string().min(2, "Le nom est requis.").max(150),
  description: z.string().optional(),
  statut: z.enum(STATUTS_ACADEMIQUE).optional().default("ACTIVE"),
});

export const schemaPromotion = z.object({
  id: z.coerce.number().int().positive().optional(),
  faculte_id: z.coerce.number().int().positive("La faculté est requise."),
  domaine_id: z.coerce.number().int().positive("Le domaine est requis."),
  code: z.string().max(30).optional(),
  nom: z.string().min(2, "Le nom est requis.").max(120),
  niveau: z.string().max(50).optional(),
  ordre: z.coerce.number().int().min(0).optional().default(0),
  statut: z.enum(STATUTS_ACADEMIQUE).optional().default("ACTIVE"),
});

export type DonneesAnnee = z.infer<typeof schemaAnnee>;
export type DonneesFaculte = z.infer<typeof schemaFaculte>;
export type DonneesDomaine = z.infer<typeof schemaDomaine>;
export type DonneesPromotion = z.infer<typeof schemaPromotion>;
