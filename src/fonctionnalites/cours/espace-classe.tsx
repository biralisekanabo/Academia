"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Lock,
  MessageSquare,
  RefreshCw,
  Send,
  Trash2,
  Unlock,
  Upload,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import {
  ajouterSupport,
  basculerInscriptionOuverte,
  publierMessage,
  regenererJetonCours,
  supprimerMessage,
  supprimerSupport,
} from "@/actions/apprentissage";
import { InvitationApp } from "@/composants/partages/invitation-app";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Insigne } from "@/composants/ui/insigne";
import { Saisie } from "@/composants/ui/saisie";
import {
  Tableau,
  TableauCellule,
  TableauCorps,
  TableauEntete,
  TableauEnteteCellule,
  TableauLigne,
} from "@/composants/ui/tableau";
import { useToast } from "@/composants/ui/toaster";
import { ZoneTexte } from "@/composants/ui/zone-texte";
import { useRouter as useNavigation } from "@/i18n/navigation";
import type { TypeEvaluation, TypeRole } from "@/types/database";
import { cn } from "@/utilitaires/cn";
import { formatDateLongue } from "@/utilitaires/format";

export type SupportClasse = {
  id: string;
  titre: string;
  typeSupport: string;
  url: string | null;
  description: string | null;
  creeLe: string;
};

export type MessageClasse = {
  id: string;
  contenu: string;
  creeLe: string;
  auteur: string | null;
};

export type NoteClasse = {
  evaluationId: string;
  titre: string;
  type: TypeEvaluation;
  coefficient: number;
  bareme: number;
  dateEcheance: string | null;
  valeur: number | null;
  appreciation: string | null;
};

export type CoursClasse = {
  id: string;
  code: string;
  titre: string;
  description: string | null;
  credits: number;
  semestre: number;
  jeton: string;
  inscriptionOuverte: boolean;
  enseignantNom: string | null;
};

const TYPES_SUPPORT = ["document", "video", "exercice", "lien"] as const;
const ACCEPTES =
  ".pdf,.txt,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.mp4";

export function EspaceClasse({
  role,
  peutGerer,
  cours,
  supports,
  messages,
  notes,
  effectif,
  nombreEvaluations,
}: {
  role: TypeRole;
  peutGerer: boolean;
  cours: CoursClasse;
  supports: SupportClasse[];
  messages: MessageClasse[];
  notes: NoteClasse[];
  effectif: number;
  nombreEvaluations: number;
}) {
  const t = useTranslations();
  const router2 = useNavigation();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Bouton
          type="button"
          variante="fantome"
          taille="sm"
          className="w-fit"
          onClick={() => router2.push("/apprentissage")}
        >
          <ArrowLeft />
          {t("classe.retour")}
        </Bouton>

        <div className="carte-vitrine animate-entree flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Insigne variante="secondaire" className="font-mono text-[11px]">
              {cours.code}
            </Insigne>
            <Insigne variante="contour" className="text-[11px]">
              {t("cours.creditsCourt", { valeur: cours.credits })}
            </Insigne>
            <Insigne variante="contour" className="text-[11px]">
              {t("cours.semestreNumero", { numero: cours.semestre })}
            </Insigne>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{cours.titre}</h1>
          {cours.description && (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {cours.description}
            </p>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>
              {t("cours.enseignant")} : {cours.enseignantNom ?? t("cours.sansEnseignant")}
            </span>
            {peutGerer && (
              <span>{t("classe.effectif", { nombre: effectif })}</span>
            )}
          </div>
        </div>
      </div>

      <InvitationApp />

      {peutGerer && (
        <CartePartage cours={cours} />
      )}

      <SectionSupports peutGerer={peutGerer} cours={cours} supports={supports} />
      <SectionMessages peutGerer={peutGerer} cours={cours} messages={messages} />

      {role === "etudiant" && (
        <SectionNotes notes={notes} />
      )}

      {peutGerer && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            {t("classe.lienVersNotes", { nombre: nombreEvaluations })}
          </p>
          <Bouton variante="contour" taille="sm" onClick={() => router2.push("/notes")}>
            {t("navigation.notes")}
          </Bouton>
        </section>
      )}
    </div>
  );
}

