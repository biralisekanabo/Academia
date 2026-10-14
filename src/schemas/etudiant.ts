import { z } from "zod";

export const schemaEtudiant = z.object({
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères."),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  email: z.string().email("Adresse e-mail invalide."),
  filiereId: z.string().min(1, "Sélectionnez une filière."),
  niveau: z.enum(["L1", "L2", "L3", "M1", "M2"]),
  anneeUniversitaire: z.string().default("2026-2027"),
});

export const schemaModificationEtudiant = z.object({
  id: z.string().uuid(),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères."),
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  faculteId: z.string().uuid(),
  filiereId: z.string().uuid(),
  niveau: z.enum(["L1", "L2", "L3", "M1", "M2"]),
  statut: z.enum([
    "actif",
    "inactif",
    "suspendu",
    "diplome",
    "rejete",
    "en_attente",
  ]),
});

export type DonneesEtudiant = z.infer<typeof schemaEtudiant>;
export type DonneesModificationEtudiant = z.infer<
  typeof schemaModificationEtudiant
>;