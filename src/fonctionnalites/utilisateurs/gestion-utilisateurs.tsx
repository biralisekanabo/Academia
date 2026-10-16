"use client";

import { useMemo, useState, useTransition } from "react";
import {
  KeyRound,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  attribuerRoles,
  attribuerSuccursales,
  creerUtilisateur,
  definirStatutUtilisateur,
  modifierUtilisateur,
  reinitialiserMotDePasse,
  supprimerUtilisateur,
} from "@/actions/utilisateurs";
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
import { useToast } from "@/composants/ui/toaster";
import type { Role, Utilisateur } from "@/types/base";

export type UtilisateurListe = Utilisateur & {
  roles: string[];
  succursales: string[];
};

type ChampEtat = {
  ouvert: boolean;
  utilisateur: UtilisateurListe | null;
};

const VIDE: ChampEtat = { ouvert: false, utilisateur: null };

export function GestionUtilisateurs({
  utilisateurs,
  roles,
  succursales,
}: {
  utilisateurs: UtilisateurListe[];
  roles: Role[];
  succursales: { id: number; nom: string }[];
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();

  const [recherche, setRecherche] = useState("");
  const [formulaire, setFormulaire] = useState<ChampEtat>(VIDE);
  const [rolesModale, setRolesModale] = useState<ChampEtat>(VIDE);
  const [accesModale, setAccesModale] = useState<ChampEtat>(VIDE);
  const [mdpModale, setMdpModale] = useState<ChampEtat>(VIDE);

  const filtres = useMemo(() => {
    const q = recherche.toLowerCase();
    return utilisateurs.filter(
      (u) =>
        u.nom_complet.toLowerCase().includes(q) ||
        u.nom_utilisateur.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
  }, [utilisateurs, recherche]);

  const nomsRoles = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of roles) m.set(r.code, r.nom);
    return m;
  }, [roles]);

  function revalider() {
    toasts.succes(t("toasts.succes"), t("utilisateurs.enregistre"));
    setFormulaire(VIDE);
    setRolesModale(VIDE);
    setAccesModale(VIDE);
    setMdpModale(VIDE);
  }

  function basculerStatut(u: UtilisateurListe) {
    const prochain = u.statut === "ACTIF" ? "INACTIF" : "ACTIF";
    demarrer(async () => {
      const r = await definirStatutUtilisateur(u.id, prochain);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("utilisateurs.statutMaj"));
    });
  }

  function supprimer(u: UtilisateurListe) {
    if (!window.confirm(t("utilisateurs.confirmerSuppression", { nom: u.nom_complet })))
      return;
    demarrer(async () => {
      const r = await supprimerUtilisateur(u.id);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("utilisateurs.supprime"));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={t("utilisateurs.recherche")}
          className="border-input focus-visible:ring-ring/50 h-9 w-full max-w-sm rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
        />
        <Bouton
          onClick={() => setFormulaire({ ouvert: true, utilisateur: null })}
          className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20"
        >
          <Plus />
          {t("utilisateurs.nouveau")}
        </Bouton>
      </div>

      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("utilisateurs.nom")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("utilisateurs.identifiant")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("utilisateurs.roles")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("utilisateurs.succursales")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("utilisateurs.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">
                {t("commun.actions")}
              </TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {filtres.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t("utilisateurs.vide")}
                </TableauCellule>
              </TableauLigne>
            )}
            {filtres.map((u) => (
              <TableauLigne key={u.id}>
                <TableauCellule>
                  <span className="font-medium">{u.nom_complet}</span>
                  {u.est_admin_principal && (
                    <Insigne className="ml-2" variante="secondaire">
                      {t("etablissements.adminPrincipal")}
                    </Insigne>
                  )}
                </TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {u.nom_utilisateur}
                </TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {u.roles.length === 0
                    ? "—"
                    : u.roles.map((c) => nomsRoles.get(c) ?? c).join(", ")}
                </TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {u.succursales.length === 0 ? "—" : u.succursales.join(", ")}
                </TableauCellule>
                <TableauCellule>
                  <button onClick={() => basculerStatut(u)} disabled={enCours}>
                    <Insigne variante={u.statut === "ACTIF" ? "parDefaut" : "secondaire"}>
                      {t(`utilisateurs.statuts.${u.statut}` as never)}
                    </Insigne>
                  </button>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <IconeAction
                      titre={t("utilisateurs.roles")}
                      onClick={() => setRolesModale({ ouvert: true, utilisateur: u })}
                    >
                      <ShieldCheck />
                    </IconeAction>
                    <IconeAction
                      titre={t("utilisateurs.acces")}
                      onClick={() => setAccesModale({ ouvert: true, utilisateur: u })}
                    >
                      <UserCog />
                    </IconeAction>
                    <IconeAction
                      titre={t("utilisateurs.motDePasse")}
                      onClick={() => setMdpModale({ ouvert: true, utilisateur: u })}
                    >
                      <KeyRound />
                    </IconeAction>
                    <IconeAction
                      titre={t("commun.modifier")}
                      onClick={() => setFormulaire({ ouvert: true, utilisateur: u })}
                    >
                      <Pencil />
                    </IconeAction>
                    {!u.est_admin_principal && (
                      <IconeAction
                        titre={t("commun.supprimer")}
                        danger
                        onClick={() => supprimer(u)}
                      >
                        <Trash2 />
                      </IconeAction>
                    )}
                  </div>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>

      {formulaire.ouvert && (
        <ModaleUtilisateur
          utilisateur={formulaire.utilisateur}
          roles={roles}
          succursales={succursales}
          onFermer={() => setFormulaire(VIDE)}
          onReussi={revalider}
        />
      )}

      {rolesModale.ouvert && rolesModale.utilisateur && (
        <ModaleRoles
          utilisateur={rolesModale.utilisateur}
          roles={roles}
          onFermer={() => setRolesModale(VIDE)}
          onReussi={revalider}
        />
      )}

      {accesModale.ouvert && accesModale.utilisateur && (
        <ModaleAcces
          utilisateur={accesModale.utilisateur}
          succursales={succursales}
          onFermer={() => setAccesModale(VIDE)}
          onReussi={revalider}
        />
      )}

      {mdpModale.ouvert && mdpModale.utilisateur && (
        <ModaleMotDePasse
          utilisateur={mdpModale.utilisateur}
          onFermer={() => setMdpModale(VIDE)}
          onReussi={revalider}
        />
      )}
    </div>
  );
}

function IconeAction({
  titre,
  danger,
  onClick,
  children,
}: {
  titre: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titre}
      aria-label={titre}
      className={
        "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors [&_svg]:size-4 " +
        (danger
          ? "hover:bg-destructive/10 hover:text-destructive"
          : "hover:bg-accent hover:text-accent-foreground")
      }
    >
      {children}
    </button>
  );
}

function ModaleUtilisateur({
  utilisateur,
  roles,
  succursales,
  onFermer,
  onReussi,
}: {
  utilisateur: UtilisateurListe | null;
  roles: Role[];
  succursales: { id: number; nom: string }[];
  onFermer: () => void;
  onReussi: () => void;
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const [nomComplet, setNomComplet] = useState(utilisateur?.nom_complet ?? "");
  const [nomUtilisateur, setNomUtilisateur] = useState(utilisateur?.nom_utilisateur ?? "");
  const [email, setEmail] = useState(utilisateur?.email ?? "");
  const [telephone, setTelephone] = useState(utilisateur?.telephone ?? "");
  const [motDePasse, setMotDePasse] = useState("");
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [succursaleIds, setSuccursaleIds] = useState<number[]>([]);

  function basculer(liste: number[], set: (v: number[]) => void, id: number) {
    set(liste.includes(id) ? liste.filter((x) => x !== id) : [...liste, id]);
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    demarrer(async () => {
      if (utilisateur) {
        const r = await modifierUtilisateur({
          id: utilisateur.id,
          nomComplet,
          email,
          telephone,
        });
        if (r.erreur) {
          setErreur(r.erreur);
          return toasts.erreur(t("toasts.erreur"), r.erreur);
        }
      } else {
        const r = await creerUtilisateur({
          nomComplet,
          nomUtilisateur,
          email,
          telephone,
          motDePasse,
          roleIds,
          succursaleIds,
        });
        if (r.erreur) {
          setErreur(r.erreur);
          return toasts.erreur(t("toasts.erreur"), r.erreur);
        }
      }
      onReussi();
    });
  }

  return (
    <Modale
      ouvert
      titre={utilisateur ? t("utilisateurs.modifierTitre") : t("utilisateurs.nouveau")}
      onFermer={onFermer}
    >
      <form onSubmit={soumettre} className="space-y-4">
        {erreur && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {erreur}
          </p>
        )}
        <Champ label={t("utilisateurs.nom")} value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} required />
        {!utilisateur && (
          <Champ
            label={t("utilisateurs.identifiant")}
            value={nomUtilisateur}
            onChange={(e) => setNomUtilisateur(e.target.value)}
            required
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label={t("etablissements.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Champ label={t("etablissements.telephone")} value={telephone} onChange={(e) => setTelephone(e.target.value)} required />
        </div>
        {!utilisateur && (
          <Champ
            label={t("auth.motDePasse")}
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            required
          />
        )}

        {!utilisateur && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("utilisateurs.roles")}</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => basculer(roleIds, setRoleIds, role.id)}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition-colors " +
                      (roleIds.includes(role.id)
                        ? "degrade-brand border-0 text-white"
                        : "hover:bg-accent")
                    }
                  >
                    {role.nom}
                  </button>
                ))}
              </div>
            </div>
            {succursales.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("utilisateurs.succursales")}</p>
                <div className="flex flex-wrap gap-2">
                  {succursales.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => basculer(succursaleIds, setSuccursaleIds, s.id)}
                      className={
                        "rounded-full border px-3 py-1 text-xs transition-colors " +
                        (succursaleIds.includes(s.id)
                          ? "degrade-brand border-0 text-white"
                          : "hover:bg-accent")
                      }
                    >
                      {s.nom}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

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

function ModaleRoles({
  utilisateur,
  roles,
  onFermer,
  onReussi,
}: {
  utilisateur: UtilisateurListe;
  roles: Role[];
  onFermer: () => void;
  onReussi: () => void;
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [selection, setSelection] = useState<number[]>(
    roles.filter((r) => utilisateur.roles.includes(r.code)).map((r) => r.id)
  );

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    demarrer(async () => {
      const r = await attribuerRoles(utilisateur.id, selection);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      onReussi();
    });
  }

  return (
    <Modale ouvert titre={t("utilisateurs.rolesTitre", { nom: utilisateur.nom_complet })} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() =>
                setSelection((prev) =>
                  prev.includes(role.id)
                    ? prev.filter((x) => x !== role.id)
                    : [...prev, role.id]
                )
              }
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors " +
                (selection.includes(role.id)
                  ? "degrade-brand border-0 text-white"
                  : "hover:bg-accent")
              }
            >
              {role.nom}
            </button>
          ))}
        </div>
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

