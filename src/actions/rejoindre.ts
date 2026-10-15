"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { creerNotifications } from "@/bibliotheque/notifications";
import { obtenirSession } from "@/bibliotheque/supabase/session";
import { creerClientAdmin } from "@/bibliotheque/supabase/client-admin";
import { debloquerCompteBloque } from "@/bibliotheque/supabase/comptes";
import { creerClientServeur } from "@/bibliotheque/supabase/client-serveur";
import { emailDepuisService, serviceValide } from "@/utilitaires/service";

export type ResultatRejoindre = {
  erreur?: string;
  ok?: boolean;
  coursId?: string;
};

type ClientAdmin = ReturnType<typeof creerClientAdmin>;

function anneeUniversitaire(date = new Date()): string {
  const annee = date.getFullYear();
  return date.getMonth() + 1 >= 9 ? `${annee}-${annee + 1}` : `${annee - 1}-${annee}`;
}

/**
 * Crée le dossier académique de l'étudiant (matricule auto si absent).
 * Renvoie le matricule retenu, ou null en cas d'échec.
 */
async function assurerDossierEtudiant(
  admin: ClientAdmin,
  idUtilisateur: string,
  matriculeFourni?: string | null
): Promise<string | null> {
  const { data: existant } = await admin
    .from("openlu_etudiants")
    .select("matricule")
    .eq("id", idUtilisateur)
    .maybeSingle();
  if (existant) return existant.matricule;

  const annee = anneeUniversitaire();
  const anneeCourte = annee.split("-")[0];
  const fourni = matriculeFourni?.trim()?.slice(0, 40) || null;

  for (let tentative = 0; tentative < 6; tentative++) {
    let matricule: string;
    if (fourni && tentative === 0) {
      matricule = fourni;
    } else {
      const { count } = await admin
        .from("openlu_etudiants")
        .select("*", { count: "exact", head: true })
        .eq("annee_universitaire", annee);
      const numero = (count ?? 0) + 1 + tentative;
      matricule = `OL-${anneeCourte}-${String(numero).padStart(4, "0")}`;
    }

    const { error } = await admin.from("openlu_etudiants").insert({
      id: idUtilisateur,
      matricule,
      niveau: "L1",
      annee_universitaire: annee,
      statut: "actif",
    });

    if (!error) return matricule;
  }

  return null;
}

async function inscrireAuCours(admin: ClientAdmin, coursId: string, etudiantId: string) {
  return admin.from("openlu_inscriptions_cours").upsert(
    { cours_id: coursId, etudiant_id: etudiantId, statut: "validee" },
    { onConflict: "etudiant_id,cours_id" }
  );
}

/**
 * Inscription autonome d'un étudiant à une classe via son jeton partagé.
 * Le compte est créé côté serveur (service_role), l'étudiant est inscrit au
 * cours puis connecté automatiquement pour arriver directement dans la classe.
 */
