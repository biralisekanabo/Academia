import { z } from "zod";

export const schemaEnseignant = z.object({
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères."),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Adresse e-mail invalide."),
  specialite: z.string().optional(),
  statut: z
    .enum(["actif", "inactif", "suspendu", "diplome", "rejete", "en_attente"])
    .default("actif"),
  dateEmbauche: z.string().optional(),
});

export const schemaModificationEnseignant = z.object({
  id: z.string().uuid(),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères."),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  specialite: z.string().optional(),
  statut: z.enum([
    "actif",
    "inactif",
    "suspendu",
    "diplome",
    "rejete",
    "en_attente",
  ]),
});

export type DonneesEnseignant = z.infer<typeof schemaEnseignant>;
export type DonneesModificationEnseignant = z.infer<
  typeof schemaModificationEnseignant
>;
