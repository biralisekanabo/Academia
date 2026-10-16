import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { ShieldCheck } from "lucide-react";

import { exigerPermission, exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import { EnTetePage } from "@/composants/partages/en-tete-page";
import { GestionRoles } from "@/fonctionnalites/roles/gestion-roles";
import type { Permission, Role } from "@/types/base";

type LignePermissionRole = { role_id: number; permission_id: number };

export default async function PageRoles() {
  await connection();
  const session = await exigerSession();
  await exigerPermission(session, "ROLES.CONSULTER");
  const t = await getTranslations("roles");

  const client = bd();

  const [rolesRes, permissionsRes] = await Promise.all([
    client
      .from("roles")
      .select("*")
      .or(`entreprise_id.is.null,entreprise_id.eq.${session.entrepriseId}`)
      .neq("code", "SUPER_ADMIN")
      .order("est_systeme", { ascending: false })
      .order("nom")
      .returns<Role[]>(),
    client
      .from("permissions")
      .select("*")
      .order("module")
      .order("action")
      .returns<Permission[]>(),
  ]);

  const roles = rolesRes.data ?? [];
  const roleIds = roles.map((r) => r.id);

  const { data: liens } = roleIds.length
    ? await client
        .from("role_permissions")
        .select("role_id, permission_id")
        .in("role_id", roleIds)
        .returns<LignePermissionRole[]>()
    : { data: [] as LignePermissionRole[] };

  const permissionsParRole: Record<number, number[]> = {};
  for (const l of liens ?? []) {
    (permissionsParRole[l.role_id] ??= []).push(l.permission_id);
  }

  return (
    <div className="space-y-6">
      <EnTetePage icone={ShieldCheck} titre={t("titre")} sousTitre={t("sousTitre")} />
      <GestionRoles
        roles={roles}
        permissions={permissionsRes.data ?? []}
        permissionsParRole={permissionsParRole}
      />
    </div>
  );
}
