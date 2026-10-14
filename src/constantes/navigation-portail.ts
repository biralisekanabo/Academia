import {
  Bell,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
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

const NOTIFICATIONS: ElementPortail = {
  titreCle: "navigation.notifications",
  lien: "/notifications",
  icone: Bell,
};

export const navigationParRole: Record<TypeRole, ElementPortail[]> = {
  etudiant: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.cours", lien: "/cours", icone: BookOpen },
    { titreCle: "navigation.notes", lien: "/notes", icone: ClipboardCheck },
    { titreCle: "navigation.apprentissage", lien: "/apprentissage", icone: MonitorPlay },
    NOTIFICATIONS,
  ],
  enseignant: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.cours", lien: "/cours", icone: BookOpen },
    { titreCle: "navigation.notes", lien: "/notes", icone: ClipboardCheck },
    { titreCle: "navigation.apprentissage", lien: "/apprentissage", icone: MonitorPlay },
    NOTIFICATIONS,
  ],
  reception: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.etudiants", lien: "/etudiants", icone: Users },
    { titreCle: "navigation.enseignants", lien: "/enseignants", icone: GraduationCap },
    { titreCle: "navigation.facultes", lien: "/facultes", icone: School },
    NOTIFICATIONS,
  ],
  finance: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.etudiants", lien: "/etudiants", icone: Users },
    { titreCle: "navigation.finances", lien: "/finances", icone: Landmark },
    NOTIFICATIONS,
  ],
  personnel: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.etudiants", lien: "/etudiants", icone: Users },
    { titreCle: "navigation.enseignants", lien: "/enseignants", icone: GraduationCap },
    { titreCle: "navigation.cours", lien: "/cours", icone: BookOpen },
    NOTIFICATIONS,
  ],
  administrateur: [
    ACCUEIL,
    { titreCle: "navigation.tableauDeBord", lien: "/tableau-de-bord", icone: LayoutDashboard },
    { titreCle: "navigation.etudiants", lien: "/etudiants", icone: Users },
    { titreCle: "navigation.enseignants", lien: "/enseignants", icone: GraduationCap },
    { titreCle: "navigation.annonces", lien: "/annonces", icone: ClipboardList },
    { titreCle: "navigation.facultes", lien: "/facultes", icone: School },
    { titreCle: "navigation.cours", lien: "/cours", icone: BookOpen },
    { titreCle: "navigation.notes", lien: "/notes", icone: ClipboardCheck },
    { titreCle: "navigation.apprentissage", lien: "/apprentissage", icone: MonitorPlay },
    NOTIFICATIONS,
  ],
};