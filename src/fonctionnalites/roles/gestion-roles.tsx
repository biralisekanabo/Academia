"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, Lock, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  creerRole,
  definirPermissionsRole,
  modifierRole,
  supprimerRole,
} from "@/actions/roles";
import { Champ } from "@/composants/partages/champ-formulaire";
import { Modale } from "@/composants/partages/modale";
import { Bouton } from "@/composants/ui/bouton";
import { Insigne } from "@/composants/ui/insigne";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import { useConfirmation } from "@/composants/ui/confirmation";
import { useToast } from "@/composants/ui/toaster";
import type { Permission, Role } from "@/types/base";

export function GestionRoles({
  roles,
  permissions,
  permissionsParRole,
}: {
  roles: Role[];
  permissions: Permission[];
  permissionsParRole: Record<number, number[]>;
}) {
  const t = useTranslations();
  const toasts = useToast();
  const { confirmer } = useConfirmation();
  const [enCours, demarrer] = useTransition();

  const [roleForm, setRoleForm] = useState<Role | null | undefined>(undefined);
  const [rolePerms, setRolePerms] = useState<Role | null>(null);

  const modules = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module)!.push(p);
    }
    return [...map.entries()];
  }, [permissions]);

  async function supprimer(role: Role) {
    const ok = await confirmer({
      titre: t("commun.supprimer"),
      message: t("roles.confirmerSuppression", { nom: role.nom }),
      variante: "destructive",
    });
    if (!ok) return;
    demarrer(async () => {
      const r = await supprimerRole(role.id);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("roles.supprime"));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Bouton
          onClick={() => setRoleForm(null)}
          className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20"
        >
          <Plus />
          {t("roles.nouveau")}
        </Bouton>
      </div>

      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("roles.nom")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("roles.code")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("roles.type")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">
                {t("commun.actions")}
              </TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {roles.map((role) => (
              <TableauLigne key={role.id}>
                <TableauCellule>
                  <span className="font-medium">{role.nom}</span>
                  {role.description && (
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  )}
                </TableauCellule>
                <TableauCellule className="font-mono text-xs text-muted-foreground">
                  {role.code}
                </TableauCellule>
                <TableauCellule>
                  <Insigne variante={role.est_systeme ? "secondaire" : "parDefaut"}>
                    {role.est_systeme ? t("roles.systeme") : t("roles.personnalise")}
                  </Insigne>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {role.est_systeme ? (
                      <span
                        className="grid size-8 place-items-center text-muted-foreground"
                        title={t("roles.systemeVerrouille")}
                      >
                        <Lock className="size-4" />
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => setRolePerms(role)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                          aria-label={t("roles.permissions")}
                        >
                          <ShieldCheck />
                        </button>
                        <button
                          onClick={() => setRoleForm(role)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                          aria-label={t("commun.modifier")}
                        >
                          <Pencil />
                        </button>
                        <button
                          onClick={() => supprimer(role)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4"
                          aria-label={t("commun.supprimer")}
                        >
                          <Trash2 />
                        </button>
                      </>
                    )}
                  </div>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>

      {roleForm !== undefined && (
        <ModaleRole
          role={roleForm}
          enCours={enCours}
          onFermer={() => setRoleForm(undefined)}
          onSoumettre={(donnees) =>
            demarrer(async () => {
              const r = roleForm
                ? await modifierRole({ id: roleForm.id, ...donnees })
                : await creerRole(donnees);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("roles.enregistre"));
              setRoleForm(undefined);
            })
          }
        />
      )}

      {rolePerms && (
        <ModalePermissions
          role={rolePerms}
          modules={modules}
          selectionInitiale={permissionsParRole[rolePerms.id] ?? []}
          onFermer={() => setRolePerms(null)}
          onEnregistrer={(ids) =>
            demarrer(async () => {
              const r = await definirPermissionsRole(rolePerms.id, ids);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("roles.permissionsMaj"));
              setRolePerms(null);
            })
          }
        />
      )}
    </div>
  );
}

function ModaleRole({
  role,
  enCours,
  onFermer,
  onSoumettre,
}: {
  role: Role | null;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: { code: string; nom: string; description?: string }) => void;
}) {
  const t = useTranslations();
  const [code, setCode] = useState(role?.code ?? "");
  const [nom, setNom] = useState(role?.nom ?? "");
  const [description, setDescription] = useState(role?.description ?? "");

  return (
    <Modale
      ouvert
      titre={role ? t("roles.modifier") : t("roles.nouveau")}
      onFermer={onFermer}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSoumettre({ code, nom, description });
        }}
        className="space-y-4"
      >
        <Champ
          label={t("roles.code")}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={Boolean(role)}
          placeholder="ENCADREUR"
          required
        />
        <Champ label={t("roles.nom")} value={nom} onChange={(e) => setNom(e.target.value)} required />
        <Champ
          label={t("roles.description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="flex justify-end gap-2 border-t pt-4">
          <Bouton type="button" variante="contour" onClick={onFermer}>
            {t("commun.annuler")}
          </Bouton>
          <Bouton type="submit" disabled={enCours}>
            {enCours && <LoaderCircle className="animate-spin" />}
            {t("commun.sauvegarder")}
          </Bouton>
        </div>
      </form>
    </Modale>
  );
}

function ModalePermissions({
  role,
  modules,
  selectionInitiale,
  onFermer,
  onEnregistrer,
}: {
  role: Role;
  modules: [string, Permission[]][];
  selectionInitiale: number[];
  onFermer: () => void;
  onEnregistrer: (ids: number[]) => void;
}) {
  const t = useTranslations();
  const [selection, setSelection] = useState<number[]>(selectionInitiale);

  function basculer(id: number) {
    setSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function basculerModule(perms: Permission[], actif: boolean) {
    const ids = perms.map((p) => p.id);
    setSelection((prev) =>
      actif
        ? [...new Set([...prev, ...ids])]
        : prev.filter((x) => !ids.includes(x))
    );
  }

  return (
    <Modale
      ouvert
      titre={t("roles.permissionsTitre", { nom: role.nom })}
      sousTitre={t("roles.permissionsAide")}
      onFermer={onFermer}
    >
      <div className="max-h-[60dvh] space-y-5 overflow-y-auto pr-1">
        {modules.map(([module, perms]) => {
          const tous = perms.every((p) => selection.includes(p.id));
          return (
            <div key={module} className="rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">{t(`modules.${module}` as never) || module}</p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={tous}
                    onChange={(e) => basculerModule(perms, e.target.checked)}
                  />
                  {t("roles.tout")}
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className={
                      "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors " +
                      (selection.includes(p.id)
                        ? "degrade-brand border-0 text-white"
                        : "hover:bg-accent")
                    }
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selection.includes(p.id)}
                      onChange={() => basculer(p.id)}
                    />
                    {t(`actions.${p.action}` as never) || p.action}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t pt-4">
        <Bouton type="button" variante="contour" onClick={onFermer}>
          {t("commun.annuler")}
        </Bouton>
        <Bouton type="button" onClick={() => onEnregistrer(selection)}>
          {t("commun.sauvegarder")}
        </Bouton>
      </div>
    </Modale>
  );
}
