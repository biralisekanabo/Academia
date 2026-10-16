import { z } from "zod";

/** Identifiant facultatif : accepte "", null, NaN et les nombres valides. */
const idOptionnel = z.preprocess(
  (v) =>
    v === "" || v === null || v === undefined || Number.isNaN(Number(v))
      ? undefined
      : v,
  z.coerce.number().int().positive().optional()
);

export const schemaInscription = z.object({
  etudiant_id: z.coerce.number().int().positive("L'étudiant est requis."),
  annee_academique_id: idOptionnel,
  faculte_id: idOptionnel,
  domaine_id: idOptionnel,
  promotion_id: idOptionnel,
  numero_inscription: z
    .string()
    .max(40)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
  type_inscription: z
    .enum(["INITIALE", "REINSCRIPTION"])
    .optional()
    .default("INITIALE"),
  date_inscription: z.string().optional(),
  observations: z.string().optional(),
});

export type DonneesInscription = z.infer<typeof schemaInscription>;