function CartePartage({ cours }: { cours: CoursClasse }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const toasts = useToast();
  const [copie, setCopie] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [ouverte, setOuverte] = useState(cours.inscriptionOuverte);
  const chemin =
    `${locale === "fr" ? "" : `/${locale}`}/rejoindre/${cours.jeton}`;

  async function copier() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${chemin}`);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1800);
      toasts.succes(t("annonces.lienCopie"));
    } catch {
      toasts.erreur(t("toasts.erreur"), t("annonces.erreurCopie"));
    }
  }

  async function basculer() {
    setEnCours(true);
    const prochaine = !ouverte;
    const { erreur } = await basculerInscriptionOuverte(cours.id, prochaine);
    setEnCours(false);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), t(erreur as never));
      return;
    }
    setOuverte(prochaine);
    router.refresh();
    toasts.succes(t(prochaine ? "classe.inscriptionsOuvertes" : "classe.inscriptionsFermees"));
  }

  async function regenerer() {
    setEnCours(true);
    const { erreur } = await regenererJetonCours(cours.id);
    setEnCours(false);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), t(erreur as never));
      return;
    }
    toasts.succes(t("classe.jetonRegenere"));
    router.refresh();
  }

  return (
    <section className="carte-vitrine space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-1/10 text-brand-2">
          <Link2 className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">{t("classe.partageTitre")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("classe.partageAide")}
          </p>
        </div>
      </div>

      <p className="break-all rounded-xl border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
        {chemin}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Bouton type="button" onClick={() => void copier()}>
          {copie ? <Check /> : <Clipboard />}
          {copie ? t("annonces.lienCopie") : t("annonces.copierLien")}
        </Bouton>
        <Bouton
          type="button"
          variante="contour"
          disabled={enCours}
          onClick={() => void basculer()}
        >
          {ouverte ? <Unlock /> : <Lock />}
          {ouverte ? t("classe.fermerInscriptions") : t("classe.ouvrirInscriptions")}
        </Bouton>
        <Bouton
          type="button"
          variante="contour"
          disabled={enCours}
          onClick={() => void regenerer()}
        >
          <RefreshCw />
          {t("classe.regenerer")}
        </Bouton>
      </div>

      <p
        className={cn(
          "text-xs font-medium",
          ouverte ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
        )}
      >
        {ouverte ? t("classe.inscriptionOuverteAide") : t("classe.inscriptionFermeeAide")}
      </p>
    </section>
  );
}

function SectionSupports({
  peutGerer,
  cours,
  supports,
}: {
  peutGerer: boolean;
  cours: CoursClasse;
  supports: SupportClasse[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const toasts = useToast();
  const [enCours, setEnCours] = useState(false);
  const [type, setType] = useState<(typeof TYPES_SUPPORT)[number]>("document");

  async function ajouter(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const formulaire = new FormData(evenement.currentTarget);
    const element = evenement.currentTarget;
    setEnCours(true);
    const { erreur } = await ajouterSupport(formulaire);
    setEnCours(false);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), t(erreur as never));
      return;
    }
    element.reset();
    setType("document");
    router.refresh();
    toasts.succes(t("classe.supportAjoute"));
  }

  async function retirer(id: string) {
    setEnCours(true);
    const { erreur } = await supprimerSupport(id);
    setEnCours(false);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), t(erreur as never));
      return;
    }
    router.refresh();
    toasts.succes(t("classe.supportSupprime"));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-brand-2" />
        <h2 className="text-base font-semibold">{t("classe.supports")}</h2>
        <Insigne variante="secondaire">{supports.length}</Insigne>
      </div>

      {peutGerer && (
        <form
          onSubmit={ajouter}
          className="carte-vitrine space-y-4 rounded-2xl border bg-card p-5 shadow-sm"
        >
          <input type="hidden" name="coursId" value={cours.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Etiquette htmlFor="support-titre">{t("classe.supportTitre")}</Etiquette>
              <Saisie id="support-titre" name="titre" required minLength={2} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Etiquette htmlFor="support-type">{t("classe.supportType")}</Etiquette>
              <select
                id="support-type"
                name="typeSupport"
                value={type}
                onChange={(e) => setType(e.target.value as (typeof TYPES_SUPPORT)[number])}
                className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              >
                {TYPES_SUPPORT.map((cle) => (
                  <option key={cle} value={cle}>
                    {t(`classe.types.${cle}` as never)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Etiquette htmlFor="support-description">
              {t("cours.description")}{" "}
              <span className="font-normal text-muted-foreground">({t("finances.optionnel")})</span>
            </Etiquette>
            <ZoneTexte id="support-description" name="description" rows={2} maxLength={2000} />
          </div>
          {type === "lien" ? (
            <div className="space-y-2">
              <Etiquette htmlFor="support-lien">{t("classe.supportLien")}</Etiquette>
              <Saisie id="support-lien" name="lien" type="url" placeholder="https://…" />
            </div>
          ) : (
            <div className="space-y-2">
              <Etiquette htmlFor="support-fichier">{t("classe.supportFichier")}</Etiquette>
              <Saisie
                id="support-fichier"
                name="fichier"
                type="file"
                accept={ACCEPTES}
                className="h-auto py-2"
              />
              <p className="text-xs text-muted-foreground">{t("classe.supportFichierAide")}</p>
            </div>
          )}
          <Bouton type="submit" disabled={enCours}>
            <Upload />
            {enCours ? t("commun.chargement") : t("classe.ajouterSupport")}
          </Bouton>
        </form>
      )}

      {supports.length === 0 ? (
        <p className="rounded-2xl border bg-card py-8 text-center text-sm text-muted-foreground shadow-sm">
          {t("classe.aucunSupport")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {supports.map((support) => (
            <article
              key={support.id}
              className="carte-vitrine flex items-start justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Insigne variante="secondaire" className="text-[10px]">
                    {t(`classe.types.${support.typeSupport}` as never)}
                  </Insigne>
                  <time className="text-[11px] text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                      new Date(support.creeLe)
                    )}
                  </time>
                </div>
                <h3 className="truncate font-medium">{support.titre}</h3>
                {support.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {support.description}
                  </p>
                )}
                {support.url ? (
                  <a
                    href={support.url}
                    target="_blank"
                    rel="noreferrer"
                    className="lien-anime mt-2 inline-flex items-center gap-1.5 text-xs font-medium"
                  >
                    {support.url.startsWith("http") ? (
                      <ExternalLink className="size-3.5" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    {t("classe.ouvrir")}
                  </a>
                ) : (
                  <span className="mt-2 inline-block text-xs text-muted-foreground">
                    {t("classe.indisponible")}
                  </span>
                )}
              </div>
              {peutGerer && (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => void retirer(support.id)}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t("commun.supprimer")}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SectionMessages({
  peutGerer,
  cours,
  messages,
}: {
  peutGerer: boolean;
  cours: CoursClasse;
  messages: MessageClasse[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const toasts = useToast();
  const [contenu, setContenu] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function publier(evenement: React.FormEvent) {
    evenement.preventDefault();
    if (!contenu.trim()) return;
    setEnCours(true);
    const { erreur } = await publierMessage({ coursId: cours.id, contenu });
    setEnCours(false);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), t(erreur as never));
      return;
    }
    setContenu("");
    router.refresh();
    toasts.succes(t("classe.messagePublie"));
  }

  async function retirer(id: string) {
    setEnCours(true);
    const { erreur } = await supprimerMessage(id);
    setEnCours(false);
    if (erreur) {
      toasts.erreur(t("toasts.erreur"), t(erreur as never));
      return;
    }
    router.refresh();
    toasts.succes(t("classe.messageSupprime"));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-brand-2" />
        <h2 className="text-base font-semibold">{t("classe.messagerie")}</h2>
        <Insigne variante="secondaire">{messages.length}</Insigne>
      </div>

      {peutGerer && (
        <form
          onSubmit={publier}
          className="carte-vitrine space-y-3 rounded-2xl border bg-card p-5 shadow-sm"
        >
          <Etiquette htmlFor="message-classe">{t("classe.nouveauMessage")}</Etiquette>
          <ZoneTexte
            id="message-classe"
            rows={3}
            maxLength={8000}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder={t("classe.messagePlaceholder")}
          />
          <Bouton type="submit" disabled={enCours || !contenu.trim()}>
            <Send />
            {enCours ? t("commun.chargement") : t("classe.publier")}
          </Bouton>
        </form>
      )}

      {messages.length === 0 ? (
        <p className="rounded-2xl border bg-card py-8 text-center text-sm text-muted-foreground shadow-sm">
          {t("classe.aucunMessage")}
        </p>
      ) : (
        <div className="space-y-3">
          {messages.map((message) => (
            <article
              key={message.id}
              className="carte-vitrine flex items-start justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="mb-1 text-xs text-muted-foreground">
                  {message.auteur ?? t("cours.enseignant")} ·{" "}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(message.creeLe))}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.contenu}</p>
              </div>
              {peutGerer && (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => void retirer(message.id)}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t("commun.supprimer")}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SectionNotes({ notes }: { notes: NoteClasse[] }) {
  const t = useTranslations();
  const locale = useLocale();

  const evaluees = notes.filter((note) => note.valeur !== null);
  let moyenne = 0;
  if (evaluees.length > 0) {
    const somme = evaluees.reduce(
      (acc, note) => acc + (note.valeur! / note.bareme) * 20 * note.coefficient,
      0
    );
    const coeffs = evaluees.reduce((acc, note) => acc + note.coefficient, 0);
    moyenne = coeffs > 0 ? somme / coeffs : 0;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-brand-2" />
        <h2 className="text-base font-semibold">{t("notes.titre")}</h2>
      </div>

      {notes.length === 0 ? (
        <p className="rounded-2xl border bg-card py-8 text-center text-sm text-muted-foreground shadow-sm">
          {t("classe.aucuneEvaluation")}
        </p>
      ) : (
        <div className="carte-vitrine overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Tableau>
            <TableauEntete>
              <tr className="bg-muted/40">
                <TableauEnteteCellule>{t("notes.evaluation")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("notes.type")}</TableauEnteteCellule>
                <TableauEnteteCellule>{t("notes.dateEcheance")}</TableauEnteteCellule>
                <TableauEnteteCellule className="text-right">{t("notes.note")}</TableauEnteteCellule>
              </tr>
            </TableauEntete>
            <TableauCorps>
              {notes.map((note) => (
                <TableauLigne key={note.evaluationId}>
                  <TableauCellule className="font-medium">{note.titre}</TableauCellule>
                  <TableauCellule>
                    <Insigne variante="secondaire">
                      {t(`notes.types.${note.type}` as never)}
                    </Insigne>
                  </TableauCellule>
                  <TableauCellule className="text-muted-foreground">
                    {formatDateLongue(note.dateEcheance, locale)}
                  </TableauCellule>
                  <TableauCellule className="text-right font-semibold tabular-nums">
                    {note.valeur === null ? t("notes.appreciationAuto") : `${note.valeur}/${note.bareme}`}
                  </TableauCellule>
                </TableauLigne>
              ))}
            </TableauCorps>
          </Tableau>
        </div>
      )}

      {evaluees.length > 0 && (
        <div className="flex justify-end">
          <Insigne
            variante="contour"
            className={cn(
              "text-sm",
              moyenne >= 10
                ? "border-emerald-600/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-rose-600/25 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {t("notes.moyenne")} : {moyenne.toFixed(2)}/20
          </Insigne>
        </div>
      )}
    </section>
  );
}
