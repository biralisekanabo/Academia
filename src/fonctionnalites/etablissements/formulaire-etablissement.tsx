"use client";

import { useMemo, useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, LoaderCircle, Plus, Trash2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";

import { creerEtablissement } from "@/actions/etablissements";
import { Bouton } from "@/composants/ui/bouton";
import { Etiquette } from "@/composants/ui/etiquette";
import { Saisie } from "@/composants/ui/saisie";
import { Selecteur } from "@/composants/ui/selecteur";
import { useToast } from "@/composants/ui/toaster";
import { useRouter } from "@/i18n/navigation";

const TYPES = [
  "UNIVERSITE",
  "INSTITUT",
  "ECOLE_SUPERIEURE",
  "CENTRE_FORMATION",
  "AUTRE",
] as const;

export function FormulaireEtablissement() {
  const t = useTranslations();
  const toasts = useToast();
  const routeur = useRouter();
  const [enCours, demarrer] = useTransition();

  const schema = useMemo(
    () =>
      z.object({
        nom: z.string().min(2, { message: t("commun.requis") }),
        sigle: z.string().min(2, { message: t("commun.requis") }),
        typeEntreprise: z.enum(TYPES),
        ville: z.string().optional(),
        province: z.string().optional(),
        pays: z.string().optional(),
        telephone: z.string().optional(),
        email: z.string().optional(),
        adminNomComplet: z.string().min(3, { message: t("commun.requis") }),
        adminNomUtilisateur: z.string().min(3, { message: t("commun.requis") }),
        adminEmail: z
          .string()
          .min(1, { message: t("commun.requis") })
          .email({ message: t("commun.emailInvalide") }),
        adminMotDePasse: z.string().min(8, { message: t("auth.motDePasseCourt") }),
        succursales: z.array(
          z.object({ nom: z.string(), ville: z.string().optional() })
        ),
      }),
    [t]
  );

  type Donnees = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<Donnees>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: "",
      sigle: "",
      typeEntreprise: "UNIVERSITE",
      ville: "",
      province: "",
      pays: "",
      telephone: "",
      email: "",
      adminNomComplet: "",
      adminNomUtilisateur: "",
      adminEmail: "",
      adminMotDePasse: "",
      succursales: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "succursales" });
  const [erreur, setErreur] = useState<string | null>(null);

  const soumettre = handleSubmit((valeurs) => {
    demarrer(async () => {
      setErreur(null);
      const resultat = await creerEtablissement({
        etablissement: {
          nom: valeurs.nom,
          sigle: valeurs.sigle,
          typeEntreprise: valeurs.typeEntreprise,
          ville: valeurs.ville,
          province: valeurs.province,
          pays: valeurs.pays,
          telephone: valeurs.telephone,
          email: valeurs.email,
        },
        admin: {
          nomComplet: valeurs.adminNomComplet,
          nomUtilisateur: valeurs.adminNomUtilisateur,
          email: valeurs.adminEmail,
          motDePasse: valeurs.adminMotDePasse,
        },
        succursales: valeurs.succursales ?? [],
      });

      if (resultat.erreur) {
        setErreur(resultat.erreur);
        setError("root", { type: "serveur", message: resultat.erreur });
        toasts.erreur(t("toasts.erreur"), resultat.erreur);
        return;
      }

      toasts.succes(t("toasts.succes"), t("etablissements.creationReussie"));
      routeur.push("/etablissements");
      routeur.refresh();
    });
  });

  return (
    <form onSubmit={soumettre} className="space-y-8" noValidate>
      {erreur && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {erreur}
        </p>
      )}

      <Section
        icone={<Building2 className="size-5" />}
        titre={t("etablissements.sectionEtablissement")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            label={t("etablissements.nom")}
            erreur={errors.nom?.message}
            {...register("nom")}
          />
          <Champ
            label={t("etablissements.sigle")}
            erreur={errors.sigle?.message}
            {...register("sigle")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Etiquette>{t("etablissements.type")}</Etiquette>
            <Selecteur className="w-full" {...register("typeEntreprise")}>
              {TYPES.map((valeur) => (
                <option key={valeur} value={valeur}>
                  {t(`etablissements.types.${valeur}` as never)}
                </option>
              ))}
            </Selecteur>
          </div>
          <Champ label={t("etablissements.ville")} {...register("ville")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label={t("etablissements.province")} {...register("province")} />
          <Champ label={t("etablissements.pays")} {...register("pays")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label={t("etablissements.telephone")} {...register("telephone")} />
          <Champ
            label={t("etablissements.email")}
            type="email"
            erreur={errors.email?.message}
            {...register("email")}
          />
        </div>
      </Section>

      <Section
        icone={<UserPlus className="size-5" />}
        titre={t("etablissements.sectionAdmin")}
        description={t("etablissements.adminAide")}
      >
        <Champ
          label={t("etablissements.adminNomComplet")}
          erreur={errors.adminNomComplet?.message}
          {...register("adminNomComplet")}
        />
        <Champ
          label={t("etablissements.email")}
          type="email"
          erreur={errors.adminEmail?.message}
          {...register("adminEmail")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ
            label={t("auth.identifiant")}
            erreur={errors.adminNomUtilisateur?.message}
            {...register("adminNomUtilisateur")}
          />
          <Champ
            label={t("auth.motDePasse")}
            type="password"
            erreur={errors.adminMotDePasse?.message}
            {...register("adminMotDePasse")}
          />
        </div>
      </Section>

      <Section
        icone={<Plus className="size-5" />}
        titre={t("etablissements.sectionSuccursales")}
        description={t("etablissements.succursalesAide")}
        action={
          <Bouton
            type="button"
            variante="contour"
            taille="sm"
            onClick={() => append({ nom: "", ville: "" })}
          >
            <Plus />
            {t("etablissements.ajouterSuccursale")}
          </Bouton>
        }
      >
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("etablissements.aucuneSuccursale")}
          </p>
        )}
        {fields.map((champ, index) => (
          <div key={champ.id} className="flex items-end gap-3">
            <div className="flex-1">
              <Champ
                label={t("etablissements.nomSuccursale")}
                {...register(`succursales.${index}.nom`)}
              />
            </div>
            <div className="flex-1">
              <Champ
                label={t("etablissements.ville")}
                {...register(`succursales.${index}.ville`)}
              />
            </div>
            <Bouton
              type="button"
              variante="fantome"
              taille="icone"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => remove(index)}
              aria-label={t("commun.supprimer")}
            >
              <Trash2 />
            </Bouton>
          </div>
        ))}
      </Section>

      <div className="flex justify-end gap-3 border-t pt-5">
        <Bouton
          type="submit"
          disabled={enCours}
          aria-busy={enCours}
          className="degrade-brand border-0 text-white shadow-lg shadow-brand-1/20"
        >
          {enCours && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {enCours ? t("auth.enCours") : t("etablissements.creer")}
        </Bouton>
      </div>
    </form>
  );
}

function Section({
  icone,
  titre,
  description,
  action,
  children,
}: {
  icone: React.ReactNode;
  titre: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="carte-vitrine space-y-4 rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="degrade-brand grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-md shadow-brand-1/25">
            {icone}
          </span>
          <div>
            <h2 className="text-base font-semibold">{titre}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const Champ = ({
  label,
  erreur,
  ref,
  ...props
}: React.ComponentProps<typeof Saisie> & {
  label: string;
  erreur?: string;
}) => (
  <div className="space-y-2">
    <Etiquette>{label}</Etiquette>
    <Saisie ref={ref} {...props} />
    {erreur && <p className="text-xs text-destructive">{erreur}</p>}
  </div>
);
