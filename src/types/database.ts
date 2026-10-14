export type TypeRole =
  | "etudiant"
  | "enseignant"
  | "administrateur"
  | "personnel"
  | "reception"
  | "finance";
export type TypeStatut = "actif" | "inactif" | "suspendu" | "diplome" | "rejete" | "en_attente";
export type TypeInscriptionStatut = "en_attente" | "validee" | "refusee";
export type TypeEvaluation = "devoir" | "examen" | "projet" | "partiel";
export type TypeMethodePaiement = "especes" | "mobile_money" | "carte_bancaire" | "virement" | "cheque" | "autre";
export type TypeStatutPaiement = "en_attente" | "valide" | "echoue" | "rembourse";
export type TypeStatutSoumission = "rendu" | "corrige" | "refuse";
export type TypeNiveau = "L1" | "L2" | "L3" | "M1" | "M2";
export type TypeNotification =
  | "info"
  | "succes"
  | "alerte"
  | "paiement"
  | "note"
  | "annonce";
export type TypeTransaction = "entree" | "sortie";
export type TypeCategorieTransaction =
  | "scolarite"
  | "salaire"
  | "fourniture"
  | "loyer"
  | "service"
  | "subvention"
  | "don"
  | "maintenance"
  | "autre";

export type Profil = {
  id: string;
  prenom: string;
  nom: string;
  role: TypeRole;
  telephone: string | null;
  avatar_url: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type Faculte = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  ordre: number;
  cree_le: string;
  mis_a_jour: string;
};

