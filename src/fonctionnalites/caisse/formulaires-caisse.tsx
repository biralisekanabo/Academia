"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Champ,
  ChampSelecteur,
  ChampZoneTexte,
} from "@/composants/partages/champ-formulaire";
import { Bouton } from "@/composants/ui/bouton";
import type {
  Caisse,
  Devise,
  Dette,
  Etudiant,
} from "@/types/base";

export type UtilisateurLite = { id: number; nom: string; prenom: string };

const METHODES = [
  "ESPECES",
  "MOBILE_MONEY",
  "CARTE_BANCAIRE",
  "VIREMENT",
  "CHEQUE",
  "AUTRE",
] as const;

export const TYPES_MOUVEMENT = [
  "ENTREE",
  "SORTIE",
  "TRANSFERT",
  "REMBOURSEMENT",
  "CORRECTION",
] as const;

export function FormulaireCaisse({
  caisse,
  devises,
  utilisateurs,
  enCours,
  onFermer,
  onSoumettre,
}: {
  caisse: Caisse | null;
  devises: Devise[];
  utilisateurs: UtilisateurLite[];
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    code: caisse?.code ?? "",
    nom: caisse?.nom ?? "",
    devise_id: String(caisse?.devise_id ?? devises[0]?.id ?? ""),
    caissier_id: caisse?.caissier_id ? String(caisse.caissier_id) : "",
    solde_initial: caisse ? String(caisse.solde_initial) : "0",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({
          ...etat,
          solde_initial: Number(etat.solde_initial || 0),
          caissier_id: etat.caissier_id ? Number(etat.caissier_id) : undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ
          label={t("caisse.code")}
          value={etat.code}
          onChange={(e) => setEtat({ ...etat, code: e.target.value.toUpperCase() })}
          disabled={Boolean(caisse)}
          required
        />
        <Champ label={t("caisse.nom")} value={etat.nom} onChange={(e) => setEtat({ ...etat, nom: e.target.value })} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampSelecteur label={t("caisse.devise")} className="w-full" value={etat.devise_id} onChange={(e) => setEtat({ ...etat, devise_id: e.target.value })} required>
          {devises.map((d) => (
            <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
          ))}
        </ChampSelecteur>
        <Champ
          label={t("caisse.soldeInitial")}
          type="number"
          step="0.01"
          min="0"
          value={etat.solde_initial}
          onChange={(e) => setEtat({ ...etat, solde_initial: e.target.value })}
          disabled={Boolean(caisse)}
        />
      </div>
      <ChampSelecteur label={t("caisse.caissier")} className="w-full" value={etat.caissier_id} onChange={(e) => setEtat({ ...etat, caissier_id: e.target.value })}>
        <option value="">{t("caisse.aucunCaissier")}</option>
        {utilisateurs.map((u) => (
          <option key={u.id} value={u.id}>{u.nom} {u.prenom}</option>
        ))}
      </ChampSelecteur>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Bouton type="button" variante="contour" onClick={onFermer}>{t("commun.annuler")}</Bouton>
        <Bouton type="submit" disabled={enCours}>
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("commun.sauvegarder")}
        </Bouton>
      </div>
    </form>
  );
}

export function FormulaireOuverture({
  enCours,
  onFermer,
  onSoumettre,
}: {
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (fonds: number) => void;
}) {
  const t = useTranslations();
  const [fonds, setFonds] = useState("0");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre(Number(fonds || 0));
      }}
      className="space-y-4"
    >
      <Champ label={t("caisse.fondsInitial")} type="number" step="0.01" min="0" value={fonds} onChange={(e) => setFonds(e.target.value)} required />
      <div className="flex justify-end gap-2 border-t pt-4">
        <Bouton type="button" variante="contour" onClick={onFermer}>{t("commun.annuler")}</Bouton>
        <Bouton type="submit" disabled={enCours}>
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("caisse.ouvrirSession")}
        </Bouton>
      </div>
    </form>
  );
}

