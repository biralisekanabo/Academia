import { z } from "zod";

export const schemaFrais = z.object({
  faculteId: z.string().min(1, "Sélectionnez une faculté."),
  filiereId: z.string().min(1, "Sélectionnez une filière."),
  niveau: z.enum(["L1", "L2", "L3", "M1", "M2"]),
  libelle: z.string().min(3, "Libellé obligatoire."),
  montant: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, "Montant invalide."),
  devise: z.string().default("FCFA"),
  anneeUniversitaire: z.string().min(7, "Année universitaire obligatoire."),
});

export const schemaPaiement = z.object({
  etudiantId: z.string().min(1, "Sélectionnez un étudiant."),
  libelle: z.string().min(3, "Libellé obligatoire."),
  montant: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, "Montant invalide."),
  methode: z.enum(["especes", "mobile_money", "carte_bancaire", "virement", "cheque", "autre"]),
  statut: z.enum(["en_attente", "valide", "echoue", "rembourse"]),
});

export const schemaSalaire = z.object({
  enseignantId: z.string().min(1, "Sélectionnez un enseignant."),
  libelle: z.string().min(3, "Libellé obligatoire."),
  montant: z
    .string()
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, "Montant invalide."),
  mois: z.string().min(7, "Mois de paie obligatoire."),
  methode: z.enum(["especes", "mobile_money", "carte_bancaire", "virement", "cheque", "autre"]),
  statut: z.enum(["en_attente", "valide", "echoue", "rembourse"]),
});

export type DonneesFrais = z.infer<typeof schemaFrais>;
export type DonneesPaiement = z.infer<typeof schemaPaiement>;
export type DonneesSalaire = z.infer<typeof schemaSalaire>;