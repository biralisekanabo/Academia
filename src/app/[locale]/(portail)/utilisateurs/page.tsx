import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Users } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { perimetreEntreprise, succursalesDe } from "@/bibliotheque/portee";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import {
  GestionUtilisateurs,
  type UtilisateurListe,
} from "@/fonctionnalites/utilisateurs/gestion-utilisateurs";
import type { Role, Utilisateur } from "@/types/base";

type LigneRole = { utilisateur_id: number; roles: { code: string } | null };
type LigneSucc = {
  utilisateur_id: number;
  entreprises: { nom: string } | null;
};

export default async function PageUtilisateurs() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "UTILISATEURS.CONSULTER");
  const t = await getTranslations("utilisateurs");

  const client = bd();
  const perimetre = await perimetreEntreprise(session.entrepriseId);

  const [utilisateursRes, rolesRes, succursales] = await Promise.all([
    client
      .from("utilisateurs")
      .select("*")
      .in("entreprise_id", perimetre)
      .is("deleted_at", null)
      .order("nom_complet")
      .returns<Utilisateur[]>(),
    client
      .from("roles")
      .select("*")
      .or(`entreprise_id.is.null,entreprise_id.eq.${session.entrepriseId}`)
      .neq("code", "SUPER_ADMIN")
      .order("est_systeme", { ascending: false })
      .order("nom")
      .returns<Role[]>(),
    succursalesDe(session.entrepriseId),
  ]);

  const utilisateurs = utilisateursRes.data ?? [];
  const roles = rolesRes.data ?? [];
  const ids = utilisateurs.map((u) => u.id);

  const [rolesLiens, succLiens] = await Promise.all([
    ids.length
      ? client
          .from("utilisateur_roles")
          .select("utilisateur_id, roles(code)")
          .in("utilisateur_id", ids)
          .returns<LigneRole[]>()
      : Promise.resolve({ data: [] as LigneRole[] }),
    ids.length
      ? client
          .from("utilisateur_succursales")
          .select("utilisateur_id, entreprises(nom)")
          .in("utilisateur_id", ids)
          .returns<LigneSucc[]>()
      : Promise.resolve({ data: [] as LigneSucc[] }),
  ]);

  const parUtilisateur = new Map<number, UtilisateurListe>();
  for (const u of utilisateurs) {
    parUtilisateur.set(u.id, { ...u, roles: [], succursales: [] });
  }
  for (const ligne of rolesLiens.data ?? []) {
    const item = parUtilisateur.get(ligne.utilisateur_id);
    if (item && ligne.roles?.code) item.roles.push(ligne.roles.code);
  }
  for (const ligne of succLiens.data ?? []) {
    const item = parUtilisateur.get(ligne.utilisateur_id);
    if (item && ligne.entreprises?.nom) item.succursales.push(ligne.entreprises.nom);
  }

  return (
    <div className="space-y-6">
      <EnTetePage icone={Users} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionUtilisateurs
        utilisateurs={[...parUtilisateur.values()]}
        roles={roles}
        succursales={succursales.map((s) => ({ id: s.id, nom: s.nom }))}
      />
    </div>
  );
}
