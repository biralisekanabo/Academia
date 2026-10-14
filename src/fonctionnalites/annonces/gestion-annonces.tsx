"use client";

import { useState } from "react";
import {
  Check,
  Clipboard,
  FileText,
  Megaphone,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import {
  creerAnnonce,
  definirPublicationAnnonce,
  modifierAnnonce,
  supprimerAnnonce,
} from "@/actions/annonces";
import { Modale } from "@/composants/partages/modale";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { ZoneTexte } from "@/composants/ui/zone-texte";
import { useToast } from "@/composants/ui/toaster";
import { cn } from "@/utilitaires/cn";

export type FichierAnnonceVue = {
  id: string;
  nom: string;
  chemin: string;
  type_mime: string;
  taille_octets: number;
  url: string;
};

export type AnnonceAdmin = {
  id: string;
  titre: string;
  contenu: string;
  publiee: boolean;
  publiee_le: string | null;
  cree_le: string;
  fichiers: FichierAnnonceVue[];
};

const ACCEPTES = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx";
const OCTETS_MAX = 4 * 1024 * 1024;
const FICHIERS_MAX = 5;

function libelleTaille(octets: number) {
  return octets < 1024 * 1024
    ? `${Math.max(1, Math.round(octets / 1024))} Ko`
    : `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export function GestionAnnonces({
  annonces,
  locale,
}: {
  annonces: AnnonceAdmin[];
  locale: string;
}) {
  const t = useTranslations();
  const toasts = useToast();
  const router = useRouter();
  const [edition, setEdition] = useState<AnnonceAdmin | null>(null);
  const [suppression, setSuppression] = useState<AnnonceAdmin | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [copie, setCopie] = useState(false);

  function signalerEchecReseau() {
    toasts.erreur(t("toasts.erreur"), t("annonces.erreurInattendue"));
  }

  const cheminPublic =
    `${locale === "fr" ? "" : `/${locale}`}/annonces-publiques`;

  async function copierLien() {
    const lien = `${window.location.origin}${locale === "fr" ? "" : `/${locale}`}/annonces-publiques`;
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1800);
      toasts.succes(t("annonces.lienCopie"));
    } catch {
      toasts.erreur(t("toasts.erreur"), t("annonces.erreurCopie"));
    }
  }

  async function soumettre(
    evenement: React.FormEvent<HTMLFormElement>,
    action: typeof creerAnnonce | typeof modifierAnnonce
  ) {
    evenement.preventDefault();
    if (enCours) return;
    const elementFormulaire = evenement.currentTarget;
    const formulaire = new FormData(elementFormulaire);
    setEnCours(true);
    let resultat;
    try {
      resultat = await action(formulaire);
    } catch {
      signalerEchecReseau();
      return;
    } finally {
      setEnCours(false);
    }

    if (resultat.erreur) {
      toasts.erreur(t("toasts.erreur"), t(resultat.erreur as never));
      return;
    }

    setEdition(null);
    elementFormulaire.reset();
    toasts.succes(t(action === creerAnnonce ? "annonces.creationReussie" : "annonces.modificationReussie"));
    router.refresh();
  }

  async function basculerPublication(annonce: AnnonceAdmin) {
    if (enCours) return;
    setEnCours(true);
    let resultat;
    try {
      resultat = await definirPublicationAnnonce(annonce.id, !annonce.publiee);
    } catch {
      signalerEchecReseau();
      return;
    } finally {
      setEnCours(false);
    }
    if (resultat.erreur) {
      toasts.erreur(t("toasts.erreur"), t(resultat.erreur as never));
      return;
    }
    toasts.succes(
      t(annonce.publiee ? "annonces.brouillonReussi" : "annonces.publicationReussie")
    );
    router.refresh();
  }

  async function confirmerSuppression() {
    if (!suppression || enCours) return;
    setEnCours(true);
    let resultat;
    try {
      resultat = await supprimerAnnonce(suppression.id);
    } catch {
      signalerEchecReseau();
      return;
    } finally {
      setEnCours(false);
    }
    if (resultat.erreur) {
      toasts.erreur(t("toasts.erreur"), t(resultat.erreur as never));
      return;
    }
    setSuppression(null);
    toasts.succes(t("annonces.suppressionReussie"));
    router.refresh();
  }

  function verifierFichiers(input: HTMLInputElement) {
    const fichiers = Array.from(input.files ?? []);
    if (fichiers.length > FICHIERS_MAX || fichiers.some((fichier) => fichier.size > OCTETS_MAX)) {
      input.value = "";
      toasts.erreur(t("toasts.erreur"), t("annonces.aideFichiers"));
    }
  }

  return (
    <div className="space-y-6">
      <section className="carte-vitrine rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-1/10 text-brand-2">
              <Clipboard className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">{t("annonces.partagerTitre")}</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {t("annonces.partagerAide")}
              </p>
            </div>
          </div>
          <Bouton type="button" onClick={copierLien} className="shrink-0">
            {copie ? <Check /> : <Clipboard />}
            {copie ? t("annonces.lienCopie") : t("annonces.copierLien")}
          </Bouton>
        </div>
        <p className="mt-4 break-all rounded-xl border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
          {cheminPublic}
        </p>
      </section>

      <section className="carte-vitrine rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-1/10 text-brand-2">
            <Plus className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">{t("annonces.nouvelle")}</h2>
            <p className="text-sm text-muted-foreground">{t("annonces.aideNouvelle")}</p>
          </div>
        </div>
        <form
          onSubmit={(event) => void soumettre(event, creerAnnonce)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Etiquette htmlFor="annonce-nouveau-titre">{t("annonces.titre")}</Etiquette>
            <Saisie
              id="annonce-nouveau-titre"
              name="titre"
              required
              minLength={3}
              maxLength={160}
              placeholder={t("annonces.titrePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Etiquette htmlFor="annonce-nouveau-contenu">{t("annonces.contenu")}</Etiquette>
            <ZoneTexte
              id="annonce-nouveau-contenu"
              name="contenu"
              required
              minLength={3}
              maxLength={12000}
              rows={5}
              placeholder={t("annonces.contenuPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Etiquette htmlFor="annonce-nouveaux-fichiers">{t("annonces.fichiers")}</Etiquette>
            <Saisie
              id="annonce-nouveaux-fichiers"
              name="fichiers"
              type="file"
              accept={ACCEPTES}
              multiple
              className="h-auto py-2"
              onChange={(event) => verifierFichiers(event.currentTarget)}
            />
            <p className="text-xs text-muted-foreground">{t("annonces.aideFichiers")}</p>
          </div>
          <label className="flex w-fit items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="publiee"
              value="true"
              className="size-4 accent-primary"
            />
            {t("annonces.publierMaintenant")}
          </label>
          <Bouton type="submit" disabled={enCours} aria-busy={enCours}>
            <Send />
            {enCours ? t("annonces.enregistrement") : t("annonces.creer")}
          </Bouton>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("annonces.toutes")}</h2>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {annonces.length}
          </span>
        </div>
        {annonces.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed bg-card/60 px-6 py-12 text-center">
            <Megaphone className="mb-3 size-8 text-muted-foreground/70" />
            <p className="text-sm text-muted-foreground">{t("annonces.aucune")}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {annonces.map((annonce) => (
              <article
                key={annonce.id}
                className="carte-vitrine rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-semibold",
                          annonce.publiee
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        )}
                      >
                        {t(annonce.publiee ? "annonces.publiee" : "annonces.brouillon")}
                      </span>
                      <time className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(annonce.cree_le))}
                      </time>
                    </div>
                    <h3 className="text-lg font-semibold">{annonce.titre}</h3>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {annonce.contenu}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Bouton type="button" variante="contour" taille="sm" disabled={enCours} onClick={() => void basculerPublication(annonce)}>
                      <Send />
                      {t(annonce.publiee ? "annonces.retirer" : "annonces.publier")}
                    </Bouton>
                    <Bouton type="button" variante="fantome" taille="icone" aria-label={t("annonces.modifier")} title={t("annonces.modifier")} onClick={() => setEdition(annonce)}>
                      <Pencil />
                    </Bouton>
                    <Bouton type="button" variante="fantome" taille="icone" aria-label={t("annonces.supprimer")} title={t("annonces.supprimer")} className="hover:text-destructive" onClick={() => setSuppression(annonce)}>
                      <Trash2 />
                    </Bouton>
                  </div>
                </div>
                {annonce.fichiers.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                    {annonce.fichiers.map((fichier) => (
                      <a
                        key={fichier.id}
                        href={fichier.url}
                        target="_blank"
                        rel="noreferrer"
                        className="lien-anime inline-flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs font-medium"
                      >
                        <FileText className="size-4 text-brand-2" />
                        <span className="max-w-48 truncate">{fichier.nom}</span>
                        <span className="text-muted-foreground">{libelleTaille(fichier.taille_octets)}</span>
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <Modale
        ouvert={!!edition}
        titre={t("annonces.modifier")}
        sousTitre={edition?.titre}
        onFermer={() => !enCours && setEdition(null)}
      >
        {edition && (
          <form
            onSubmit={(event) => void soumettre(event, modifierAnnonce)}
            className="space-y-4"
          >
            <input type="hidden" name="id" value={edition.id} />
            <div className="space-y-2">
              <Etiquette htmlFor="annonce-edit-titre">{t("annonces.titre")}</Etiquette>
              <Saisie id="annonce-edit-titre" name="titre" required minLength={3} maxLength={160} defaultValue={edition.titre} />
            </div>
            <div className="space-y-2">
              <Etiquette htmlFor="annonce-edit-contenu">{t("annonces.contenu")}</Etiquette>
              <ZoneTexte id="annonce-edit-contenu" name="contenu" required minLength={3} maxLength={12000} rows={6} defaultValue={edition.contenu} />
            </div>
            <div className="space-y-2">
              <Etiquette htmlFor="annonce-edit-fichiers">{t("annonces.ajouterFichiers")}</Etiquette>
              <Saisie id="annonce-edit-fichiers" name="fichiers" type="file" accept={ACCEPTES} multiple className="h-auto py-2" onChange={(event) => verifierFichiers(event.currentTarget)} />
              <p className="text-xs text-muted-foreground">{t("annonces.aideFichiers")}</p>
            </div>
            {edition.fichiers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("annonces.fichiersDejaJoints", { nombre: edition.fichiers.length })}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Bouton type="button" variante="contour" disabled={enCours} onClick={() => setEdition(null)}>
                <X />
                {t("commun.annuler")}
              </Bouton>
              <Bouton type="submit" disabled={enCours} aria-busy={enCours}>
                {t(enCours ? "annonces.enregistrement" : "commun.sauvegarder")}
              </Bouton>
            </div>
          </form>
        )}
      </Modale>

      <Modale
        ouvert={!!suppression}
        titre={t("annonces.confirmerSuppression")}
        sousTitre={suppression?.titre}
        onFermer={() => !enCours && setSuppression(null)}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("annonces.aideSuppression")}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton type="button" variante="contour" disabled={enCours} onClick={() => setSuppression(null)}>
            {t("commun.annuler")}
          </Bouton>
          <Bouton type="button" variante="destructif" disabled={enCours} onClick={() => void confirmerSuppression()}>
            <Trash2 />
            {t("annonces.supprimer")}
          </Bouton>
        </div>
      </Modale>
    </div>
  );
}
