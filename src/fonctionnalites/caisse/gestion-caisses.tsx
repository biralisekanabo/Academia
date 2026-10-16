"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, LogIn, Receipt, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  cloturerSession,
  creerCaisse,
  modifierCaisse,
  ouvrirSession,
  supprimerCaisse,
  suspendreCaisse,
} from "@/actions/caisses";
import { annulerMouvement, creerMouvement } from "@/actions/mouvements";
import { annulerPaiement, enregistrerPaiement } from "@/actions/paiements";
import { Modale } from "@/composants/partages/modale";
import { useToast } from "@/composants/ui/toaster";
import { cn } from "@/utilitaires/cn";
import type {
  Caisse,
  Devise,
  Dette,
  Etudiant,
  FraisAcademique,
  MouvementCaisse,
  Paiement,
  SessionCaisse,
} from "@/types/base";
import {
  FormulaireCaisse,
  FormulaireCloture,
  FormulaireMouvement,
  FormulaireOuverture,
  FormulairePaiement,
  type UtilisateurLite,
} from "@/fonctionnalites/caisse/formulaires-caisse";
import {
  OngletCaisses,
  OngletMouvements,
  OngletPaiements,
  OngletSessions,
} from "@/fonctionnalites/caisse/onglets-caisse";

type Onglet = "caisses" | "sessions" | "mouvements" | "paiements";

