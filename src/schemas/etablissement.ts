import { z } from "zod";

export const schemaEtablissement = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  sigle: z.string().min(2, "Le sigle doit contenir au moins 2 caractères."),
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
  nomComplet: z.string().min(3, "Le nom doit contenir au moins 3 caractères."),
  nomUtilisateur: z.string().min(3, "L'identifiant doit contenir au moins 3 caractères."),
  email: z.string().min(1, "Champ requis.").email("Adresse e-mail invalide."),
  motDePasse: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
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
