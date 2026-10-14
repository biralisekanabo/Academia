import {
  BookOpen,
  ClipboardCheck,
  Home,
  Landmark,
  LayoutDashboard,
  MonitorPlay,
  School,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { TypeRole } from "@/types/database";

export type ElementPortail = {
  titreCle: string;
  lien: string;
  icone: LucideIcon;
};

const ACCUEIL: ElementPortail = {
  titreCle: "navigation.accueil",
  lien: "/accueil",
  icone: Home,
};

export const navigationParRole: Record<TypeRole, ElementPortail[]> = {
  etudiant: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.cours", lien: "/cours", icone: BookOpen },
    { titreCle: "navigation.notes", lien: "/notes", icone: ClipboardCheck },
    { titreCle: "navigation.apprentissage", lien: "/apprentissage", icone: MonitorPlay },
  ],
  enseignant: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.cours", lien: "/cours", icone: BookOpen },
    { titreCle: "navigation.notes", lien: "/notes", icone: ClipboardCheck },
    { titreCle: "navigation.apprentissage", lien: "/apprentissage", icone: MonitorPlay },
  ],
  reception: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.etudiants", lien: "/etudiants", icone: Users },
    { titreCle: "navigation.facultes", lien: "/facultes", icone: School },
  ],
  finance: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.etudiants", lien: "/etudiants", icone: Users },
    { titreCle: "navigation.finances", lien: "/finances", icone: Landmark },
  ],
  personnel: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.etudiants", lien: "/etudiants", icone: Users },
    { titreCle: "navigation.cours", lien: "/cours", icone: BookOpen },
    { titreCle: "navigation.notes", lien: "/notes", icone: ClipboardCheck },
  ],
  administrateur: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.etudiants", lien: "/etudiants", icone: Users },
    { titreCle: "navigation.facultes", lien: "/facultes", icone: School },
    { titreCle: "navigation.cours", lien: "/cours", icone: BookOpen },
    { titreCle: "navigation.notes", lien: "/notes", icone: ClipboardCheck },
    { titreCle: "navigation.apprentissage", lien: "/apprentissage", icone: MonitorPlay },
  ],
};