export function GestionCaisse({
  caisses,
  devises,
  utilisateurs,
  sessions,
  mouvements,
  paiements,
  dettes,
  etudiants,
  frais,
}: {
  caisses: Caisse[];
  devises: Devise[];
  utilisateurs: UtilisateurLite[];
  sessions: SessionCaisse[];
  mouvements: MouvementCaisse[];
  paiements: Paiement[];
  dettes: Dette[];
  etudiants: Etudiant[];
  frais: FraisAcademique[];
}) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [onglet, setOnglet] = useState<Onglet>("caisses");
  const [formCaisse, setFormCaisse] = useState<Caisse | null | undefined>(undefined);
  const [formSession, setFormSession] = useState<Caisse | null | undefined>(undefined);
  const [formCloture, setFormCloture] = useState<SessionCaisse | null | undefined>(undefined);
  const [formMouvement, setFormMouvement] = useState(false);
  const [formPaiement, setFormPaiement] = useState(false);

  const codes = useMemo(() => new Map(devises.map((d) => [d.id, d.code])), [devises]);
  const nomsCaisses = useMemo(() => new Map(caisses.map((c) => [c.id, c.nom])), [caisses]);
  const nomsEtudiants = useMemo(
    () => new Map(etudiants.map((e) => [e.id, `${e.nom} ${e.prenom}`])),
    [etudiants]
  );
  const matricules = useMemo(() => new Map(etudiants.map((e) => [e.id, e.matricule])), [etudiants]);
  const libellesFrais = useMemo(() => new Map(frais.map((f) => [f.id, f.libelle])), [frais]);

  const sessionsOuvertes = sessions.filter((s) => s.statut === "OUVERTE");
  const caissesOuvertes = sessionsOuvertes
    .map((s) => caisses.find((c) => c.id === s.caisse_id))
    .filter((c): c is Caisse => Boolean(c));

  const dettesOuvertes = dettes.filter(
    (d) => d.statut !== "PAYEE" && d.statut !== "ANNULEE" && Number(d.solde) > 0
  );
  const peutEncaisser = sessionsOuvertes.length > 0 && dettesOuvertes.length > 0;

  const onglets: { cle: Onglet; libelle: string; icone: typeof Wallet }[] = [
    { cle: "caisses", libelle: t("caisse.onglets.caisses"), icone: Wallet },
    { cle: "sessions", libelle: t("caisse.onglets.sessions"), icone: LogIn },
    { cle: "mouvements", libelle: t("caisse.onglets.mouvements"), icone: ArrowRightLeft },
    { cle: "paiements", libelle: t("caisse.onglets.paiements"), icone: Receipt },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {onglets.map(({ cle, libelle, icone: Icone }) => (
          <button
            key={cle}
            onClick={() => setOnglet(cle)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              onglet === cle
                ? "degrade-brand border-0 text-white shadow-md shadow-brand-1/25"
                : "hover:bg-accent"
            )}
          >
            <Icone className="size-4" />
            {libelle}
          </button>
        ))}
      </div>

      {onglet === "caisses" && (
        <OngletCaisses
          caisses={caisses}
          codes={codes}
          enCours={enCours}
          surNouvelle={() => setFormCaisse(null)}
          surModifier={(c) => setFormCaisse(c)}
          surOuvrirSession={(c) => setFormSession(c)}
          surSuspendre={(c) =>
            demarrer(async () => {
              const r = await suspendreCaisse(c.id);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("caisse.statutMaj"));
            })
          }
          surSupprimer={(c) => {
            if (!window.confirm(t("caisse.confirmerSuppression", { nom: c.nom }))) return;
            demarrer(async () => {
              const r = await supprimerCaisse(c.id);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("caisse.supprimee"));
            });
          }}
        />
      )}

      {onglet === "sessions" && (
        <OngletSessions
          sessions={sessions}
          nomsCaisses={nomsCaisses}
          enCours={enCours}
          surCloturer={(s) => setFormCloture(s)}
        />
      )}

      {onglet === "mouvements" && (
        <OngletMouvements
          mouvements={mouvements}
          codes={codes}
          enCours={enCours}
          surNouveau={() => setFormMouvement(true)}
          surAnnuler={(m) => {
            if (!window.confirm(t("caisse.confirmerAnnulation"))) return;
            demarrer(async () => {
              const r = await annulerMouvement(m.id);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("caisse.mouvementAnnule"));
            });
          }}
        />
      )}

      {onglet === "paiements" && (
        <OngletPaiements
          paiements={paiements}
          codes={codes}
          nomsEtudiants={nomsEtudiants}
          matricules={matricules}
          enCours={enCours}
          pret={peutEncaisser}
          surNouveau={() => setFormPaiement(true)}
          surAnnuler={(p) => {
            if (!window.confirm(t("caisse.confirmerAnnulation"))) return;
            demarrer(async () => {
              const r = await annulerPaiement(p.id);
              if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
              toasts.succes(t("toasts.succes"), t("caisse.paiementAnnule"));
            });
          }}
        />
      )}

      {/* --- Modales ------------------------------------------------ */}

      {formCaisse !== undefined && (
        <Modale
          ouvert
          titre={formCaisse ? t("caisse.modifierCaisse") : t("caisse.nouvelleCaisse")}
          onFermer={() => setFormCaisse(undefined)}
        >
          <FormulaireCaisse
            caisse={formCaisse}
            devises={devises}
            utilisateurs={utilisateurs}
            enCours={enCours}
            onFermer={() => setFormCaisse(undefined)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = formCaisse
                  ? await modifierCaisse({ id: formCaisse.id, ...d })
                  : await creerCaisse(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("caisse.enregistree"));
                setFormCaisse(undefined);
              })
            }
          />
        </Modale>
      )}

      {formSession !== undefined && formSession !== null && (
        <Modale
          ouvert
          titre={t("caisse.ouvrirSession")}
          sousTitre={formSession.nom}
          onFermer={() => setFormSession(undefined)}
        >
          <FormulaireOuverture
            enCours={enCours}
            onFermer={() => setFormSession(undefined)}
            onSoumettre={(fonds) =>
              demarrer(async () => {
                const r = await ouvrirSession({ caisse_id: formSession.id, fonds_initial: fonds });
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("caisse.sessionOuverte"));
                setFormSession(undefined);
              })
            }
          />
        </Modale>
      )}

      {formCloture !== undefined && formCloture !== null && (
        <Modale
          ouvert
          titre={t("caisse.cloturer")}
          sousTitre={nomsCaisses.get(formCloture.caisse_id)}
          onFermer={() => setFormCloture(undefined)}
        >
          <FormulaireCloture
            enCours={enCours}
            onFermer={() => setFormCloture(undefined)}
            onSoumettre={(montant, observations) =>
              demarrer(async () => {
                const r = await cloturerSession({
                  session_id: formCloture.id,
                  montant_compte: montant,
                  observations,
                });
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("caisse.sessionCloturee"));
                setFormCloture(undefined);
              })
            }
          />
        </Modale>
      )}

      {formMouvement && (
        <Modale ouvert titre={t("caisse.nouveauMouvement")} onFermer={() => setFormMouvement(false)}>
          <FormulaireMouvement
            caisses={caisses}
            devises={devises}
            enCours={enCours}
            onFermer={() => setFormMouvement(false)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = await creerMouvement(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("caisse.mouvementEnregistre"));
                setFormMouvement(false);
              })
            }
          />
        </Modale>
      )}

      {formPaiement && (
        <Modale ouvert titre={t("caisse.nouveauPaiement")} onFermer={() => setFormPaiement(false)}>
          <FormulairePaiement
            etudiants={etudiants}
            dettes={dettes}
            caisses={caissesOuvertes}
            libellesFrais={libellesFrais}
            codes={codes}
            enCours={enCours}
            onFermer={() => setFormPaiement(false)}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = await enregistrerPaiement(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("caisse.paiementEnregistre"));
                setFormPaiement(false);
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}
