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
  nom: z.string().min(1, "Le nom est requis.").max(80),
  postnom: z.string().min(1, "Champ requis.").max(80),
  prenom: z.string().min(1, "Le prénom est requis.").max(80),
  sexe: z.enum(["M", "F"], { message: "Le sexe est requis." }),
  date_naissance: z.string().min(1, "Champ requis."),
  lieu_naissance: z.string().min(1, "Champ requis.").max(120),
  nationalite: z.string().min(1, "Champ requis.").max(80),
  adresse: z.string().min(1, "Champ requis."),
  telephone: z.string().min(1, "Champ requis.").max(30),
  email: z.string().min(1, "Champ requis.").email("E-mail invalide."),
  nom_pere: z.string().min(1, "Champ requis.").max(120),
  nom_mere: z.string().min(1, "Champ requis.").max(120),
  nom_tuteur: z.string().min(1, "Champ requis.").max(120),
  telephone_tuteur: z.string().min(1, "Champ requis.").max(30),
  contact_urgence: z.string().max(120).optional(),
  type_piece: z.enum(TYPES_PIECE, { message: "Champ requis." }),
  numero_piece: z.string().min(1, "Champ requis.").max(60),
  statut: z.enum(STATUTS_ETUDIANT).optional().default("ACTIF"),
  observations: z.string().optional(),
});

export const schemaStatutEtudiant = z.object({
  id: z.coerce.number().int().positive(),
  statut: z.enum(STATUTS_ETUDIANT),
});

export type DonneesEtudiant = z.infer<typeof schemaEtudiant>;