export type Filiere = {
  id: string;
  faculte_id: string;
  code: string;
  nom: string;
  description: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type Etudiant = {
  id: string;
  matricule: string;
  filiere_id: string | null;
  niveau: TypeNiveau;
  annee_universitaire: string;
  statut: TypeStatut;
  date_inscription: string;
  cree_le: string;
  mis_a_jour: string;
};

export type Annonce = {
  id: string;
  titre: string;
  contenu: string;
  publiee: boolean;
  publiee_le: string | null;
  auteur_id: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type FichierAnnonce = {
  id: string;
  annonce_id: string;
  nom: string;
  chemin: string;
  type_mime: string;
  taille_octets: number;
  cree_le: string;
};

export type Enseignant = {
  id: string;
  specialite: string | null;
  statut: TypeStatut;
  date_embauche: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type Cours = {
  id: string;
  code: string;
  titre: string;
  description: string | null;
  credits: number;
  semestre: number;
  enseignant_id: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type InscriptionCours = {
  id: string;
  etudiant_id: string;
  cours_id: string;
  statut: TypeInscriptionStatut;
  date_inscription: string;
};

export type Seance = {
  id: string;
  cours_id: string;
  type_seance: "cours" | "td" | "tp" | "examen";
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  salle: string | null;
  cree_le: string;
};

export type Evaluation = {
  id: string;
  cours_id: string;
  titre: string;
  type: TypeEvaluation;
  coefficient: number;
  bareme: number;
  date_echeance: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type Note = {
  id: string;
  evaluation_id: string;
  etudiant_id: string;
  valeur: number;
  appreciation: string | null;
  saisie_le: string;
};

export type FraisScolarite = {
  id: string;
  faculte_id: string | null;
  filiere_id: string | null;
  niveau: TypeNiveau;
  libelle: string;
  montant: number;
  devise: string;
  annee_universitaire: string;
  cree_le: string;
  mis_a_jour: string;
};

export type Paiement = {
  id: string;
  etudiant_id: string;
  frais_id: string | null;
  reference: string;
  libelle: string | null;
  montant: number;
  methode: TypeMethodePaiement;
  statut: TypeStatutPaiement;
  date_paiement: string;
  note: string | null;
  enregistre_par: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type PaiementEnseignant = {
  id: string;
  enseignant_id: string;
  reference: string;
  libelle: string;
  montant: number;
  mois: string;
  statut: TypeStatutPaiement;
  methode: TypeMethodePaiement;
  date_paiement: string | null;
  note: string | null;
  enregistre_par: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type SupportCours = {
  id: string;
  cours_id: string;
  titre: string;
  type_support: "document" | "video" | "exercice" | "lien";
  url: string | null;
  description: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type Devoir = {
  id: string;
  cours_id: string;
  titre: string;
  description: string | null;
  date_limite: string | null;
  bareme: number;
  cree_le: string;
  mis_a_jour: string;
};

export type Soumission = {
  id: string;
  devoir_id: string;
  etudiant_id: string;
  url: string | null;
  contenu: string | null;
  statut: TypeStatutSoumission;
  note: number | null;
  date_soumission: string;
  mis_a_jour: string;
};

export type Notification = {
  id: string;
  destinataire_id: string;
  titre: string;
  message: string | null;
  type: TypeNotification;
  lien: string | null;
  lue: boolean;
  cree_le: string;
};

export type AbonnementPush = {
  id: string;
  utilisateur_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  cree_le: string;
};

export type Transaction = {
  id: string;
  type: TypeTransaction;
  categorie: TypeCategorieTransaction;
  libelle: string;
  montant: number;
  devise: string;
  methode: TypeMethodePaiement;
  reference: string;
  date_transaction: string;
  description: string | null;
  source_id: string | null;
  enregistre_par: string | null;
  cree_le: string;
  mis_a_jour: string;
};

export type Database = {
  public: {
    Tables: {
      openlu_profils: { Row: Profil; Insert: Partial<Profil>; Update: Partial<Profil>; Relationships: [] };
      openlu_annonces: { Row: Annonce; Insert: Partial<Annonce>; Update: Partial<Annonce>; Relationships: [ { foreignKeyName: "openlu_annonces_auteur_id_fkey"; columns: ["auteur_id"]; isOneToOne: false; referencedRelation: "openlu_profils"; referencedColumns: ["id"] } ] };
      openlu_annonces_fichiers: { Row: FichierAnnonce; Insert: Partial<FichierAnnonce>; Update: Partial<FichierAnnonce>; Relationships: [ { foreignKeyName: "openlu_annonces_fichiers_annonce_id_fkey"; columns: ["annonce_id"]; isOneToOne: false; referencedRelation: "openlu_annonces"; referencedColumns: ["id"] } ] };
      openlu_facultes: { Row: Faculte; Insert: Partial<Faculte>; Update: Partial<Faculte>; Relationships: [] };
      openlu_filieres: { Row: Filiere; Insert: Partial<Filiere>; Update: Partial<Filiere>; Relationships: [ { foreignKeyName: "openlu_filieres_faculte_id_fkey"; columns: ["faculte_id"]; isOneToOne: false; referencedRelation: "openlu_facultes"; referencedColumns: ["id"] } ] };
      openlu_etudiants: { Row: Etudiant; Insert: Partial<Etudiant>; Update: Partial<Etudiant>; Relationships: [ { foreignKeyName: "openlu_etudiants_filiere_id_fkey"; columns: ["filiere_id"]; isOneToOne: false; referencedRelation: "openlu_filieres"; referencedColumns: ["id"] }, { foreignKeyName: "openlu_etudiants_id_fkey"; columns: ["id"]; isOneToOne: true; referencedRelation: "openlu_profils"; referencedColumns: ["id"] } ] };
      openlu_enseignants: { Row: Enseignant; Insert: Partial<Enseignant>; Update: Partial<Enseignant>; Relationships: [ { foreignKeyName: "openlu_enseignants_id_fkey"; columns: ["id"]; isOneToOne: true; referencedRelation: "openlu_profils"; referencedColumns: ["id"] } ] };
      openlu_cours: { Row: Cours; Insert: Partial<Cours>; Update: Partial<Cours>; Relationships: [ { foreignKeyName: "openlu_cours_enseignant_id_fkey"; columns: ["enseignant_id"]; isOneToOne: false; referencedRelation: "openlu_enseignants"; referencedColumns: ["id"] } ] };
      openlu_inscriptions_cours: { Row: InscriptionCours; Insert: Partial<InscriptionCours>; Update: Partial<InscriptionCours>; Relationships: [ { foreignKeyName: "openlu_inscriptions_cours_etudiant_id_fkey"; columns: ["etudiant_id"]; isOneToOne: false; referencedRelation: "openlu_etudiants"; referencedColumns: ["id"] }, { foreignKeyName: "openlu_inscriptions_cours_cours_id_fkey"; columns: ["cours_id"]; isOneToOne: false; referencedRelation: "openlu_cours"; referencedColumns: ["id"] } ] };
      openlu_seances: { Row: Seance; Insert: Partial<Seance>; Update: Partial<Seance>; Relationships: [ { foreignKeyName: "openlu_seances_cours_id_fkey"; columns: ["cours_id"]; isOneToOne: false; referencedRelation: "openlu_cours"; referencedColumns: ["id"] } ] };
      openlu_evaluations: { Row: Evaluation; Insert: Partial<Evaluation>; Update: Partial<Evaluation>; Relationships: [ { foreignKeyName: "openlu_evaluations_cours_id_fkey"; columns: ["cours_id"]; isOneToOne: false; referencedRelation: "openlu_cours"; referencedColumns: ["id"] } ] };
      openlu_notes: { Row: Note; Insert: Partial<Note>; Update: Partial<Note>; Relationships: [ { foreignKeyName: "openlu_notes_evaluation_id_fkey"; columns: ["evaluation_id"]; isOneToOne: false; referencedRelation: "openlu_evaluations"; referencedColumns: ["id"] }, { foreignKeyName: "openlu_notes_etudiant_id_fkey"; columns: ["etudiant_id"]; isOneToOne: false; referencedRelation: "openlu_etudiants"; referencedColumns: ["id"] } ] };
      openlu_frais_scolarite: { Row: FraisScolarite; Insert: Partial<FraisScolarite>; Update: Partial<FraisScolarite>; Relationships: [ { foreignKeyName: "openlu_frais_scolarite_faculte_id_fkey"; columns: ["faculte_id"]; isOneToOne: false; referencedRelation: "openlu_facultes"; referencedColumns: ["id"] }, { foreignKeyName: "openlu_frais_scolarite_filiere_id_fkey"; columns: ["filiere_id"]; isOneToOne: false; referencedRelation: "openlu_filieres"; referencedColumns: ["id"] } ] };
      openlu_paiements: { Row: Paiement; Insert: Partial<Paiement>; Update: Partial<Paiement>; Relationships: [ { foreignKeyName: "openlu_paiements_etudiant_id_fkey"; columns: ["etudiant_id"]; isOneToOne: false; referencedRelation: "openlu_etudiants"; referencedColumns: ["id"] }, { foreignKeyName: "openlu_paiements_frais_id_fkey"; columns: ["frais_id"]; isOneToOne: false; referencedRelation: "openlu_frais_scolarite"; referencedColumns: ["id"] }, { foreignKeyName: "openlu_paiements_enregistre_par_fkey"; columns: ["enregistre_par"]; isOneToOne: false; referencedRelation: "openlu_profils"; referencedColumns: ["id"] } ] };
      openlu_paiements_enseignants: { Row: PaiementEnseignant; Insert: Partial<PaiementEnseignant>; Update: Partial<PaiementEnseignant>; Relationships: [ { foreignKeyName: "openlu_paiements_enseignants_enseignant_id_fkey"; columns: ["enseignant_id"]; isOneToOne: false; referencedRelation: "openlu_enseignants"; referencedColumns: ["id"] }, { foreignKeyName: "openlu_paiements_enseignants_enregistre_par_fkey"; columns: ["enregistre_par"]; isOneToOne: false; referencedRelation: "openlu_profils"; referencedColumns: ["id"] } ] };
      openlu_supports_cours: { Row: SupportCours; Insert: Partial<SupportCours>; Update: Partial<SupportCours>; Relationships: [ { foreignKeyName: "openlu_supports_cours_cours_id_fkey"; columns: ["cours_id"]; isOneToOne: false; referencedRelation: "openlu_cours"; referencedColumns: ["id"] } ] };
      openlu_devoirs: { Row: Devoir; Insert: Partial<Devoir>; Update: Partial<Devoir>; Relationships: [ { foreignKeyName: "openlu_devoirs_cours_id_fkey"; columns: ["cours_id"]; isOneToOne: false; referencedRelation: "openlu_cours"; referencedColumns: ["id"] } ] };
      openlu_soumissions: { Row: Soumission; Insert: Partial<Soumission>; Update: Partial<Soumission>; Relationships: [ { foreignKeyName: "openlu_soumissions_devoir_id_fkey"; columns: ["devoir_id"]; isOneToOne: false; referencedRelation: "openlu_devoirs"; referencedColumns: ["id"] }, { foreignKeyName: "openlu_soumissions_etudiant_id_fkey"; columns: ["etudiant_id"]; isOneToOne: false; referencedRelation: "openlu_etudiants"; referencedColumns: ["id"] } ] };
      openlu_notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification>; Relationships: [ { foreignKeyName: "openlu_notifications_destinataire_id_fkey"; columns: ["destinataire_id"]; isOneToOne: false; referencedRelation: "openlu_profils"; referencedColumns: ["id"] } ] };
      openlu_transactions: { Row: Transaction; Insert: Partial<Transaction>; Update: Partial<Transaction>; Relationships: [ { foreignKeyName: "openlu_transactions_enregistre_par_fkey"; columns: ["enregistre_par"]; isOneToOne: false; referencedRelation: "openlu_profils"; referencedColumns: ["id"] } ] };
      openlu_abonnements_push: { Row: AbonnementPush; Insert: Partial<AbonnementPush>; Update: Partial<AbonnementPush>; Relationships: [ { foreignKeyName: "openlu_abonnements_push_utilisateur_id_fkey"; columns: ["utilisateur_id"]; isOneToOne: false; referencedRelation: "openlu_profils"; referencedColumns: ["id"] } ] };
    };
    Views: Record<string, never>;
    Functions: {
      openlu_obtenir_role: { Args: Record<string, never>; Returns: TypeRole };
      openlu_est_administrateur: { Args: Record<string, never>; Returns: boolean };
      openlu_est_enseignant: { Args: Record<string, never>; Returns: boolean };
      openlu_est_etudiant: { Args: Record<string, never>; Returns: boolean };
      openlu_est_reception: { Args: Record<string, never>; Returns: boolean };
      openlu_est_finance: { Args: Record<string, never>; Returns: boolean };
      openlu_est_administratif: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      openlu_type_role: { Enum: TypeRole };
      openlu_type_statut: { Enum: TypeStatut };
      openlu_type_niveau: { Enum: TypeNiveau };
      openlu_type_inscription_statut: { Enum: TypeInscriptionStatut };
      openlu_type_evaluation: { Enum: TypeEvaluation };
      openlu_type_methode_paiement: { Enum: TypeMethodePaiement };
      openlu_type_statut_paiement: { Enum: TypeStatutPaiement };
      openlu_type_statut_soumission: { Enum: TypeStatutSoumission };
      openlu_type_notification: { Enum: TypeNotification };
      openlu_type_transaction: { Enum: TypeTransaction };
      openlu_type_categorie_transaction: { Enum: TypeCategorieTransaction };
    };
  };
}