function ModaleAcces({
  utilisateur,
  succursales,
  onFermer,
  onReussi,
}: {
  utilisateur: UtilisateurListe;
  succursales: { id: number; nom: string }[];
  onFermer: () => void;
  onReussi: () => void;
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [selection, setSelection] = useState<number[]>(
    succursales.filter((s) => utilisateur.succursales.includes(s.nom)).map((s) => s.id)
  );

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    demarrer(async () => {
      const r = await attribuerSuccursales(utilisateur.id, selection);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      onReussi();
    });
  }

  return (
    <Modale ouvert titre={t("utilisateurs.accesTitre", { nom: utilisateur.nom_complet })} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-4">
        {succursales.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("succursales.vide")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {succursales.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setSelection((prev) =>
                    prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                  )
                }
                className={
                  "rounded-full border px-3 py-1 text-xs transition-colors " +
                  (selection.includes(s.id)
                    ? "degrade-brand border-0 text-white"
                    : "hover:bg-accent")
                }
              >
                {s.nom}
              </button>
            ))}
          </div>
        )}
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

function ModaleMotDePasse({
  utilisateur,
  onFermer,
  onReussi,
}: {
  utilisateur: UtilisateurListe;
  onFermer: () => void;
  onReussi: () => void;
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [motDePasse, setMotDePasse] = useState("");

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    demarrer(async () => {
      const r = await reinitialiserMotDePasse(utilisateur.id, motDePasse);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      onReussi();
    });
  }

  return (
    <Modale ouvert titre={t("utilisateurs.motDePasseTitre", { nom: utilisateur.nom_complet })} onFermer={onFermer}>
      <form onSubmit={soumettre} className="space-y-4">
        <Champ
          label={t("utilisateurs.nouveauMotDePasse")}
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">{t("utilisateurs.motDePasseAide")}</p>
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
