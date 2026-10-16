import { z } from "zod";

const STATUTS_ETUDIANT = [
  "ACTIF",
  "INACTIF",
  "SUSPENDU",
  "DIPLOME",
  "REJETE",
  "EN_ATTENTE",
] as const;

const TYPES_PIECE = ["CNI", "PASSEPORT", "PAROISSE", "AUTRE"] as const;

export const schemaEtudiant = z.object({
  id: z.coerce.number().int().positive().optional(),
  matricule: z
    .string()
    .max(40)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  nom: z
    .string()
    .max(80)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  postnom: z.string().max(80).optional(),
  prenom: z
    .string()
    .max(80)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  sexe: z.enum(["M", "F"], { message: "Le sexe est requis." }).optional(),
  date_naissance: z.string().optional(),
  lieu_naissance: z.string().max(120).optional(),
  nationalite: z.string().max(80).optional(),
  adresse: z.string().optional(),
  telephone: z.string().max(30).optional(),
  email: z
    .union([z.string().email("E-mail invalide."), z.literal("")])
    .optional(),
  nom_pere: z.string().max(120).optional(),
  nom_mere: z.string().max(120).optional(),
  nom_tuteur: z.string().max(120).optional(),
  telephone_tuteur: z.string().max(30).optional(),
  contact_urgence: z.string().max(120).optional(),
  type_piece: z.union([z.enum(TYPES_PIECE), z.literal("")]).optional(),
  numero_piece: z.string().max(60).optional(),
  statut: z.enum(STATUTS_ETUDIANT).optional().default("ACTIF"),
  observations: z.string().optional(),
});

export const schemaStatutEtudiant = z.object({
  id: z.coerce.number().int().positive(),
  statut: z.enum(STATUTS_ETUDIANT),
});

export type DonneesEtudiant = z.infer<typeof schemaEtudiant>;