export async function rejoindreClasse(donnees: {
  jeton: string;
  prenom: string;
  nom: string;
  service: string;
  motDePasse: string;
  matricule?: string;
}): Promise<ResultatRejoindre> {
  const t = await getTranslations();

  const jeton = donnees.jeton?.trim();
  const prenom = donnees.prenom?.trim();
  const nom = donnees.nom?.trim();
  const service = donnees.service?.trim();
  const motDePasse = donnees.motDePasse ?? "";

  if (!jeton || jeton.length > 64) return { erreur: t("rejoindre.erreurLien") };
  if (prenom.length < 1 || prenom.length > 80 || nom.length < 1 || nom.length > 80) {
    return { erreur: t("rejoindre.erreurIdentite") };
  }
  if (!serviceValide(service)) return { erreur: t("auth.serviceInvalide") };
  if (motDePasse.length < 6 || motDePasse.length > 72) {
    return { erreur: t("auth.motDePasseCourt") };
  }

  const admin = creerClientAdmin();
  const { data: cours, error: erreurCours } = await admin
    .from("openlu_cours")
    .select("id, titre, inscription_ouverte")
    .eq("jeton_inscription", jeton)
    .maybeSingle();

  if (erreurCours || !cours) return { erreur: t("rejoindre.erreurLien") };
  if (!cours.inscription_ouverte) return { erreur: t("rejoindre.inscriptionFermee") };

  const email = emailDepuisService(service);
  const metadata = { prenom, nom, role: "etudiant" };
  const { data: cree, error: erreurAuth } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
    user_metadata: metadata,
  });

  let idUtilisateur = cree?.user?.id ?? null;

  if (erreurAuth || !idUtilisateur) {
    const deja = /already|existe|registered/i.test(erreurAuth?.message ?? "");

    // Un compte resté non confirmé par l'ancien flux est débloqué au lieu
    // de renvoyer « déjà utilisé » : personne ne peut s'en servir.
    if (deja) {
      idUtilisateur = await debloquerCompteBloque(admin, email, {
        motDePasse,
        metadata,
      });
    }

    if (!idUtilisateur) {
      return { erreur: deja ? t("rejoindre.serviceDejaUtilise") : t("rejoindre.erreurCompte") };
    }
  }
  const matricule = await assurerDossierEtudiant(admin, idUtilisateur, donnees.matricule);

  if (!matricule) {
    await admin.auth.admin.deleteUser(idUtilisateur).catch(() => undefined);
    return { erreur: t("rejoindre.erreurMatricule") };
  }

  const { error: erreurInscription } = await inscrireAuCours(admin, cours.id, idUtilisateur);
  if (erreurInscription) return { erreur: t("rejoindre.erreurInscription") };

  await creerNotifications([idUtilisateur], {
    titre: t("notifications.evenements.coursTitre"),
    message: t("notifications.evenements.coursMessage", { cours: cours.titre }),
    type: "succes",
    lien: `/cours/${cours.id}`,
  });

  // Connexion automatique : l'étudiant arrive directement dans la classe.
  const supabase = await creerClientServeur();
  await supabase.auth.signInWithPassword({ email, password: motDePasse });

  revalider();
  return { ok: true, coursId: cours.id };
}

/**
 * Inscrit un étudiant déjà connecté à une classe via le lien partagé.
 */
export async function rejoindreEnTantQueConnecte(jeton: string): Promise<ResultatRejoindre> {
  const t = await getTranslations();
  const session = await obtenirSession();

  if (!session.utilisateur || !session.profil) return { erreur: t("rejoindre.erreurLien") };
  if (session.profil.role !== "etudiant") return { erreur: t("rejoindre.reserveEtudiant") };

  const admin = creerClientAdmin();
  const { data: cours } = await admin
    .from("openlu_cours")
    .select("id, titre, inscription_ouverte")
    .eq("jeton_inscription", jeton?.trim() ?? "")
    .maybeSingle();

  if (!cours) return { erreur: t("rejoindre.erreurLien") };
  if (!cours.inscription_ouverte) return { erreur: t("rejoindre.inscriptionFermee") };

  const matricule = await assurerDossierEtudiant(admin, session.profil.id);
  if (!matricule) return { erreur: t("rejoindre.erreurMatricule") };

  const { error } = await inscrireAuCours(admin, cours.id, session.profil.id);
  if (error) return { erreur: t("rejoindre.erreurInscription") };

  await creerNotifications([session.profil.id], {
    titre: t("notifications.evenements.coursTitre"),
    message: t("notifications.evenements.coursMessage", { cours: cours.titre }),
    type: "succes",
    lien: `/cours/${cours.id}`,
  });

  revalider();
  return { ok: true, coursId: cours.id };
}

function revalider() {
  revalidatePath("/cours");
  revalidatePath("/notes");
  revalidatePath("/apprentissage");
}
