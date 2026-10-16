"use client";

import { useMemo, useState, useTransition } from "react";
import {
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  creerEtudiant,
  definirStatutEtudiant,
  modifierEtudiant,
  supprimerEtudiant,
  televerserPhotoEtudiant,
} from "@/actions/etudiants";
import { Modale } from "@/composants/partages/modale";
import { Bouton } from "@/composants/ui/bouton";
import { Champ, ChampSelecteur, ChampZoneTexte } from "@/composants/partages/champ-formulaire";
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
import type { Etudiant } from "@/types/base";

const TYPES_PIECE = ["CNI", "PASSEPORT", "PAROISSE", "AUTRE"];

export function GestionEtudiants({ etudiants }: { etudiants: Etudiant[] }) {
  const t = useTranslations();
  const toasts = useToast();
  const [enCours, demarrer] = useTransition();
  const [recherche, setRecherche] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [edition, setEdition] = useState<Etudiant | null>(null);

  const filtres = useMemo(() => {
    const q = recherche.toLowerCase().trim();
    if (!q) return etudiants;
    return etudiants.filter((e) =>
      [e.matricule, e.nom, e.postnom, e.prenom, e.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [etudiants, recherche]);

  function supprimer(e: Etudiant) {
    if (!window.confirm(t("etudiants.confirmerSuppression", { nom: `${e.nom} ${e.prenom}` }))) return;
    demarrer(async () => {
      const r = await supprimerEtudiant(e.id);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("etudiants.supprime"));
    });
  }

  function basculerStatut(e: Etudiant) {
    const prochain: Etudiant["statut"] = e.statut === "ACTIF" ? "INACTIF" : "ACTIF";
    demarrer(async () => {
      const r = await definirStatutEtudiant(e.id, prochain);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("etudiants.statutMaj"));
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={t("etudiants.recherche")}
          className="border-input focus-visible:ring-ring/50 h-9 w-full max-w-sm rounded-lg border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
        />
        <Bouton
          onClick={() => { setEdition(null); setOuvert(true); }}
          className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20"
        >
          <Plus />
          {t("etudiants.nouveau")}
        </Bouton>
      </div>

      <div className="carte-vitrine overflow-hidden rounded-3xl border bg-card shadow-sm">
        <Tableau>
          <TableauEntete>
            <TableauLigne>
              <TableauEnteteCellule>{t("etudiants.matricule")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("etudiants.nomComplet")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("etudiants.sexe")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("etudiants.telephone")}</TableauEnteteCellule>
              <TableauEnteteCellule>{t("etudiants.statut")}</TableauEnteteCellule>
              <TableauEnteteCellule className="text-right">{t("commun.actions")}</TableauEnteteCellule>
            </TableauLigne>
          </TableauEntete>
          <TableauCorps>
            {filtres.length === 0 && (
              <TableauLigne>
                <TableauCellule colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t("etudiants.vide")}
                </TableauCellule>
              </TableauLigne>
            )}
            {filtres.map((e) => (
              <TableauLigne key={e.id}>
                <TableauCellule className="font-mono text-xs">{e.matricule}</TableauCellule>
                <TableauCellule>
                  <span className="font-medium">
                    {e.nom} {e.postnom ?? ""} {e.prenom}
                  </span>
                  {e.email && <p className="text-xs text-muted-foreground">{e.email}</p>}
                </TableauCellule>
                <TableauCellule className="text-muted-foreground">{e.sexe}</TableauCellule>
                <TableauCellule className="text-muted-foreground">{e.telephone ?? "—"}</TableauCellule>
                <TableauCellule>
                  <button onClick={() => basculerStatut(e)} disabled={enCours}>
                    <Insigne variante={e.statut === "ACTIF" ? "parDefaut" : "secondaire"}>
                      {t(`etudiants.statuts.${e.statut}` as never)}
                    </Insigne>
                  </button>
                </TableauCellule>
                <TableauCellule className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEdition(e); setOuvert(true); }} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4" aria-label={t("commun.modifier")}>
                      <Pencil />
                    </button>
                    <button onClick={() => supprimer(e)} className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4" aria-label={t("commun.supprimer")}>
                      <Trash2 />
                    </button>
                  </div>
                </TableauCellule>
              </TableauLigne>
            ))}
          </TableauCorps>
        </Tableau>
      </div>

      {ouvert && (
        <Modale
          ouvert
          titre={edition ? t("etudiants.modifierTitre") : t("etudiants.nouveau")}
          onFermer={() => { setOuvert(false); setEdition(null); }}
        >
          <FormulaireEtudiant
            etudiant={edition}
            enCours={enCours}
            onFermer={() => { setOuvert(false); setEdition(null); }}
            onSoumettre={(d) =>
              demarrer(async () => {
                const r = edition
                  ? await modifierEtudiant({ ...d, id: edition.id })
                  : await creerEtudiant(d);
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("etudiants.enregistre"));
                setOuvert(false);
                setEdition(null);
              })
            }
            onPhoto={(id, fichier) =>
              demarrer(async () => {
                const base64 = await lireBase64(fichier);
                const r = await televerserPhotoEtudiant(id, { type: fichier.type, base64 });
                if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
                toasts.succes(t("toasts.succes"), t("etudiants.photoMaj"));
              })
            }
          />
        </Modale>
      )}
    </div>
  );
}

function lireBase64(fichier: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const resultat = String(lecteur.result);
      resolve(resultat.split(",")[1] ?? "");
    };
    lecteur.onerror = reject;
    lecteur.readAsDataURL(fichier);
  });
}

