import { z } from "zod";

export const schemaEtablissement = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  sigle: z
    .string()
    .max(40)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  typeEntreprise: z
    .enum(["UNIVERSITE", "INSTITUT", "ECOLE_SUPERIEURE", "CENTRE_FORMATION", "AUTRE"])
    .default("UNIVERSITE"),
  telephone: z.string().optional(),
  email: z.union([z.string().email("Adresse e-mail invalide."), z.literal("")]).optional(),
  adresse: z.string().optional(),
  pays: z.string().optional(),
  province: z.string().optional(),
  ville: z.string().optional(),
});

export const schemaAdminPrincipal = z.object({
  nomComplet: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  nomUtilisateur: z
    .string()
    .max(100)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  email: z.union([z.string().email("Adresse e-mail invalide."), z.literal("")]).optional(),
  motDePasse: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .or(z.literal(""))
    .optional(),
});

export const schemaSuccursale = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  sigle: z.string().optional(),
  ville: z.string().optional(),
  telephone: z.string().optional(),
});

export const schemaModificationEtablissement = schemaEtablissement.partial({
  sigle: true,
});

export type DonneesEtablissement = z.infer<typeof schemaEtablissement>;
export type DonneesAdminPrincipal = z.infer<typeof schemaAdminPrincipal>;
export type DonneesSuccursale = z.infer<typeof schemaSuccursale>;
