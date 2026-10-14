"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Search, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  inscrireEtudiantAuCours,
  retirerEtudiantDuCours,
} from "@/actions/inscriptions";
import { Modale } from "@/composants/partages/modale";
import { Bouton } from "@/composants/ui/bouton";
import { Saisie } from "@/composants/ui/saisie";
import { useToast } from "@/composants/ui/toaster";
import { useRouter } from "@/i18n/navigation";

import type { EtudiantDisponible, InscriptionNote } from "./espace-notes";

function normaliser(texte: string) {
  return texte.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function GestionEtudiantsCours({
  ouvert,
  onFermer,
  coursId,
  coursTitre,
  inscrits,
  disponibles,
}: {
  ouvert: boolean;
  onFermer: () => void;
  coursId: string;
  coursTitre: string;
  inscrits: InscriptionNote[];
  disponibles: EtudiantDisponible[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const toasts = useToast();

  const [requete, setRequete] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [ajoutes, setAjoutes] = useState<Record<string, true>>({});
  const [retires, setRetires] = useState<Record<string, true>>({});

  const idsInscrits = useMemo(
    () => new Set(inscrits.map((i) => i.etudiantId)),
    [inscrits]
  );

  const inscritsAffiches = useMemo(
    () =>
      inscrits.filter(
        (i) => !retires[i.etudiantId] || ajoutes[i.etudiantId]
      ),
    [inscrits, retires, ajoutes]
  );

  const candidats = useMemo(() => {
    const q = normaliser(requete.trim());
    return disponibles.filter((e) => {
      const dejaInscrit = idsInscrits.has(e.id) && !retires[e.id];
      if (dejaInscrit && !ajoutes[e.id]) return false;
      if (!q) return !dejaInscrit || Boolean(ajoutes[e.id]);
      const cible = normaliser(
        [e.prenom, e.nom, e.matricule ?? ""].join(" ")
      );
      return cible.includes(q) && (!dejaInscrit || Boolean(ajoutes[e.id]));
    });
  }, [disponibles, idsInscrits, requete, retires, ajoutes]);

  async function ajouter(etudiant: EtudiantDisponible) {
    setEnCours(etudiant.id);
    const { erreur } = await inscrireEtudiantAuCours({
      coursId,
      etudiantId: etudiant.id,
    });
    setEnCours(null);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), erreur);
      return;
    }
    setAjoutes((p) => ({ ...p, [etudiant.id]: true }));
    setRetires((p) => {
      const copie = { ...p };
      delete copie[etudiant.id];
      return copie;
    });
    router.refresh();
    toasts.succes(t("notes.etudiantAjoute"));
  }

  async function retirer(inscription: InscriptionNote) {
    setEnCours(inscription.etudiantId);
    const { erreur } = await retirerEtudiantDuCours({
      coursId,
      etudiantId: inscription.etudiantId,
    });
    setEnCours(null);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), erreur);
      return;
    }
    setRetires((p) => ({ ...p, [inscription.etudiantId]: true }));
    setAjoutes((p) => {
      const copie = { ...p };
      delete copie[inscription.etudiantId];
      return copie;
    });
    router.refresh();
    toasts.succes(t("notes.etudiantRetire"));
  }

  return (
    <Modale
      ouvert={ouvert}
      titre={t("notes.gererEtudiants")}
      sousTitre={coursTitre}
      onFermer={onFermer}
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("notes.etudiantsInscrits", { nombre: inscritsAffiches.length })}
          </p>
          {inscritsAffiches.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {t("notes.aucunEtudiant")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {inscritsAffiches.map((etudiant) => (
                <li
                  key={etudiant.etudiantId}
                  className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {etudiant.prenom} {etudiant.nom}
                    </span>
                    {etudiant.matricule && (
                      <span className="block font-mono text-xs text-muted-foreground">
                        {etudiant.matricule}
                      </span>
                    )}
                  </span>
                  <Bouton
                    type="button"
                    variante="fantome"
                    taille="sm"
                    disabled={enCours === etudiant.etudiantId}
                    onClick={() => retirer(etudiant)}
                    aria-label={t("notes.retirer")}
                  >
                    <UserMinus className="size-3.5" />
                    {t("notes.retirer")}
                  </Bouton>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t pt-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("notes.ajouterEtudiant")}
          </p>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Saisie
              value={requete}
              onChange={(e) => setRequete(e.target.value)}
              placeholder={t("notes.rechercherEtudiant")}
              className="pl-9"
              aria-label={t("notes.rechercherEtudiant")}
            />
          </div>
          {candidats.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              {t("notes.aucunEtudiantDisponible")}
            </p>
          ) : (
            <ul className="max-h-60 space-y-1.5 overflow-y-auto">
              {candidats.map((etudiant) => {
                const deja = idsInscrits.has(etudiant.id) && !retires[etudiant.id];
                return (
                  <li
                    key={etudiant.id}
                    className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {etudiant.prenom} {etudiant.nom}
                      </span>
                      {etudiant.matricule && (
                        <span className="block font-mono text-xs text-muted-foreground">
                          {etudiant.matricule}
                        </span>
                      )}
                    </span>
                    <Bouton
                      type="button"
                      variante={deja ? "contour" : "secondaire"}
                      taille="sm"
                      disabled={enCours === etudiant.id || deja}
                      onClick={() => ajouter(etudiant)}
                    >
                      {deja ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      {deja ? t("notes.inscrit") : t("notes.ajouter")}
                    </Bouton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modale>
  );
}
