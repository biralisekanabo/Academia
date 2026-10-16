"use client";

import { useState, useTransition } from "react";
import { KeyRound, LoaderCircle, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";

import { seDeconnecter } from "@/actions/auth";
import { changerMonMotDePasse } from "@/actions/profil";
import { Champ } from "@/composants/partages/champ-formulaire";
import { Bouton } from "@/composants/ui/bouton";
import { useToast } from "@/composants/ui/toaster";
import { useRouter } from "@/i18n/navigation";

export function FormulaireProfil({
  nomComplet,
  nomUtilisateur,
}: {
  nomComplet: string;
  nomUtilisateur: string;
}) {
  const t = useTranslations();
  const toasts = useToast();
  const routeur = useRouter();
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState({
    motDePasseActuel: "",
    nouveauMotDePasse: "",
    confirmation: "",
  });

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    demarrer(async () => {
      const r = await changerMonMotDePasse(etat);
      if (r.erreur) return toasts.erreur(t("toasts.erreur"), r.erreur);
      toasts.succes(t("toasts.succes"), t("profil.motDePasseMaj"));
      setEtat({ motDePasseActuel: "", nouveauMotDePasse: "", confirmation: "" });
      routeur.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="carte-vitrine rounded-3xl border bg-card p-6 shadow-sm">
        <p className="text-xs text-muted-foreground">{t("profil.connecteComme")}</p>
        <p className="mt-1 text-lg font-semibold">{nomComplet}</p>
        <p className="text-sm text-muted-foreground">@{nomUtilisateur}</p>
        <form action={seDeconnecter} className="mt-6">
          <Bouton type="submit" variante="contour">
            <LogOut />
            {t("navigation.deconnexion")}
          </Bouton>
        </form>
      </div>

      <div className="carte-vitrine rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="size-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">{t("profil.changerMotDePasse")}</h2>
        </div>
        <form onSubmit={soumettre} className="space-y-4">
          <Champ
            label={t("profil.motDePasseActuel")}
            type="password"
            value={etat.motDePasseActuel}
            onChange={(e) => setEtat({ ...etat, motDePasseActuel: e.target.value })}
            required
          />
          <Champ
            label={t("profil.nouveauMotDePasse")}
            type="password"
            value={etat.nouveauMotDePasse}
            onChange={(e) => setEtat({ ...etat, nouveauMotDePasse: e.target.value })}
            required
          />
          <Champ
            label={t("profil.confirmation")}
            type="password"
            value={etat.confirmation}
            onChange={(e) => setEtat({ ...etat, confirmation: e.target.value })}
            required
          />
          <div className="flex justify-end">
            <Bouton type="submit" disabled={enCours}>
              {enCours && <LoaderCircle className="animate-spin" />}
              {t("commun.sauvegarder")}
            </Bouton>
          </div>
        </form>
      </div>
    </div>
  );
}
