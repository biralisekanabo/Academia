"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Layers,
  LoaderCircle,
  Network,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  activerAnnee,
  creerAnnee,
  creerDomaine,
  creerFaculte,
  creerPromotion,
  modifierAnnee,
  modifierDomaine,
  modifierFaculte,
  modifierPromotion,
  supprimerAnnee,
  supprimerDomaine,
  supprimerFaculte,
  supprimerPromotion,
} from "@/actions/academique";
import { Champ, ChampSelecteur } from "@/composants/partages/champ-formulaire";
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
import { cn } from "@/utilitaires/cn";
import type {
  AnneeAcademique,
  Domaine,
  Faculte,
  Promotion,
} from "@/types/base";

type Onglet = "annees" | "facultes" | "domaines" | "promotions";

export function GestionAcademique({
  annees,
  facultes,
  domaines,
  promotions,
}: {
  annees: AnneeAcademique[];
  facultes: Faculte[];
  domaines: Domaine[];
  promotions: Promotion[];
}) {
  const t = useTranslations();
  const [onglet, setOnglet] = useState<Onglet>("annees");

  const onglets: { cle: Onglet; libelle: string; icone: typeof CalendarDays; compte: number }[] = [
    { cle: "annees", libelle: t("academique.onglets.annees"), icone: CalendarDays, compte: annees.length },
    { cle: "facultes", libelle: t("academique.onglets.facultes"), icone: Network, compte: facultes.length },
    { cle: "domaines", libelle: t("academique.onglets.domaines"), icone: Layers, compte: domaines.length },
    { cle: "promotions", libelle: t("academique.onglets.promotions"), icone: GraduationCap, compte: promotions.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {onglets.map(({ cle, libelle, icone: Icone, compte }) => (
          <button
            key={cle}
            onClick={() => setOnglet(cle)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
              onglet === cle
                ? "degrade-brand border-0 text-white shadow-md shadow-brand-1/20"
                : "hover:bg-accent"
            )}
          >
            <Icone className="size-4" />
            {libelle}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs",
                onglet === cle ? "bg-white/20" : "bg-muted"
              )}
            >
              {compte}
            </span>
          </button>
        ))}
      </div>

      {onglet === "annees" && <TableauAnnees annees={annees} />}
      {onglet === "facultes" && <TableauFacultes facultes={facultes} />}
      {onglet === "domaines" && <TableauDomaines facultes={facultes} domaines={domaines} />}
      {onglet === "promotions" && (
        <TableauPromotions facultes={facultes} domaines={domaines} promotions={promotions} />
      )}
    </div>
  );
}

// --- Années ---------------------------------------------------

function TableauAnnees({ annees }: { annees: AnneeAcademique[] }) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState<AnneeAcademique | null>(null);

  function supprimer(a: AnneeAcademique) {
    if (!window.confirm(t("academique.confirmerSuppression", { nom: a.libelle }))) return;
    demarrer(async () => {
      const r = await supprimerAnnee(a.id);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("academique.supprime"));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={() => { setEdition(null); setOuvert(true); }} className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20">
          <Plus />
          {t("academique.nouvelleAnnee")}
        </Bouton>
      </div>
      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("academique.libelle")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("academique.periode")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("academique.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {annees.length === 0 && (
              <LigneVide colSpan={4}>{t("academique.anneesVides")}</LigneVide>
            )}
            {annees.map((a) => (
              <TableauLigne key={a.id}>
                <TableauCellule className="font-medium">{a.libelle}</TableauCellule>
                <TableauCellule className="text-muted-foreground">
                  {a.date_debut} → {a.date_fin}
                </TableauCellule>
                <TableauCellule>
                  {a.est_active ? (
                    <Insigne variante="parDefaut">{t("academique.active")}</Insigne>
                  ) : (
                    <button
                      onClick={() =>
                        demarrer(async () => {
                          const r = await activerAnnee(a.id);
                          if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                          toasts.succes(t("toasts.succes"), t("academique.anneeActivee"));
                        })
                      }
                      disabled={enCours}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent"
                    >
                      <CheckCircle2 className="size-3.5" />
                      {t("academique.activer")}
                    </button>
                  )}
                </TableauCellule>
                <TableauCellule className="text-right">
                  <BoutonsLigne
                    onModifier={() => { setEdition(a); setOuvert(true); }}
                    onSupprimer={() => supprimer(a)}
                  />
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>

      {ouvert && (
        <Modale
          ouvert
          titre={edition ? t("academique.modifierAnnee") : t("academique.nouvelleAnnee")}
          onFermer={() => { setOuvert(false); setEdition(null); }}
        >
          <FormulaireAnnee
            annee={edition}
            enCours={enCours}
            onFermer={() => { setOuvert(false); setEdition(null); }}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = edition
                  ? await modifierAnnee({ id: edition.id, ...d })
                  : await creerAnnee(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("academique.enregistre"));
                setOuvert(false);
                setEdition(null);
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}

function FormulaireAnnee({
  annee,
  enCours,
  onFermer,
  onSoumettre,
}: {
  annee: AnneeAcademique | null;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: { libelle: string; date_debut: string; date_fin: string; est_active?: boolean }) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    libelle: annee?.libelle ?? "",
    date_debut: annee?.date_debut ?? "",
    date_fin: annee?.date_fin ?? "",
    est_active: annee?.est_active ?? false,
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSoumettre(etat); }} className="space-y-4">
      <Champ label={t("academique.libelle")} value={etat.libelle} onChange={(e) => setEtat({ ...etat, libelle: e.target.value })} placeholder="2026-2027" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("academique.dateDebut")} type="date" value={etat.date_debut} onChange={(e) => setEtat({ ...etat, date_debut: e.target.value })} required />
        <Champ label={t("academique.dateFin")} type="date" value={etat.date_fin} onChange={(e) => setEtat({ ...etat, date_fin: e.target.value })} required />
      </div>
      {!annee && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={etat.est_active} onChange={(e) => setEtat({ ...etat, est_active: e.target.checked })} />
          {t("academique.definirActive")}
        </label>
      )}
      <PiedFormulaire enCours={enCours} onFermer={onFermer} />
    </form>
  );
}

