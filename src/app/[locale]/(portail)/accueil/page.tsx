import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Building2, School, ShieldCheck, Users } from "lucide-react";

import { exigerSession } from "@/bibliotheque/autorisation";
import { bd } from "@/bibliotheque/bd";
import {
  Carte,
  CarteContenu,
  CarteDescription,
  CarteTitre,
} from "@/composants/ui/carte";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/composants/partages/logo";

async function compterEtablissements(): Promise<number> {
  const { count } = await bd()
    .from("entreprises")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .neq("type_entreprise", "PLATEFORME");
  return count ?? 0;
}

async function compterUtilisateurs(): Promise<number> {
  const { count } = await bd()
    .from("utilisateurs")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  return count ?? 0;
}

export default async function PageAccueil() {
  await connection();
  const session = await exigerSession();
  const t = await getTranslations("accueil");
  const superAdmin = session.roles.includes("SUPER_ADMIN");

  const [etablissements, utilisateurs] = superAdmin
    ? await Promise.all([compterEtablissements(), compterUtilisateurs()])
    : [null, null];

  return (
    <div className="space-y-6">
      <Logo />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("bonjour", { nom: session.nomComplet })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("sousTitre")}</p>
      </div>

      {superAdmin ? (
        <div className="grid grid-cols-3 gap-4">
          <Statistique
            icone={<Building2 className="size-5" />}
            libelle={t("etablissements")}
            valeur={etablissements ?? 0}
            lien="/etablissements"
          />
          <Statistique
            icone={<Users className="size-5" />}
            libelle={t("utilisateurs")}
            valeur={utilisateurs ?? 0}
            lien="/utilisateurs-plateforme"
          />
          <Statistique
            icone={<ShieldCheck className="size-5" />}
            libelle={t("role")}
            valeur={t("superAdmin")}
          />
        </div>
      ) : (
        <Carte className="rounded-2xl">
          <CarteContenu className="flex items-start gap-4 p-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-1/10 text-brand-2">
              <School className="size-5" />
            </span>
            <div>
              <CarteTitre className="text-base">
                {t("bienvenueTitre")}
              </CarteTitre>
              <CarteDescription className="mt-1">
                {t("bienvenueTexte")}
              </CarteDescription>
            </div>
          </CarteContenu>
        </Carte>
      )}
    </div>
  );
}

function Statistique({
  icone,
  libelle,
  valeur,
  lien,
}: {
  icone: React.ReactNode;
  libelle: string;
  valeur: number | string;
  lien?: string;
}) {
  const corps = (
    <Carte className="carte-vitrine h-full rounded-2xl transition-transform duration-200 hover:-translate-y-0.5">
      <CarteContenu className="flex items-center gap-4 p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-1/10 text-brand-2">
          {icone}
        </span>
        <div>
          <p className="text-2xl font-bold tracking-tight">{valeur}</p>
          <p className="text-xs text-muted-foreground">{libelle}</p>
        </div>
      </CarteContenu>
    </Carte>
  );

  return lien ? (
    <Link href={lien} className="block">
      {corps}
    </Link>
  ) : (
    corps
  );
}
