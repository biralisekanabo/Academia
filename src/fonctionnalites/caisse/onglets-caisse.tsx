"use client";

import { LogIn, LogOut, Pencil, Plus, Printer, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { Link } from "@/i18n/navigation";
import type {
  Caisse,
  MouvementCaisse,
  Paiement,
  SessionCaisse,
} from "@/types/base";

export function OngletCaisses({
  caisses,
  codes,
  enCours,
  surNouvelle,
  surModifier,
  surOuvrirSession,
  surSuspendre,
  surSupprimer,
}: {
  caisses: Caisse[];
  codes: Map<number, string>;
  enCours: boolean;
  surNouvelle: () => void;
  surModifier: (c: Caisse) => void;
  surOuvrirSession: (c: Caisse) => void;
  surSuspendre: (c: Caisse) => void;
  surSupprimer: (c: Caisse) => void;
}) {
  const t = useTranslations();

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={surNouvelle} disabled={codes.size === 0} className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20">
          <Plus />
          {t("caisse.nouvelleCaisse")}
        </Bouton>
      </div>

      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("caisse.code")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.nom")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.devise")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {caisses.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={5} className="py-8 text-center text-muted-foreground">
                  {t("caisse.vides")}
                </TableauCellule>
              </TableauLigne>
            )}
            {caisses.map((c) => (
              <TableauLigne key={c.id}>
                <TableauCellule className="font-mono text-xs font-semibold">{c.code}</TableauCellule>
                <TableauCellule className="font-medium">{c.nom}</TableauCellule>
                <TableauCellule className="text-muted-foreground">{codes.get(c.devise_id) ?? "—"}</TableauCellule>
                <TableauCellule>
                  <Insigne variante={c.statut === "OUVERTE" ? "parDefaut" : c.statut === "SUSPENDUE" ? "secondaire" : "contour"}>
                    {t(`caisse.statuts.${c.statut}` as never)}
                  </Insigne>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {c.statut !== "OUVERTE" && (
                      <button
                        disabled={enCours}
                        onClick={() => surOuvrirSession(c)}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-600 disabled:opacity-40 [&_svg]:size-4"
                        aria-label={t("caisse.ouvrirSession")}
                      >
                        <LogIn />
                      </button>
                    )}
                    <button
                      onClick={() => surModifier(c)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                      aria-label={t("commun.modifier")}
                    >
                      <Pencil />
                    </button>
                    <button
                      disabled={enCours || c.statut === "OUVERTE"}
                      onClick={() => surSuspendre(c)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 [&_svg]:size-4"
                      aria-label={t("caisse.suspendre")}
                    >
                      <Wallet />
                    </button>
                    <button
                      disabled={enCours || c.statut === "OUVERTE"}
                      onClick={() => surSupprimer(c)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 [&_svg]:size-4"
                      aria-label={t("commun.supprimer")}
                    >
                      <X />
                    </button>
                  </div>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>
    </section>
  );
}

export function OngletSessions({
  sessions,
  nomsCaisses,
  enCours,
  surCloturer,
}: {
  sessions: SessionCaisse[];
  nomsCaisses: Map<number, string>;
  enCours: boolean;
  surCloturer: (s: SessionCaisse) => void;
}) {
  const t = useTranslations();

  return (
    <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
      <Tableau>
        <TableauEntete>
          <TableauLigne>
            <TableauEnteteCellule>{t("caisse.caisse")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("caisse.fondsInitial")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("caisse.totalEntrees")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("caisse.totalSorties")}</TableauEnteteCellule>
            <TableauEnteteCellule>{t("caisse.ecart")}</TableauEnteteCellule>
            <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
          </TableauLigne>
        </TableauEntete>
        <TableauCorps>
          {sessions.length === 0 && (
            <TableauLigne>
              <TableauCellule colSpan={6} className="py-8 text-center text-muted-foreground">
                {t("caisse.sessionsVides")}
              </TableauCellule>
            </TableauLigne>
          )}
          {sessions.map((s) => (
            <TableauLigne key={s.id}>
              <TableauCellule className="font-medium">
                {nomsCaisses.get(s.caisse_id) ?? "—"}
                <Insigne className="ml-2" variante={s.statut === "OUVERTE" ? "parDefaut" : "secondaire"}>
                  {t(`caisse.statutsSession.${s.statut}` as never)}
                </Insigne>
              </TableauCellule>
              <TableauCellule className="font-mono text-xs">{s.fonds_initial}</TableauCellule>
              <TableauCellule className="font-mono text-xs text-green-600">+{s.total_entrees}</TableauCellule>
              <TableauCellule className="font-mono text-xs text-destructive">-{s.total_sorties}</TableauCellule>
              <TableauCellule className="font-mono text-xs">{s.ecart === null ? "—" : s.ecart}</TableauCellule>
              <TableauCellule className="text-right">
                {s.statut === "OUVERTE" && (
                  <Bouton variante="contour" taille="sm" onClick={() => surCloturer(s)} disabled={enCours}>
                    <LogOut />
                    {t("caisse.cloturer")}
                  </Bouton>
                )}
              </TableauCellule>
            </TableauLigne>
          ))}
        </TableauCorps>
      </Tableau>
    </div>
  );
}

export function OngletMouvements({
  mouvements,
  codes,
  enCours,
  surNouveau,
  surAnnuler,
}: {
  mouvements: MouvementCaisse[];
  codes: Map<number, string>;
  enCours: boolean;
  surNouveau: () => void;
  surAnnuler: (m: MouvementCaisse) => void;
}) {
  const t = useTranslations();

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={surNouveau} className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20">
          <Plus />
          {t("caisse.nouveauMouvement")}
        </Bouton>
      </div>

      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("caisse.piece")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.type")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.motif")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.montant")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {mouvements.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t("caisse.mouvementsVides")}
                </TableauCellule>
              </TableauLigne>
            )}
            {mouvements.map((m) => (
              <TableauLigne key={m.id}>
                <TableauCellule className="font-mono text-xs font-semibold">{m.numero_piece}</TableauCellule>
                <TableauCellule>
                  <Insigne
                    variante={m.type === "ENTREE" ? "parDefaut" : m.type === "SORTIE" ? "destructif" : "secondaire"}
                  >
                    {t(`caisse.typesMouvement.${m.type}` as never)}
                  </Insigne>
                </TableauCellule>
                <TableauCellule className="max-w-[240px] truncate text-muted-foreground">{m.motif}</TableauCellule>
                <TableauCellule className="font-mono text-xs">
                  {m.montant} {codes.get(m.devise_id) ?? ""}
                </TableauCellule>
                <TableauCellule>
                  <Insigne variante={m.statut === "VALIDE" ? "parDefaut" : "destructif"}>
                    {t(`caisse.statutsMouvement.${m.statut}` as never)}
                  </Insigne>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <button
                    disabled={enCours || m.statut !== "VALIDE"}
                    onClick={() => surAnnuler(m)}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 [&_svg]:size-4"
                    aria-label={t("caisse.annuler")}
                  >
                    <X />
                  </button>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>
    </section>
  );
}

export function OngletPaiements({
  paiements,
  codes,
  nomsEtudiants,
  matricules,
  enCours,
  pret,
  surNouveau,
  surAnnuler,
}: {
  paiements: Paiement[];
  codes: Map<number, string>;
  nomsEtudiants: Map<number, string>;
  matricules: Map<number, string>;
  enCours: boolean;
  pret: boolean;
  surNouveau: () => void;
  surAnnuler: (p: Paiement) => void;
}) {
  const t = useTranslations();

  return (
    <section className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={surNouveau} disabled={!pret} className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20">
          <Plus />
          {t("caisse.nouveauPaiement")}
        </Bouton>
      </div>

      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("caisse.recu")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.etudiant")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.montant")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.methode")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.date")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("caisse.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {paiements.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={7} className="py-8 text-center text-muted-foreground">
                  {t("caisse.paiementsVides")}
                </TableauCellule>
              </TableauLigne>
            )}
            {paiements.map((p) => (
              <TableauLigne key={p.id}>
                <TableauCellule className="font-mono text-xs font-semibold">{p.numero_recu}</TableauCellule>
                <TableauCellule className="font-medium">
                  {nomsEtudiants.get(p.etudiant_id) ?? "—"}
                  <span className="ml-2 font-mono text-xs text-muted-foreground">{matricules.get(p.etudiant_id)}</span>
                </TableauCellule>
                <TableauCellule className="font-mono text-xs">
                  {p.montant} {codes.get(p.devise_id) ?? ""}
                </TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {t(`caisse.methodes.${p.methode}` as never)}
                </TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {new Date(p.date_paiement).toLocaleDateString()}
                </TableauCellule>
                <TableauCellule>
                  <Insigne
                    variante={p.statut === "VALIDE" ? "parDefaut" : p.statut === "ANNULE" ? "destructif" : "secondaire"}
                  >
                    {t(`caisse.statutsPaiement.${p.statut}` as never)}
                  </Insigne>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/impression/recu/${p.id}`}
                      target="_blank"
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                      aria-label={t("caisse.imprimerRecu")}
                    >
                      <Printer />
                    </Link>
                    <button
                      disabled={enCours || p.statut !== "VALIDE"}
                      onClick={() => surAnnuler(p)}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 [&_svg]:size-4"
                      aria-label={t("caisse.annuler")}
                    >
                      <X />
                    </button>
                  </div>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>
    </section>
  );
}