// --- Facultés -------------------------------------------------

function TableauFacultes({ facultes }: { facultes: Faculte[] }) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState<Faculte | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={() => { setEdition(null); setOuvert(true); }} className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20">
          <Plus />
          {t("academique.nouvelleFaculte")}
        </Bouton>
      </div>
      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("academique.code")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("academique.nom")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("academique.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {facultes.length === 0 && <LigneVide colSpan={4}>{t("academique.facultesVides")}</LigneVide>}
            {facultes.map((f) => (
              <TableauLigne key={f.id}>
                <TableauCellule className="font-mono text-xs">{f.code}</TableauCellule>
                <TableauCellule className="font-medium">{f.nom}</TableauCellule>
                <TableauCellule><StatutInsigne statut={f.statut} /></TableauCellule>
                <TableauCellule className="text-right">
                  <BoutonsLigne
                    onModifier={() => { setEdition(f); setOuvert(true); }}
                    onSupprimer={() => {
                      if (!window.confirm(t("academique.confirmerSuppression", { nom: f.nom }))) return;
                      demarrer(async () => {
                        const r = await supprimerFaculte(f.id);
                        if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                        toasts.succes(t("toasts.succes"), t("academique.supprime"));
                      });
                    }}
                  />
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>

      {ouvert && (
        <Modale ouvert titre={edition ? t("academique.modifierFaculte") : t("academique.nouvelleFaculte")} onFermer={() => { setOuvert(false); setEdition(null); }}>
          <FormulaireFaculte
            faculte={edition}
            enCours={enCours}
            onFermer={() => { setOuvert(false); setEdition(null); }}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = edition
                  ? await modifierFaculte({ id: edition.id, ...d, statut: edition.statut })
                  : await creerFaculte(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("academique.enregistre"));
                setOuvert(false);
                setEdition(null);
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}

function FormulaireFaculte({
  faculte,
  enCours,
  onFermer,
  onSoumettre,
}: {
  faculte: Faculte | null;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: { code: string; nom: string; description?: string; ordre?: number }) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    code: faculte?.code ?? "",
    nom: faculte?.nom ?? "",
    description: faculte?.description ?? "",
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSoumettre(etat); }} className="space-y-4">
      <Champ label={t("academique.code")} value={etat.code} onChange={(e) => setEtat({ ...etat, code: e.target.value.toUpperCase() })} required />
      <Champ label={t("academique.nom")} value={etat.nom} onChange={(e) => setEtat({ ...etat, nom: e.target.value })} required />
      <Champ label={t("academique.description")} value={etat.description} onChange={(e) => setEtat({ ...etat, description: e.target.value })} />
      <PiedFormulaire enCours={enCours} onFermer={onFermer} />
    </form>
  );
}

// --- Domaines -------------------------------------------------

function TableauDomaines({ facultes, domaines }: { facultes: Faculte[]; domaines: Domaine[] }) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState<Domaine | null>(null);

  const nomFaculte = useMemo(() => {
    const m = new Map<number, string>();
    for (const f of facultes) m.set(f.id, f.nom);
    return m;
  }, [facultes]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={() => { setEdition(null); setOuvert(true); }} className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20">
          <Plus />
          {t("academique.nouveauDomaine")}
        </Bouton>
      </div>
      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("academique.code")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("academique.nom")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("academique.faculte")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {domaines.length === 0 && <LigneVide colSpan={4}>{t("academique.domainesVides")}</LigneVide>}
            {domaines.map((d) => (
              <TableauLigne key={d.id}>
                <TableauCellule className="font-mono text-xs">{d.code}</TableauCellule>
                <TableauCellule className="font-medium">{d.nom}</TableauCellule>
                <TableauCellule className="text-muted-foreground">{nomFaculte.get(d.faculte_id) ?? "—"}</TableauCellule>
                <TableauCellule className="text-right">
                  <BoutonsLigne
                    onModifier={() => { setEdition(d); setOuvert(true); }}
                    onSupprimer={() => {
                      if (!window.confirm(t("academique.confirmerSuppression", { nom: d.nom }))) return;
                      demarrer(async () => {
                        const r = await supprimerDomaine(d.id);
                        if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                        toasts.succes(t("toasts.succes"), t("academique.supprime"));
                      });
                    }}
                  />
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>

      {ouvert && (
        <Modale ouvert titre={edition ? t("academique.modifierDomaine") : t("academique.nouveauDomaine")} onFermer={() => { setOuvert(false); setEdition(null); }}>
          <FormulaireDomaine
            domaine={edition}
            facultes={facultes}
            enCours={enCours}
            onFermer={() => { setOuvert(false); setEdition(null); }}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = edition
                  ? await modifierDomaine({ id: edition.id, ...d, statut: edition.statut })
                  : await creerDomaine(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("academique.enregistre"));
                setOuvert(false);
                setEdition(null);
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}

function FormulaireDomaine({
  domaine,
  facultes,
  enCours,
  onFermer,
  onSoumettre,
}: {
  domaine: Domaine | null;
  facultes: Faculte[];
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: { faculte_id: number; code: string; nom: string; description?: string }) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState({
    faculte_id: String(domaine?.faculte_id ?? facultes[0]?.id ?? ""),
    code: domaine?.code ?? "",
    nom: domaine?.nom ?? "",
    description: domaine?.description ?? "",
  });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSoumettre({ ...etat, faculte_id: Number(etat.faculte_id) }); }} className="space-y-4">
      <ChampSelecteur label={t("academique.faculte")} className="w-full" value={etat.faculte_id} onChange={(e) => setEtat({ ...etat, faculte_id: e.target.value })} required>
        {facultes.map((f) => (
          <option key={f.id} value={f.id}>{f.nom}</option>
        ))}
      </ChampSelecteur>
      <Champ label={t("academique.code")} value={etat.code} onChange={(e) => setEtat({ ...etat, code: e.target.value.toUpperCase() })} required />
      <Champ label={t("academique.nom")} value={etat.nom} onChange={(e) => setEtat({ ...etat, nom: e.target.value })} required />
      <Champ label={t("academique.description")} value={etat.description} onChange={(e) => setEtat({ ...etat, description: e.target.value })} />
      <PiedFormulaire enCours={enCours} onFermer={onFermer} />
    </form>
  );
}

// --- Promotions -----------------------------------------------

function TableauPromotions({
  facultes,
  domaines,
  promotions,
}: {
  facultes: Faculte[];
  domaines: Domaine[];
  promotions: Promotion[];
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState<Promotion | null>(null);

  const nomDomaine = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of domaines) m.set(d.id, d.nom);
    return m;
  }, [domaines]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Bouton onClick={() => { setEdition(null); setOuvert(true); }} className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20">
          <Plus />
          {t("academique.nouvellePromotion")}
        </Bouton>
      </div>
      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("academique.nom")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("academique.niveau")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("academique.domaine")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {promotions.length === 0 && <LigneVide colSpan={4}>{t("academique.promotionsVides")}</LigneVide>}
            {promotions.map((p) => (
              <TableauLigne key={p.id}>
                <TableauCellule className="font-medium">{p.nom}</TableauCellule>
                <TableauCellule className="text-muted-foreground">{p.niveau ?? "—"}</TableauCellule>
                <TableauCellule className="text-muted-foreground">{nomDomaine.get(p.domaine_id) ?? "—"}</TableauCellule>
                <TableauCellule className="text-right">
                  <BoutonsLigne
                    onModifier={() => { setEdition(p); setOuvert(true); }}
                    onSupprimer={() => {
                      if (!window.confirm(t("academique.confirmerSuppression", { nom: p.nom }))) return;
                      demarrer(async () => {
                        const r = await supprimerPromotion(p.id);
                        if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                        toasts.succes(t("toasts.succes"), t("academique.supprime"));
                      });
                    }}
                  />
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>

      {ouvert && (
        <Modale ouvert titre={edition ? t("academique.modifierPromotion") : t("academique.nouvellePromotion")} onFermer={() => { setOuvert(false); setEdition(null); }}>
          <FormulairePromotion
            promotion={edition}
            facultes={facultes}
            domaines={domaines}
            enCours={enCours}
            onFermer={() => { setOuvert(false); setEdition(null); }}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = edition
                  ? await modifierPromotion({ id: edition.id, ...d, statut: edition.statut })
                  : await creerPromotion(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("academique.enregistre"));
                setOuvert(false);
                setEdition(null);
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}

function FormulairePromotion({
  promotion,
  facultes,
  domaines,
  enCours,
  onFermer,
  onSoumettre,
}: {
  promotion: Promotion | null;
  facultes: Faculte[];
  domaines: Domaine[];
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: { faculte_id: number; domaine_id: number; code?: string; nom: string; niveau?: string }) => void;
}) {
  const t = useTranslations();
  const [faculteId, setFaculteId] = useState(String(promotion?.faculte_id ?? facultes[0]?.id ?? ""));
  const domainesFiltres = useMemo(
    () => domaines.filter((d) => String(d.faculte_id) === faculteId),
    [domaines, faculteId]
  );
  const [etat, setEtat] = useState({
    domaine_id: String(promotion?.domaine_id ?? domainesFiltres[0]?.id ?? ""),
    nom: promotion?.nom ?? "",
    niveau: promotion?.niveau ?? "",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSoumettre({
          faculte_id: Number(faculteId),
          domaine_id: Number(etat.domaine_id),
          nom: etat.nom,
          niveau: etat.niveau,
        });
      }}
      className="space-y-4"
    >
      <ChampSelecteur
        label={t("academique.faculte")}
        className="w-full"
        value={faculteId}
        onChange={(e) => {
          setFaculteId(e.target.value);
          const premier = domaines.find((d) => String(d.faculte_id) === e.target.value);
          setEtat((s) => ({ ...s, domaine_id: String(premier?.id ?? "") }));
        }}
        required
      >
        {facultes.map((f) => (
          <option key={f.id} value={f.id}>{f.nom}</option>
        ))}
      </ChampSelecteur>
      <ChampSelecteur label={t("academique.domaine")} className="w-full" value={etat.domaine_id} onChange={(e) => setEtat({ ...etat, domaine_id: e.target.value })} required>
        {domainesFiltres.length === 0 && <option value="">{t("academique.aucunDomaine")}</option>}
        {domainesFiltres.map((d) => (
          <option key={d.id} value={d.id}>{d.nom}</option>
        ))}
      </ChampSelecteur>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("academique.nom")} value={etat.nom} onChange={(e) => setEtat({ ...etat, nom: e.target.value })} required />
        <Champ label={t("academique.niveau")} value={etat.niveau} onChange={(e) => setEtat({ ...etat, niveau: e.target.value })} placeholder="L1, L2…" />
      </div>
      <PiedFormulaire enCours={enCours} onFermer={onFermer} />
    </form>
  );
}

// --- Éléments partagés ----------------------------------------

function LigneVide({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <TableauLigne>
      <TableauCellule colSpan={colSpan} className="py-10 text-center text-muted-foreground">
        {children}
      </TableauCellule>
    </TableauLigne>
  );
}

function BoutonsLigne({ onModifier, onSupprimer }: { onModifier: () => void; onSupprimer: () => void }) {
  const t = useTranslations();
  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={onModifier} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4" aria-label={t("commun.modifier")}>
        <Pencil />
      </button>
      <button onClick={onSupprimer} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4" aria-label={t("commun.supprimer")}>
        <Trash2 />
      </button>
    </div>
  );
}

function StatutInsigne({ statut }: { statut: "ACTIVE" | "INACTIVE" | "ARCHIVEE" }) {
  const t = useTranslations();
  return (
    <Insigne variante={statut === "ACTIVE" ? "parDefaut" : "secondaire"}>
      {t(`academique.statuts.${statut}` as never)}
    </Insigne>
  );
}

function PiedFormulaire({ enCours, onFermer }: { enCours: boolean; onFermer: () => void }) {
  const t = useTranslations();
  return (
    <div className="flex justify-end gap-2 border-t pt-4">
      <Bouton type="button" variante="contour" onClick={onFermer}>
        {t("commun.annuler")}
      </Bouton>
      <Bouton type="submit" disabled={enCours}>
        {enCours && <LoaderCircle className="animate-spin" />}
        {t("commun.sauvegarder")}
      </Bouton>
    </div>
  );
}