export function FormulaireCloture({
  enCours,
  onFermer,
  onSoumettre,
}: {
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (montant: number, observations: string) => void;
}) {
  const t = useTranslations();
  const [montant, setMontant] = useState("");
  const [observations, setObservations] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre(Number(montant || 0), observations);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">{t("caisse.clotureAide")}</p>
      <Champ label={t("caisse.montantCompte")} type="number" step="0.01" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} required />
      <ChampZoneTexte label={t("caisse.observations")} rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} />
      <div className="flex justify-end gap-2 border-t pt-4">
        <Bouton type="button" variante="contour" onClick={onFermer}>{t("commun.annuler")}</Bouton>
        <Bouton type="submit" disabled={enCours}>
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("caisse.cloturer")}
        </Bouton>
      </div>
    </form>
  );
}

export function FormulaireMouvement({
  caisses,
  devises,
  enCours,
  onFermer,
  onSoumettre,
}: {
  caisses: Caisse[];
  devises: Devise[];
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    caisse_id: String(caisses[0]?.id ?? ""),
    type: "SORTIE" as (typeof TYPES_MOUVEMENT)[number],
    montant: "",
    devise_id: String(devises[0]?.id ?? ""),
    motif: "",
    beneficiaire: "",
    categorie: "",
    reference: "",
    caisse_destination_id: "",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({
          caisse_id: Number(etat.caisse_id),
          type: etat.type,
          montant: Number(etat.montant),
          devise_id: Number(etat.devise_id),
          motif: etat.motif,
          beneficiaire: etat.beneficiaire || undefined,
          categorie: etat.categorie || undefined,
          reference: etat.reference || undefined,
          caisse_destination_id:
            etat.type === "TRANSFERT" && etat.caisse_destination_id
              ? Number(etat.caisse_destination_id)
              : undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampSelecteur label={t("caisse.caisse")} className="w-full" value={etat.caisse_id} onChange={(e) => setEtat({ ...etat, caisse_id: e.target.value })} required>
          {caisses.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </ChampSelecteur>
        <ChampSelecteur label={t("caisse.type")} className="w-full" value={etat.type} onChange={(e) => setEtat({ ...etat, type: e.target.value as (typeof TYPES_MOUVEMENT)[number] })} required>
          {TYPES_MOUVEMENT.map((v) => (
            <option key={v} value={v}>{t(`caisse.typesMouvement.${v}` as never)}</option>
          ))}
        </ChampSelecteur>
      </div>

      {etat.type === "TRANSFERT" && (
        <ChampSelecteur label={t("caisse.caisseDestination")} className="w-full" value={etat.caisse_destination_id} onChange={(e) => setEtat({ ...etat, caisse_destination_id: e.target.value })} required>
          <option value="">{t("caisse.choisirCaisse")}</option>
          {caisses
            .filter((c) => c.id !== Number(etat.caisse_id))
            .map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
        </ChampSelecteur>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("caisse.montant")} type="number" step="0.01" min="0" value={etat.montant} onChange={(e) => setEtat({ ...etat, montant: e.target.value })} required />
        <ChampSelecteur label={t("caisse.devise")} className="w-full" value={etat.devise_id} onChange={(e) => setEtat({ ...etat, devise_id: e.target.value })} required>
          {devises.map((d) => (
            <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
          ))}
        </ChampSelecteur>
      </div>

      <ChampZoneTexte label={t("caisse.motif")} rows={3} value={etat.motif} onChange={(e) => setEtat({ ...etat, motif: e.target.value })} required />

      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("caisse.beneficiaire")} value={etat.beneficiaire} onChange={(e) => setEtat({ ...etat, beneficiaire: e.target.value })} />
        <Champ label={t("caisse.categorie")} value={etat.categorie} onChange={(e) => setEtat({ ...etat, categorie: e.target.value })} />
      </div>
      <Champ label={t("caisse.reference")} value={etat.reference} onChange={(e) => setEtat({ ...etat, reference: e.target.value })} />

      <div className="flex justify-end gap-2 border-t pt-4">
        <Bouton type="button" variante="contour" onClick={onFermer}>{t("commun.annuler")}</Bouton>
        <Bouton type="submit" disabled={enCours}>
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("commun.sauvegarder")}
        </Bouton>
      </div>
    </form>
  );
}

export function FormulairePaiement({
  etudiants,
  dettes,
  caisses,
  libellesFrais,
  codes,
  enCours,
  onFermer,
  onSoumettre,
}: {
  etudiants: Etudiant[];
  dettes: Dette[];
  caisses: Caisse[];
  libellesFrais: Map<number, string>;
  codes: Map<number, string>;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [etudiantId, setEtudiantId] = useState(
    String(etudiants[0]?.id ?? "")
  );
  const [caisseId, setCaisseId] = useState(String(caisses[0]?.id ?? ""));
  const [methode, setMethode] = useState<(typeof METHODES)[number]>("ESPECES");
  const [reference, setReference] = useState("");
  const [montants, setMontants] = useState<Record<number, string>>({});

  const ouvertes = dettes.filter(
    (d) =>
      d.etudiant_id === Number(etudiantId) &&
      d.statut !== "PAYEE" &&
      d.statut !== "ANNULEE" &&
      Number(d.solde) > 0
  );

  const total = ouvertes.reduce(
    (s, d) => s + (Number(montants[d.id] ?? d.solde) || 0),
    0
  );

  const devisesConcernees = new Set(ouvertes.map((d) => d.devise_id));
  const deviseId = ouvertes[0]?.devise_id;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const allocations = ouvertes
          .map((d) => ({ dette_id: d.id, montant: Number(montants[d.id] ?? d.solde) }))
          .filter((a) => a.montant > 0);
        onSoumettre({
          etudiant_id: Number(etudiantId),
          caisse_id: Number(caisseId),
          methode,
          reference_transaction: reference || undefined,
          allocations,
        });
      }}
      className="space-y-4"
    >
      <ChampSelecteur label={t("caisse.etudiant")} className="w-full" value={etudiantId} onChange={(e) => { setEtudiantId(e.target.value); setMontants({}); }} required>
        <option value="">{t("caisse.choisirEtudiant")}</option>
        {etudiants.map((e) => (
          <option key={e.id} value={e.id}>{e.nom} {e.prenom} — {e.matricule}</option>
        ))}
      </ChampSelecteur>

      <ChampSelecteur label={t("caisse.caisse")} className="w-full" value={caisseId} onChange={(e) => setCaisseId(e.target.value)} required>
        {caisses.map((c) => (
          <option key={c.id} value={c.id}>{c.nom}</option>
        ))}
      </ChampSelecteur>

      <div className="rounded-xl border p-3">
        <p className="mb-2 text-sm font-medium">{t("caisse.dettesASolder")}</p>
        {ouvertes.length === 0 && (
          <p className="text-xs text-muted-foreground">{t("caisse.aucuneDette")}</p>
        )}
        <div className="space-y-2">
          {ouvertes.map((d) => (
            <div key={d.id} className="flex items-center gap-2">
              <span className="flex-1 text-sm">
                {libellesFrais.get(d.frais_academique_id) ?? "—"}
                <span className="ml-2 text-xs text-muted-foreground">
                  {t("caisse.solde")} {d.solde} {codes.get(d.devise_id) ?? ""}
                </span>
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={d.solde}
                className="h-9 w-32 rounded-md border bg-background px-3 text-sm"
                value={montants[d.id] ?? d.solde}
                onChange={(e) => setMontants({ ...montants, [d.id]: e.target.value })}
              />
            </div>
          ))}
        </div>
        {ouvertes.length > 0 && (
          <div className="mt-3 flex items-center justify-between border-t pt-2 text-sm">
            <span className="font-medium">{t("caisse.total")}</span>
            <span className="font-mono font-semibold">
              {total.toFixed(2)} {codes.get(deviseId ?? 0) ?? ""}
            </span>
          </div>
        )}
        {devisesConcernees.size > 1 && (
          <p className="mt-2 text-xs text-destructive">{t("caisse.devisesMemees")}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChampSelecteur label={t("caisse.methode")} className="w-full" value={methode} onChange={(e) => setMethode(e.target.value as (typeof METHODES)[number])} required>
          {METHODES.map((m) => (
            <option key={m} value={m}>{t(`caisse.methodes.${m}` as never)}</option>
          ))}
        </ChampSelecteur>
        <Champ label={t("caisse.reference")} value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Bouton type="button" variante="contour" onClick={onFermer}>{t("commun.annuler")}</Bouton>
        <Bouton type="submit" disabled={enCours || ouvertes.length === 0 || total <= 0}>
          {enCours && <LoaderCircle className="animate-spin" />}
          {t("caisse.encaisser")}
        </Bouton>
      </div>
    </form>
  );
}
