import type { TypeRole } from "@/types/database";

const DOMAINE_INTERNE = "openlu.edu";

export function normaliserService(service: string): string {
  return service
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function emailDepuisService(service: string): string {
  return `${normaliserService(service)}@${DOMAINE_INTERNE}`;
}

export function serviceValide(service: string): boolean {
  return normaliserService(service).length >= 2;
}

const MOTS_ROLES: { role: TypeRole; mots: string[] }[] = [
  {
    role: "administrateur",
    mots: ["admin", "direction", "recteur", "secretaire-general"],
  },
  {
    role: "reception",
    mots: ["reception", "inscription", "accueil", "scolarite"],
  },
  {
    role: "finance",
    mots: ["finance", "financier", "financiere", "comptab", "caisse", "tresor"],
  },
  {
    role: "enseignant",
    mots: ["enseignant", "professeur", "prof", "teacher", "tuteur"],
  },
  {
    role: "personnel",
    mots: ["personnel", "staff", "employe"],
  },
];

export function roleDepuisService(service: string): TypeRole {
  const normalise = normaliserService(service);
  for (const { role, mots } of MOTS_ROLES) {
    if (mots.some((mot) => normalise.includes(mot))) {
      return role;
    }
  }
  return "etudiant";
}
