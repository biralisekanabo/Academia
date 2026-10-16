import { z } from "zod";

export const schemaCompte = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z.string().min(1, "Le code est requis.").max(20),
  libelle: z.string().min(2, "Le libellé est requis.").max(150),
  classe: z.coerce
    .number()
    .int()
    .min(1, "La classe doit être entre 1 et 8.")
    .max(8, "La classe doit être entre 1 et 8."),
  type_compte: z.enum(["ACTIF", "PASSIF", "CHARGE", "PRODUIT"]),
  compte_parent_id: z.coerce.number().int().positive().optional(),
  est_synthetique: z.coerce.boolean().optional().default(false),
});

export const schemaStatutCompte = z.object({
  id: z.coerce.number().int().positive(),
  statut: z.enum(["ACTIF", "INACTIF"]),
});

export const schemaJournal = z.object({
  id: z.coerce.number().int().positive().optional(),
  code: z.string().min(1, "Le code est requis.").max(20),
  nom: z.string().min(2, "Le nom est requis.").max(120),
  type: z.enum(["CAISSE", "BANQUE", "ACHATS", "VENTES", "TRAVAUX", "DIVERS"]),
});

export const schemaLigneEcriture = z.object({
  compte_id: z.coerce.number().int().positive("Le compte est requis."),
  debit: z.coerce.number().min(0, "Le débit est invalide.").default(0),
  credit: z.coerce.number().min(0, "Le crédit est invalide.").default(0),
  libelle: z.string().max(255).optional(),
});

export const schemaEcriture = z.object({
  id: z.coerce.number().int().positive().optional(),
  journal_id: z.coerce.number().int().positive("Le journal est requis."),
  date_ecriture: z.string().min(1, "La date est requise."),
  libelle: z.string().min(2, "Le libellé est requis.").max(255),
  piece_reference: z.string().max(80).optional(),
  lignes: z
    .array(schemaLigneEcriture)
    .min(2, "Au moins deux lignes sont requises."),
});

export type DonneesCompte = z.infer<typeof schemaCompte>;
export type DonneesJournal = z.infer<typeof schemaJournal>;
export type DonneesEcriture = z.infer<typeof schemaEcriture>;
