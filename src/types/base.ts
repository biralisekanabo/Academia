export const ROLES_SYSTEME = [
  "SUPER_ADMIN",
  "ADMIN_PRINCIPAL",
  "ADMIN",
  "DIRECTEUR",
  "AGENT_INSCRIPTION",
  "COMPTABLE",
  "CAISSIER",
  "SECRETAIRE_ACADEMIQUE",
  "AUDITEUR",
  "ETUDIANT",
  "ENSEIGNANT",
] as const;

export type CodeRole = (typeof ROLES_SYSTEME)[number];

export type Session = {
  utilisateurId: number;
  entrepriseId: number;
  nomComplet: string;
  nomUtilisateur: string;
  roles: string[];
  estAdminPrincipal: boolean;
  doitChangerMotDePasse: boolean;
};

export type Entreprise = {
  id: number;
  uuid: string;
  nom: string;
  sigle: string | null;
  type_entreprise: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  pays: string | null;
  province: string | null;
  ville: string | null;
  logo: string | null;
  est_mere: boolean;
  entreprise_mere_id: number | null;
  statut: "ACTIVE" | "SUSPENDUE" | "INACTIVE";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Utilisateur = {
  id: number;
  entreprise_id: number;
  nom_complet: string;
  nom_utilisateur: string;
  email: string | null;
  telephone: string | null;
  est_admin_principal: boolean;
  doit_changer_mot_de_passe: boolean;
  statut: "ACTIF" | "INACTIF" | "SUSPENDU";
  derniere_connexion: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type StatutGeneration = {
  erreur?: string | null;
};

// --- Rôles & permissions --------------------------------------

export type Role = {
  id: number;
  entreprise_id: number | null;
  code: string;
  nom: string;
  description: string | null;
  est_systeme: boolean;
  created_at: string;
};

export type Permission = {
  id: number;
  code: string;
  module: string;
  action: string;
  description: string | null;
};

// --- Académique ------------------------------------------------

export type AnneeAcademique = {
  id: number;
  entreprise_id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
  est_active: boolean;
  statut: "OUVERTE" | "CLOTUREE";
  created_at: string;
  deleted_at: string | null;
};

export type Faculte = {
  id: number;
  entreprise_id: number;
  code: string;
  nom: string;
  description: string | null;
  ordre: number;
  statut: "ACTIVE" | "INACTIVE" | "ARCHIVEE";
  deleted_at: string | null;
};

export type Domaine = {
  id: number;
  entreprise_id: number;
  faculte_id: number;
  code: string;
  nom: string;
  description: string | null;
  statut: "ACTIVE" | "INACTIVE" | "ARCHIVEE";
  deleted_at: string | null;
};

export type Promotion = {
  id: number;
  entreprise_id: number;
  faculte_id: number;
  domaine_id: number;
  code: string | null;
  nom: string;
  niveau: string | null;
  ordre: number;
  statut: "ACTIVE" | "INACTIVE" | "ARCHIVEE";
  deleted_at: string | null;
};

export type Etudiant = {
  id: number;
  uuid: string;
  entreprise_id: number;
  utilisateur_id: number | null;
  matricule: string;
  nom: string;
  postnom: string | null;
  prenom: string;
  sexe: "M" | "F";
  date_naissance: string | null;
  lieu_naissance: string | null;
  nationalite: string | null;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  nom_pere: string | null;
  nom_mere: string | null;
  nom_tuteur: string | null;
  telephone_tuteur: string | null;
  contact_urgence: string | null;
  photo: string | null;
  type_piece: "CNI" | "PASSEPORT" | "PAROISSE" | "AUTRE" | null;
  numero_piece: string | null;
  statut: "ACTIF" | "INACTIF" | "SUSPENDU" | "DIPLOME" | "REJETE" | "EN_ATTENTE";
  observations: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type Inscription = {
  id: number;
  uuid: string;
  entreprise_id: number;
  etudiant_id: number;
  annee_academique_id: number;
  faculte_id: number;
  domaine_id: number;
  promotion_id: number;
  numero_inscription: string;
  date_inscription: string;
  type_inscription: "INITIALE" | "REINSCRIPTION";
  statut: "EN_ATTENTE" | "VALIDEE" | "REFUSEE" | "ANNULEE";
  validee_par: number | null;
  validee_le: string | null;
  enregistre_par: number | null;
  observations: string | null;
  created_at: string;
  deleted_at: string | null;
};

// --- Monnaie --------------------------------------------------

export type Devise = {
  id: number;
  entreprise_id: number;
  code: string;
  nom: string;
  symbole: string | null;
  nb_decimales: number;
  est_reference: boolean;
  statut: "ACTIVE" | "INACTIVE";
  deleted_at: string | null;
};

export type TauxChange = {
  id: number;
  entreprise_id: number;
  devise_source_id: number;
  devise_cible_id: number;
  taux: number;
  date_effet: string;
  est_courant: boolean;
};

// --- Finances -------------------------------------------------

export type FraisAcademique = {
  id: number;
  uuid: string;
  entreprise_id: number;
  annee_academique_id: number;
  faculte_id: number | null;
  domaine_id: number | null;
  promotion_id: number | null;
  libelle: string;
  montant: number;
  devise_id: number;
  date_limite: string | null;
  modalites: string | null;
  statut: "ACTIF" | "INACTIF";
  deleted_at: string | null;
};

export type Dette = {
  id: number;
  uuid: string;
  entreprise_id: number;
  etudiant_id: number;
  inscription_id: number;
  frais_academique_id: number;
  annee_academique_id: number;
  montant_initial: number;
  montant_reduction: number;
  montant_paye: number;
  solde: number;
  devise_id: number;
  date_echeance: string | null;
  statut: "IMPAYEE" | "PARTIELLE" | "PAYEE" | "ANNULEE";
  deleted_at: string | null;
};

// --- Caisse ---------------------------------------------------

export type Caisse = {
  id: number;
  uuid: string;
  entreprise_id: number;
  code: string;
  nom: string;
  devise_id: number;
  caissier_id: number | null;
  solde_initial: number;
  statut: "FERMEE" | "OUVERTE" | "SUSPENDUE";
  ouverte_le: string | null;
  fermee_le: string | null;
  deleted_at: string | null;
};

export type SessionCaisse = {
  id: number;
  uuid: string;
  entreprise_id: number;
  caisse_id: number;
  caissier_id: number | null;
  fonds_initial: number;
  ouverte_le: string;
  cloturee_le: string | null;
  total_entrees: number;
  total_sorties: number;
  solde_theorique: number | null;
  montant_compte: number | null;
  ecart: number | null;
  observations: string | null;
  statut: "OUVERTE" | "CLOTUREE";
};

export type Paiement = {
  id: number;
  uuid: string;
  entreprise_id: number;
  etudiant_id: number;
  caisse_id: number;
  session_caisse_id: number | null;
  numero_recu: string;
  montant: number;
  devise_id: number;
  taux_applique: number | null;
  montant_reference: number | null;
  methode:
    | "ESPECES"
    | "MOBILE_MONEY"
    | "CARTE_BANCAIRE"
    | "VIREMENT"
    | "CHEQUE"
    | "AUTRE";
  reference_transaction: string | null;
  date_paiement: string;
  statut: "EN_ATTENTE" | "VALIDE" | "ANNULE" | "REMBOURSE";
  enregistre_par: number | null;
  valide_par: number | null;
  ecriture_id: number | null;
  deleted_at: string | null;
};

export type MouvementCaisse = {
  id: number;
  uuid: string;
  entreprise_id: number;
  caisse_id: number;
  type: "ENTREE" | "SORTIE" | "TRANSFERT" | "REMBOURSEMENT" | "CORRECTION";
  numero_piece: string;
  montant: number;
  devise_id: number;
  motif: string;
  beneficiaire: string | null;
  categorie: string | null;
  reference: string | null;
  piece_justificative: string | null;
  caisse_destination_id: number | null;
  paiement_id: number | null;
  session_caisse_id: number | null;
  date_mouvement: string;
  statut: "EN_ATTENTE" | "VALIDE" | "ANNULE";
  enregistre_par: number | null;
  valide_par: number | null;
  ecriture_id: number | null;
  deleted_at: string | null;
};

export type PaiementDette = {
  paiement_id: number;
  dette_id: number;
  montant: number;
  created_at: string;
};

export type JournalCaisse = {
  id: number;
  entreprise_id: number;
  caisse_id: number;
  source_type: "PAIEMENT" | "MOUVEMENT";
  source_id: number;
  sens: "ENTREE" | "SORTIE";
  montant: number;
  devise_id: number;
  solde_apres: number | null;
  cree_le: string;
};

export type RemiseDette = {
  id: number;
  entreprise_id: number;
  dette_id: number;
  montant: number;
  motif: string | null;
  accordee_par: number | null;
  created_at: string;
};

export type FraisTranche = {
  id: number;
  frais_academique_id: number;
  numero: number;
  libelle: string | null;
  pourcentage: number;
  date_limite: string | null;
  created_at: string;
};

export type VueSoldeCaisse = {
  caisse_id: number;
  entreprise_id: number;
  code: string;
  nom: string;
  devise_id: number;
  statut: "FERMEE" | "OUVERTE" | "SUSPENDUE";
  solde_initial: number;
  solde_courant: number;
};

export type VueSituationEtudiant = {
  etudiant_id: number;
  entreprise_id: number;
  matricule: string;
  nom: string;
  postnom: string | null;
  prenom: string;
  total_du: number;
  total_reduction: number;
  total_paye: number;
  total_solde: number;
};

// --- Comptabilité ---------------------------------------------

export type CompteComptable = {
  id: number;
  entreprise_id: number;
  code: string;
  libelle: string;
  classe: number;
  type_compte: "ACTIF" | "PASSIF" | "CHARGE" | "PRODUIT";
  compte_parent_id: number | null;
  est_synthetique: boolean;
  statut: "ACTIF" | "INACTIF";
  deleted_at: string | null;
};

export type JournalComptable = {
  id: number;
  entreprise_id: number;
  code: string;
  nom: string;
  type: string;
  deleted_at: string | null;
};

export type Ecriture = {
  id: number;
  uuid: string;
  entreprise_id: number;
  journal_id: number;
  numero: string;
  date_ecriture: string;
  libelle: string;
  piece_reference: string | null;
  statut: "BROUILLON" | "VALIDEE" | "ANNULEE";
  validee_par: number | null;
  validee_le: string | null;
  deleted_at: string | null;
};

export type EcritureLigne = {
  id: number;
  ecriture_id: number;
  compte_id: number;
  debit: number;
  credit: number;
  libelle: string | null;
};

// --- Audit ----------------------------------------------------

export type JournalAudit = {
  id: number;
  entreprise_id: number | null;
  utilisateur_id: number | null;
  action: string;
  table_concernee: string | null;
  enregistrement_id: number | null;
  details: unknown;
  adresse_ip: string | null;
  cree_le: string;
};
