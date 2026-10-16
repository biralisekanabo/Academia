import {
  BarChart3,
  Building2,
  CalendarDays,
  Coins,
  GraduationCap,
  Home,
  Landmark,
  Layers,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ElementPortail = {
  titreCle: string;
  lien: string;
  icone: LucideIcon;
  roles?: string[];
  permission?: string;
};

const ACCUEIL: ElementPortail = {
  titreCle: "navigation.accueil",
  lien: "/accueil",
  icone: Home,
};

// --- Plateforme (super admin) ---------------------------------

const ETABLISSEMENTS: ElementPortail = {
  titreCle: "navigation.etablissements",
  lien: "/etablissements",
  icone: Building2,
  roles: ["SUPER_ADMIN"],
};

const UTILISATEURS_PLATEFORME: ElementPortail = {
  titreCle: "navigation.utilisateursPlateforme",
  lien: "/utilisateurs-plateforme",
  icone: Users,
  roles: ["SUPER_ADMIN"],
};

// --- Établissement --------------------------------------------

const UTILISATEURS: ElementPortail = {
  titreCle: "navigation.utilisateurs",
  lien: "/utilisateurs",
  icone: Users,
  permission: "UTILISATEURS.CONSULTER",
};

const ROLES: ElementPortail = {
  titreCle: "navigation.roles",
  lien: "/roles",
  icone: ShieldCheck,
  permission: "ROLES.CONSULTER",
};

const SUCCURSALES: ElementPortail = {
  titreCle: "navigation.succursales",
  lien: "/succursales",
  icone: Building2,
  permission: "SUCCURSALES.CONSULTER",
};

// --- Académique -----------------------------------------------

const ACADEMIQUE: ElementPortail = {
  titreCle: "navigation.academique",
  lien: "/academique",
  icone: CalendarDays,
  permission: "ACADEMIQUE.CONSULTER",
};

const ETUDIANTS: ElementPortail = {
  titreCle: "navigation.etudiants",
  lien: "/etudiants",
  icone: GraduationCap,
  permission: "ETUDIANTS.CONSULTER",
};

const INSCRIPTIONS: ElementPortail = {
  titreCle: "navigation.inscriptions",
  lien: "/inscriptions",
  icone: Layers,
  permission: "INSCRIPTIONS.CONSULTER",
};

// --- Finances -------------------------------------------------

const MONNAIES: ElementPortail = {
  titreCle: "navigation.monnaies",
  lien: "/monnaies",
  icone: Coins,
  permission: "MONNAIES.CONSULTER",
};

const FRAIS: ElementPortail = {
  titreCle: "navigation.frais",
  lien: "/frais",
  icone: Receipt,
  permission: "FRAIS.CONSULTER",
};

const COMPTABILITE: ElementPortail = {
  titreCle: "navigation.comptabilite",
  lien: "/comptabilite",
  icone: Landmark,
  permission: "COMPTABILITE.CONSULTER",
};

const RAPPORTS: ElementPortail = {
  titreCle: "navigation.rapports",
  lien: "/rapports",
  icone: BarChart3,
  permission: "RAPPORTS.CONSULTER",
};

// --- Caisse ---------------------------------------------------

const CAISSE: ElementPortail = {
  titreCle: "navigation.caisse",
  lien: "/caisse",
  icone: Wallet,
  permission: "CAISSE.CONSULTER",
};

const PROFIL: ElementPortail = {
  titreCle: "navigation.profil",
  lien: "/profil",
  icone: Users,
};

// --- Composition ----------------------------------------------

const TOUS: ElementPortail[] = [
  ACCUEIL,
  ETABLISSEMENTS,
  UTILISATEURS_PLATEFORME,
  UTILISATEURS,
  ROLES,
  SUCCURSALES,
  ACADEMIQUE,
  ETUDIANTS,
  INSCRIPTIONS,
  MONNAIES,
  FRAIS,
  COMPTABILITE,
  CAISSE,
  RAPPORTS,
  PROFIL,
];

/** Navigation filtrée selon les rôles et permissions effectives. */
export function navigationPour(
  roles: string[],
  permissions: string[] = []
): ElementPortail[] {
  const superAdmin = roles.includes("SUPER_ADMIN");
  const jeu = new Set(permissions);

  return TOUS.filter((element) => {
    if (element.roles && !element.roles.some((r) => roles.includes(r))) {
      return false;
    }
    if (element.permission && !superAdmin && !jeu.has(element.permission)) {
      return false;
    }
    return true;
  });
}

// Destination après connexion : tableau de bord du portail.
export const cheminApresConnexion = "/accueil";
