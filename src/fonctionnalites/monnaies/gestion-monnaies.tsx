"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowRightLeft,
  Coins,
  LoaderCircle,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  creerDevise,
  definirDeviseReference,
  definirStatutDevise,
  definirTaux,
  modifierDevise,
  supprimerDevise,
} from "@/actions/monnaies";
import {
  Champ,
  ChampSelecteur,
} from "@/composants/partages/champ-formulaire";
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
import type { Devise, TauxChange } from "@/types/base";

export function GestionMonnaies({
  devises,
  tauxCourants,
}: {
  devises: Devise[];
  tauxCourants: TauxChange[];
}) {
  const t = useTranslations();
  const toasts = useToast();
  const { confirmer } = useConfirmation();
  const [enCours, demarrer] = useTransition();
  const [formDevise, setFormDevise] = useState<Devise | null | undefined>(undefined);
  const [formTaux, setFormTaux] = useState(false);

  const codes = useMemo(() => {
    const m = new Map<number, Devise>();
    for (const d of devises) m.set(d.id, d);
    return m;
  }, [devises]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Devises */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Coins className="size-4 text-muted-foreground" />
            {t("monnaies.devisesTitre")}
          </h2>
          <Bouton
            onClick={() => setFormDevise(null)}
            className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20"
          >
            <Plus />
            {t("monnaies.nouvelleDevise")}
          </Bouton>
        </div>

        <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
          <Tableau>
            <TableauEntete>
              <TableauLigne>
                <TableauEnteteCellule>{t("monnaies.code")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("monnaies.nom")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("monnaies.statut")}</TableauEnteteCellule>
                <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
              </TableauLigne>
            </TableauEntete>
            <TableauCorps>
              {devises.length === 0 && (
                <TableauLigne>
                  <TableauCellule colSpan={4} className="py-8 text-center text-muted-foreground">
                    {t("monnaies.devisesVides")}
                  </TableauCellule>
                </TableauLigne>
              )}
              {devises.map((d) => (
                <TableauLigne key={d.id}>
                  <TableauCellule>
                    <span className="font-mono text-xs font-semibold">{d.code}</span>
                    {d.est_reference && (
                      <Insigne variante="secondaire" className="ml-2">
                        <Star className="size-3" />
                        {t("monnaies.reference")}
                      </Insigne>
                    )}
                  </TableauCellule>
                  <TableauCellule className="font-medium">{d.nom}</TableauCellule>
                  <TableauCellule>
                    <button
                      disabled={enCours}
                      onClick={() =>
                        demarrer(async () => {
                          const r = await definirStatutDevise(
                            d.id,
                            d.statut === "ACTIVE" ? "INACTIVE" : "ACTIVE"
                          );
                          if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                          toasts.succes(t("toasts.succes"), t("monnaies.statutMaj"));
                        })
                      }
                    >
                      <Insigne variante={d.statut === "ACTIVE" ? "parDefaut" : "secondaire"}>
                        {t(`monnaies.statuts.${d.statut}` as never)}
                      </Insigne>
                    </button>
                  </TableauCellule>
                  <TableauCellule className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!d.est_reference && (
                        <button
                          disabled={enCours}
                          onClick={() =>
                            demarrer(async () => {
                              const r = await definirDeviseReference(d.id);
                              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                              toasts.succes(t("toasts.succes"), t("monnaies.referenceMaj"));
                            })
                          }
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-600 [&_svg]:size-4"
                          aria-label={t("monnaies.definirReference")}
                        >
                          <Star />
                        </button>
                      )}
                      <button
                        onClick={() => setFormDevise(d)}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4"
                        aria-label={t("commun.modifier")}
                      >
                        <Pencil />
                      </button>
                      <button
                        disabled={enCours || d.est_reference}
                        onClick={async () => {
                          const ok = await confirmer({
                            titre: t("commun.supprimer"),
                            message: t("monnaies.confirmerSuppression", { nom: d.nom }),
                            variante: "destructive",
                          });
                          if (!ok) return;
                          demarrer(async () => {
                            const r = await supprimerDevise(d.id);
                            if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                            toasts.succes(t("toasts.succes"), t("monnaies.supprime"));
                          });
                        }}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 [&_svg]:size-4"
                        aria-label={t("commun.supprimer")}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </TableauCellule>
                </TableauLigne>
              ))}
            </TableauCorps>
          </Tableau>
        </div>
      </section>

      {/* Taux de change */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ArrowRightLeft className="size-4 text-muted-foreground" />
            {t("monnaies.tauxTitre")}
          </h2>
          <Bouton
            onClick={() => setFormTaux(true)}
            disabled={devises.length < 2}
            className="degrade-brand border-0 text-white shadow-md shadow-brand-1/20"
          >
            <Plus />
            {t("monnaies.nouveauTaux")}
          </Bouton>
        </div>

        <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
          <Tableau>
            <TableauEntete>
              <TableauLigne>
                <TableauEnteteCellule>{t("monnaies.paire")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("monnaies.taux")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("monnaies.dateEffet")}</TableauEnteteCellule>
              </TableauLigne>
            </TableauEntete>
            <TableauCorps>
              {tauxCourants.length === 0 && (
                <TableauLigne>
                  <TableauCellule colSpan={3} className="py-8 text-center text-muted-foreground">
                    {t("monnaies.tauxVides")}
                  </TableauCellule>
                </TableauLigne>
              )}
              {tauxCourants.map((taux) => (
                <TableauLigne key={taux.id}>
                  <TableauCellule className="font-medium">
                    {codes.get(taux.devise_source_id)?.code ?? "?"}
                    <span className="mx-1.5 text-muted-foreground">→</span>
                    {codes.get(taux.devise_cible_id)?.code ?? "?"}
                  </TableauCellule>
                  <TableauCellule className="font-mono text-xs">{taux.taux}</TableauCellule>
                  <TableauCellule className="text-muted-foreground">{taux.date_effet}</TableauCellule>
                </TableauLigne>
              ))}
            </TableauCorps>
          </Tableau>
        </div>
      </section>

      {formDevise !== undefined && (
        <Modale
          ouvert
          titre={formDevise ? t("monnaies.modifierDevise") : t("monnaies.nouvelleDevise")}
          onFermer={() => setFormDevise(undefined)}
        >
          <FormulaireDevise
            devise={formDevise}
            enCours={enCours}
            onFermer={() => setFormDevise(undefined)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = formDevise
                  ? await modifierDevise({ id: formDevise.id, ...d })
                  : await creerDevise(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("monnaies.enregistre"));
                setFormDevise(undefined);
              })
            }
          />
        </Modale>
      )}

      {formTaux && (
        <Modale ouvert titre={t("monnaies.nouveauTaux")} onFermer={() => setFormTaux(false)}>
          <FormulaireTaux
            devises={devises}
            enCours={enCours}
            onFermer={() => setFormTaux(false)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = await definirTaux(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("monnaies.tauxEnregistre"));
                setFormTaux(false);
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}

function FormulaireDevise({
  devise,
  enCours,
  onFermer,
  onSoumettre,
}: {
  devise: Devise | null;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    code: devise?.code ?? "",
    nom: devise?.nom ?? "",
    symbole: devise?.symbole ?? "",
    nb_decimales: String(devise?.nb_decimales ?? 2),
    est_reference: devise?.est_reference ?? false,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({ ...etat, nb_decimales: Number(etat.nb_decimales) });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ
          label={t("monnaies.code")}
          value={etat.code}
          onChange={(e) => setEtat({ ...etat, code: e.target.value.toUpperCase() })}
          disabled={Boolean(devise)}
          placeholder="USD"
          required
        />
        <Champ label={t("monnaies.symbole")} value={etat.symbole} onChange={(e) => setEtat({ ...etat, symbole: e.target.value })} placeholder="$" />
      </div>
      <Champ label={t("monnaies.nom")} value={etat.nom} onChange={(e) => setEtat({ ...etat, nom: e.target.value })} placeholder="Dollar américain" required />
      <ChampSelecteur label={t("monnaies.decimales")} className="w-full" value={etat.nb_decimales} onChange={(e) => setEtat({ ...etat, nb_decimales: e.target.value })}>
        {[0, 1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </ChampSelecteur>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={etat.est_reference} onChange={(e) => setEtat({ ...etat, est_reference: e.target.checked })} />
        {t("monnaies.definirReference")}
      </label>
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

function FormulaireTaux({
  devises,
  enCours,
  onFermer,
  onSoumettre,
}: {
  devises: Devise[];
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: Record<string, unknown>) => void;
}) {
  const t = useTranslations();
  const [source, setSource] = useState(String(devises[0]?.id ?? ""));
  const [cible, setCible] = useState(String(devises[1]?.id ?? ""));
  const [taux, setTaux] = useState("");
  const [dateEffet, setDateEffet] = useState(new Date().toISOString().slice(0, 10));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({
          devise_source_id: Number(source),
          devise_cible_id: Number(cible),
          taux: Number(taux),
          date_effet: dateEffet,
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampSelecteur label={t("monnaies.deviseSource")} className="w-full" value={source} onChange={(e) => setSource(e.target.value)} required>
          {devises.map((d) => (
            <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
          ))}
        </ChampSelecteur>
        <ChampSelecteur label={t("monnaies.deviseCible")} className="w-full" value={cible} onChange={(e) => setCible(e.target.value)} required>
          {devises.map((d) => (
            <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
          ))}
        </ChampSelecteur>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("monnaies.taux")} type="number" step="0.000001" value={taux} onChange={(e) => setTaux(e.target.value)} required />
        <Champ label={t("monnaies.dateEffet")} type="date" value={dateEffet} onChange={(e) => setDateEffet(e.target.value)} required />
      </div>
      <p className="text-xs text-muted-foreground">{t("monnaies.tauxAide")}</p>
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