type DonneesForm = {
  matricule?: string;
  nom: string;
  postnom?: string;
  prenom: string;
  sexe: "M" | "F";
  date_naissance?: string;
  lieu_naissance?: string;
  nationalite?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  nom_pere?: string;
  nom_mere?: string;
  nom_tuteur?: string;
  telephone_tuteur?: string;
  contact_urgence?: string;
  type_piece?: string;
  numero_piece?: string;
  observations?: string;
};

function FormulaireEtudiant({
  etudiant,
  enCours,
  onFermer,
  onSoumettre,
  onPhoto,
}: {
  etudiant: Etudiant | null;
  enCours: boolean;
  onFermer: () => void;
  onSoumettre: (d: DonneesForm) => void;
  onPhoto: (id: number, fichier: File) => void;
}) {
  const t = useTranslations();
  const [etat, setEtat] = useState<DonneesForm>({
    matricule: etudiant?.matricule ?? "",
    nom: etudiant?.nom ?? "",
    postnom: etudiant?.postnom ?? "",
    prenom: etudiant?.prenom ?? "",
    sexe: etudiant?.sexe ?? "M",
    date_naissance: etudiant?.date_naissance ?? "",
    lieu_naissance: etudiant?.lieu_naissance ?? "",
    nationalite: etudiant?.nationalite ?? "Congolaise",
    adresse: etudiant?.adresse ?? "",
    telephone: etudiant?.telephone ?? "",
    email: etudiant?.email ?? "",
    nom_pere: etudiant?.nom_pere ?? "",
    nom_mere: etudiant?.nom_mere ?? "",
    nom_tuteur: etudiant?.nom_tuteur ?? "",
    telephone_tuteur: etudiant?.telephone_tuteur ?? "",
    contact_urgence: etudiant?.contact_urgence ?? "",
    type_piece: etudiant?.type_piece ?? "",
    numero_piece: etudiant?.numero_piece ?? "",
    observations: etudiant?.observations ?? "",
  });

  const maj = (champ: keyof DonneesForm, valeur: string) =>
    setEtat((s) => ({ ...s, [champ]: valeur } as DonneesForm));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSoumettre(etat); }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("etudiants.matricule")} value={etat.matricule} onChange={(e) => maj("matricule", e.target.value)} placeholder={t("etudiants.matriculeAide")} />
        <ChampSelecteur label={t("etudiants.sexe")} className="w-full" value={etat.sexe} onChange={(e) => maj("sexe", e.target.value)}>
          <option value="M">{t("etudiants.masculin")}</option>
          <option value="F">{t("etudiants.feminin")}</option>
        </ChampSelecteur>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Champ label={t("etudiants.nom")} value={etat.nom} onChange={(e) => maj("nom", e.target.value)} required />
        <Champ label={t("etudiants.postnom")} value={etat.postnom} onChange={(e) => maj("postnom", e.target.value)} required />
        <Champ label={t("etudiants.prenom")} value={etat.prenom} onChange={(e) => maj("prenom", e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("etudiants.dateNaissance")} type="date" value={etat.date_naissance} onChange={(e) => maj("date_naissance", e.target.value)} required />
        <Champ label={t("etudiants.lieuNaissance")} value={etat.lieu_naissance} onChange={(e) => maj("lieu_naissance", e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("etudiants.nationalite")} value={etat.nationalite} onChange={(e) => maj("nationalite", e.target.value)} required />
        <Champ label={t("etudiants.telephone")} value={etat.telephone} onChange={(e) => maj("telephone", e.target.value)} required />
      </div>
      <Champ label={t("etablissements.email")} type="email" value={etat.email} onChange={(e) => maj("email", e.target.value)} required />
      <Champ label={t("etudiants.adresse")} value={etat.adresse} onChange={(e) => maj("adresse", e.target.value)} required />
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampSelecteur label={t("etudiants.typePiece")} className="w-full" value={etat.type_piece} onChange={(e) => maj("type_piece", e.target.value)} required>
          <option value="">—</option>
          {TYPES_PIECE.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </ChampSelecteur>
        <Champ label={t("etudiants.numeroPiece")} value={etat.numero_piece} onChange={(e) => maj("numero_piece", e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("etudiants.nomPere")} value={etat.nom_pere} onChange={(e) => maj("nom_pere", e.target.value)} required />
        <Champ label={t("etudiants.nomMere")} value={etat.nom_mere} onChange={(e) => maj("nom_mere", e.target.value)} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label={t("etudiants.nomTuteur")} value={etat.nom_tuteur} onChange={(e) => maj("nom_tuteur", e.target.value)} required />
        <Champ label={t("etudiants.telephoneTuteur")} value={etat.telephone_tuteur} onChange={(e) => maj("telephone_tuteur", e.target.value)} required />
      </div>
      <ChampZoneTexte label={t("etudiants.observations")} value={etat.observations} onChange={(e) => maj("observations", e.target.value)} />

      {etudiant && (
        <div className="flex items-center gap-3 rounded-xl border border-dashed p-3">
          <UserRound className="size-8 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{t("etudiants.photo")}</p>
            <p className="text-xs text-muted-foreground">{t("etudiants.photoAide")}</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent">
            <Upload className="size-4" />
            {t("etudiants.televerser")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPhoto(etudiant.id, f);
              }}
            />
          </label>
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
  );
}
