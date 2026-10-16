-- ============================================================
-- ACADEMIA · Nettoyage de l'ancienne base (schéma openlu_*)
-- Idempotent : supprime tous les objets de l'ancienne application
-- (tables, vues, fonctions, types, politiques RLS).
-- À exécuter EN PREMIER, avant les migrations 0001 → 0011.
-- ============================================================

-- Ancien trigger de création de profil sur auth.users
drop trigger if exists openlu_sur_nouvel_utilisateur on auth.users;

-- 1. Fonctions
do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'openlu\_%'
  loop
    execute format('drop function if exists public.%I(%s) cascade', r.proname, r.args);
  end loop;
end $$;

-- 2. Vues matérialisées
do $$
declare r record;
begin
  for r in
    select matviewname from pg_matviews
    where schemaname = 'public' and matviewname like 'openlu\_%'
  loop
    execute format('drop materialized view if exists public.%I cascade', r.matviewname);
  end loop;
end $$;

-- 3. Vues
do $$
declare r record;
begin
  for r in
    select viewname from pg_views
    where schemaname = 'public' and viewname like 'openlu\_%'
  loop
    execute format('drop view if exists public.%I cascade', r.viewname);
  end loop;
end $$;

-- 4. Politiques RLS des tables openlu_*
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename like 'openlu\_%'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 5. Politiques RLS storage liées aux buckets openlu_*
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'openlu\_%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- 6. Tables
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'openlu\_%'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end $$;

-- 7. Types énumérés
do $$
declare r record;
begin
  for r in
    select t.typname from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e' and t.typname like 'openlu\_%'
  loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;

-- NOTE : les buckets Storage de l'ancienne app (openlu_supports,
-- openlu_soumissions, openlu_annonces) ne peuvent PAS être supprimés par SQL :
-- Supabase interdit la suppression directe dans storage.buckets
-- (« Use the Storage API instead »). Les retirer via l'API Storage :
--   supabase.storage.from('openlu_supports').empty()  puis  .deleteBucket('openlu_supports')
-- ======================================================================
-- ============================================================
-- GESTION_UNIVERSITES · Base 1/6 — Entreprises, utilisateurs,
-- rôles et permissions
-- ============================================================
-- NOTE SUPABASE : le cluster Supabase n'autorise pas CREATE
-- DATABASE. La première ligne est commentée : tout s'exécute
-- dans la base du projet, tables créées dans le schéma public.
-- À coller APRÈS supabase/nettoyage_ancienne_base.sql
-- ============================================================

-- CREATE DATABASE gestion_universites;
-- Connecte-toi ensuite à cette base avant d'exécuter les autres commandes.

-- 2. Créer la table des entreprises et des succursales

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE entreprises (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    nom VARCHAR(200) NOT NULL,
    sigle VARCHAR(50),
    type_entreprise VARCHAR(50) DEFAULT 'UNIVERSITE',

    telephone VARCHAR(30),
    email VARCHAR(180),
    adresse TEXT,
    pays VARCHAR(100),
    province VARCHAR(100),
    ville VARCHAR(100),
    logo TEXT,

    est_mere BOOLEAN NOT NULL DEFAULT TRUE,

    entreprise_mere_id BIGINT
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (
            statut IN ('ACTIVE', 'SUSPENDUE', 'INACTIVE')
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CHECK (
        (est_mere = TRUE AND entreprise_mere_id IS NULL)
        OR
        (est_mere = FALSE AND entreprise_mere_id IS NOT NULL)
    )
);

CREATE INDEX idx_entreprises_mere
ON entreprises(entreprise_mere_id);

-- 3. Créer la table des utilisateurs

CREATE TABLE utilisateurs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    nom_complet VARCHAR(200) NOT NULL,
    nom_utilisateur VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(180),
    telephone VARCHAR(30),

    password_hash TEXT NOT NULL,

    est_admin_principal BOOLEAN NOT NULL DEFAULT FALSE,
    doit_changer_mot_de_passe BOOLEAN NOT NULL DEFAULT TRUE,

    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF'
        CHECK (
            statut IN ('ACTIF', 'INACTIF', 'SUSPENDU')
        ),

    derniere_connexion TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_admin_principal_entreprise
ON utilisateurs(entreprise_id)
WHERE est_admin_principal = TRUE
AND deleted_at IS NULL;

-- Le champ password_hash doit contenir le hash sécurisé du mot de passe,
-- jamais le mot de passe en clair.

-- 4. Créer les tables des rôles et permissions

CREATE TABLE roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entreprise_id BIGINT
        REFERENCES entreprises(id) ON DELETE CASCADE,

    code VARCHAR(80) NOT NULL,
    nom VARCHAR(120) NOT NULL,
    description TEXT,
    est_systeme BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE NULLS NOT DISTINCT (entreprise_id, code)
);

CREATE TABLE permissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(120) NOT NULL UNIQUE,
    module VARCHAR(80) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

CREATE TABLE role_permissions (
    role_id BIGINT NOT NULL
        REFERENCES roles(id) ON DELETE CASCADE,

    permission_id BIGINT NOT NULL
        REFERENCES permissions(id) ON DELETE CASCADE,

    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE utilisateur_roles (
    utilisateur_id BIGINT NOT NULL
        REFERENCES utilisateurs(id) ON DELETE CASCADE,

    role_id BIGINT NOT NULL
        REFERENCES roles(id) ON DELETE CASCADE,

    PRIMARY KEY (utilisateur_id, role_id)
);

-- 5. Créer les rôles de base

INSERT INTO roles (entreprise_id, code, nom, est_systeme)
VALUES
(NULL, 'SUPER_ADMIN', 'Super Administrateur', TRUE),
(NULL, 'ADMIN_PRINCIPAL', 'Administrateur principal', TRUE),
(NULL, 'ADMIN', 'Administrateur', TRUE),
(NULL, 'DIRECTEUR', 'Directeur', TRUE),
(NULL, 'AGENT_INSCRIPTION', 'Agent d inscription', TRUE),
(NULL, 'COMPTABLE', 'Comptable', TRUE),
(NULL, 'CAISSIER', 'Caissier', TRUE),
(NULL, 'SECRETAIRE_ACADEMIQUE', 'Secrétaire académique', TRUE),
(NULL, 'AUDITEUR', 'Auditeur', TRUE);
-- ======================================================================
-- ============================================================
-- GESTION_UNIVERSITES · Base 2/6 — Vie académique
-- Années académiques, facultés, domaines, promotions
-- ============================================================
-- Chaque établissement gère sa propre organisation : chaque table
-- porte entreprise_id (une succursale est une ligne de la table
-- entreprises, le périmètre est donc couvert).
-- ============================================================

-- --- Années académiques --------------------------------------

CREATE TABLE annees_academiques (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    libelle VARCHAR(20) NOT NULL,           -- ex. '2026-2027'
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,

    est_active BOOLEAN NOT NULL DEFAULT FALSE,
    statut VARCHAR(20) NOT NULL DEFAULT 'OUVERTE'
        CHECK (statut IN ('OUVERTE', 'CLOTUREE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CHECK (date_fin > date_debut)
);

CREATE UNIQUE INDEX uq_annee_libelle_entreprise
ON annees_academiques(entreprise_id, libelle)
WHERE deleted_at IS NULL;

-- Une seule année académique active à la fois par école
CREATE UNIQUE INDEX uq_annee_active_entreprise
ON annees_academiques(entreprise_id)
WHERE est_active = TRUE
AND deleted_at IS NULL;

CREATE INDEX idx_annees_entreprise
ON annees_academiques(entreprise_id);

-- --- Facultés ------------------------------------------------

CREATE TABLE facultes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    code VARCHAR(30) NOT NULL,
    nom VARCHAR(150) NOT NULL,
    description TEXT,
    ordre INTEGER NOT NULL DEFAULT 0,

    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (statut IN ('ACTIVE', 'INACTIVE', 'ARCHIVEE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_faculte_code_entreprise
ON facultes(entreprise_id, code)
WHERE deleted_at IS NULL;

CREATE INDEX idx_facultes_entreprise
ON facultes(entreprise_id);

-- --- Domaines d'études ---------------------------------------

CREATE TABLE domaines (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    faculte_id BIGINT NOT NULL
        REFERENCES facultes(id) ON DELETE RESTRICT,

    code VARCHAR(30) NOT NULL,
    nom VARCHAR(150) NOT NULL,
    description TEXT,

    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (statut IN ('ACTIVE', 'INACTIVE', 'ARCHIVEE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_domaine_code_entreprise
ON domaines(entreprise_id, code)
WHERE deleted_at IS NULL;

CREATE INDEX idx_domaines_faculte
ON domaines(faculte_id);

CREATE INDEX idx_domaines_entreprise
ON domaines(entreprise_id);

-- --- Promotions (niveaux d'études) ---------------------------

CREATE TABLE promotions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    faculte_id BIGINT NOT NULL
        REFERENCES facultes(id) ON DELETE RESTRICT,

    domaine_id BIGINT NOT NULL
        REFERENCES domaines(id) ON DELETE RESTRICT,

    code VARCHAR(30),
    nom VARCHAR(120) NOT NULL,              -- ex. 'Première année de licence'
    niveau VARCHAR(50),                     -- libre : L1, M2, 'Troisième année', ...
    ordre INTEGER NOT NULL DEFAULT 0,

    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (statut IN ('ACTIVE', 'INACTIVE', 'ARCHIVEE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_promotion_nom_domaine
ON promotions(domaine_id, nom)
WHERE deleted_at IS NULL;

CREATE INDEX idx_promotions_entreprise
ON promotions(entreprise_id);

CREATE INDEX idx_promotions_faculte
ON promotions(faculte_id);

CREATE INDEX idx_promotions_domaine
ON promotions(domaine_id);

-- --- Cohérence inter-étables (mêmes périmètres) --------------

CREATE OR REPLACE FUNCTION verifier_domaine_faculte()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_entreprise BIGINT;
BEGIN
    SELECT entreprise_id INTO v_entreprise
    FROM facultes
    WHERE id = NEW.faculte_id AND deleted_at IS NULL;

    IF v_entreprise IS NULL THEN
        RAISE EXCEPTION 'Faculté % introuvable ou archivée', NEW.faculte_id;
    END IF;

    IF v_entreprise <> NEW.entreprise_id THEN
        RAISE EXCEPTION 'La faculté % appartient à une autre entreprise', NEW.faculte_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verifier_domaine_faculte
BEFORE INSERT OR UPDATE ON domaines
FOR EACH ROW EXECUTE FUNCTION verifier_domaine_faculte();

CREATE OR REPLACE FUNCTION verifier_promotion_coherence()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_faculte_entreprise BIGINT;
    v_domaine_entreprise BIGINT;
    v_domaine_faculte BIGINT;
BEGIN
    SELECT entreprise_id, faculte_id INTO v_domaine_entreprise, v_domaine_faculte
    FROM domaines
    WHERE id = NEW.domaine_id AND deleted_at IS NULL;

    IF v_domaine_entreprise IS NULL THEN
        RAISE EXCEPTION 'Domaine % introuvable ou archivé', NEW.domaine_id;
    END IF;

    SELECT entreprise_id INTO v_faculte_entreprise
    FROM facultes
    WHERE id = NEW.faculte_id AND deleted_at IS NULL;

    IF v_faculte_entreprise IS NULL THEN
        RAISE EXCEPTION 'Faculté % introuvable ou archivée', NEW.faculte_id;
    END IF;

    IF v_domaine_entreprise <> NEW.entreprise_id
       OR v_faculte_entreprise <> NEW.entreprise_id THEN
        RAISE EXCEPTION 'Faculté ou domaine appartenant à une autre entreprise';
    END IF;

    IF v_domaine_faculte <> NEW.faculte_id THEN
        RAISE EXCEPTION 'Le domaine % n appartient pas à la faculté %',
            NEW.domaine_id, NEW.faculte_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verifier_promotion_coherence
BEFORE INSERT OR UPDATE ON promotions
FOR EACH ROW EXECUTE FUNCTION verifier_promotion_coherence();

-- --- Mise à jour automatique de updated_at -------------------

CREATE OR REPLACE FUNCTION maj_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_maj_annees_updated_at
BEFORE UPDATE ON annees_academiques
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_facultes_updated_at
BEFORE UPDATE ON facultes
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_domaines_updated_at
BEFORE UPDATE ON domaines
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_promotions_updated_at
BEFORE UPDATE ON promotions
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();
-- ======================================================================
-- ============================================================
-- GESTION_UNIVERSITES · Base 3/6 — Étudiants et inscriptions
-- ============================================================
-- Le dossier étudiant est indépendant de l'inscription : un étudiant
-- peut être enregistré avant toute affectation académique. Une même
-- personne se réinscrit chaque année sans nouveau dossier.

CREATE TABLE etudiants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    -- Compte de connexion optionnel (étudiants habilités à se connecter)
    utilisateur_id BIGINT
        REFERENCES utilisateurs(id) ON DELETE SET NULL,

    matricule VARCHAR(40) NOT NULL,

    nom VARCHAR(80) NOT NULL,
    postnom VARCHAR(80),
    prenom VARCHAR(80) NOT NULL,

    sexe VARCHAR(10) NOT NULL
        CHECK (sexe IN ('M', 'F')),

    date_naissance DATE,
    lieu_naissance VARCHAR(120),
    nationalite VARCHAR(80) DEFAULT 'Congolaise',

    adresse TEXT,
    telephone VARCHAR(30),
    email VARCHAR(180),

    nom_pere VARCHAR(120),
    nom_mere VARCHAR(120),
    nom_tuteur VARCHAR(120),
    telephone_tuteur VARCHAR(30),
    contact_urgence VARCHAR(120),

    photo TEXT,

    type_piece VARCHAR(30)
        CHECK (type_piece IN ('CNI', 'PASSEPORT', 'PAROISSE', 'AUTRE')),
    numero_piece VARCHAR(60),

    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF'
        CHECK (statut IN ('ACTIF', 'INACTIF', 'SUSPENDU', 'DIPLOME', 'REJETE', 'EN_ATTENTE')),

    observations TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_etudiant_matricule
ON etudiants(entreprise_id, matricule)
WHERE deleted_at IS NULL;

CREATE INDEX idx_etudiants_entreprise
ON etudiants(entreprise_id);

CREATE INDEX idx_etudiants_recherche
ON etudiants(entreprise_id, nom, postnom, prenom);

-- --- Inscriptions académiques --------------------------------

CREATE TABLE inscriptions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    etudiant_id BIGINT NOT NULL
        REFERENCES etudiants(id) ON DELETE RESTRICT,

    annee_academique_id BIGINT NOT NULL
        REFERENCES annees_academiques(id) ON DELETE RESTRICT,

    faculte_id BIGINT NOT NULL
        REFERENCES facultes(id) ON DELETE RESTRICT,

    domaine_id BIGINT NOT NULL
        REFERENCES domaines(id) ON DELETE RESTRICT,

    promotion_id BIGINT NOT NULL
        REFERENCES promotions(id) ON DELETE RESTRICT,

    numero_inscription VARCHAR(40) NOT NULL,
    date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,

    type_inscription VARCHAR(20) NOT NULL DEFAULT 'INITIALE'
        CHECK (type_inscription IN ('INITIALE', 'REINSCRIPTION')),

    statut VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE'
        CHECK (statut IN ('EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'ANNULEE')),

    validee_par BIGINT
        REFERENCES utilisateurs(id) ON DELETE SET NULL,
    validee_le TIMESTAMPTZ,

    enregistre_par BIGINT
        REFERENCES utilisateurs(id) ON DELETE SET NULL,

    observations TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Un étudiant ne peut être inscrit qu'une fois par périmètre
-- académique et par année (réinscription = nouvelle ligne, nouvelle année)
CREATE UNIQUE INDEX uq_inscription_doublon
ON inscriptions(etudiant_id, annee_academique_id, faculte_id, domaine_id, promotion_id)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX uq_inscription_numero
ON inscriptions(entreprise_id, numero_inscription)
WHERE deleted_at IS NULL;

CREATE INDEX idx_inscriptions_etudiant
ON inscriptions(etudiant_id);

CREATE INDEX idx_inscriptions_annee
ON inscriptions(annee_academique_id);

CREATE INDEX idx_inscriptions_promotion
ON inscriptions(promotion_id, statut);

CREATE INDEX idx_inscriptions_entreprise
ON inscriptions(entreprise_id);

-- --- Cohérence du périmètre ----------------------------------

CREATE OR REPLACE FUNCTION verifier_inscription()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_etudiant BIGINT;
    v_annee BIGINT;
    v_faculte BIGINT;
    v_domaine BIGINT;
    v_domaine_faculte BIGINT;
    v_promotion_entreprise BIGINT;
    v_promotion_domaine BIGINT;
    v_promotion_faculte BIGINT;
BEGIN
    SELECT entreprise_id INTO v_etudiant
    FROM etudiants WHERE id = NEW.etudiant_id AND deleted_at IS NULL;
    SELECT entreprise_id INTO v_annee
    FROM annees_academiques WHERE id = NEW.annee_academique_id AND deleted_at IS NULL;
    SELECT entreprise_id INTO v_faculte
    FROM facultes WHERE id = NEW.faculte_id AND deleted_at IS NULL;
    SELECT entreprise_id, faculte_id INTO v_domaine, v_domaine_faculte
    FROM domaines WHERE id = NEW.domaine_id AND deleted_at IS NULL;
    SELECT entreprise_id, domaine_id, faculte_id
        INTO v_promotion_entreprise, v_promotion_domaine, v_promotion_faculte
    FROM promotions WHERE id = NEW.promotion_id AND deleted_at IS NULL;

    IF v_etudiant IS NULL THEN
        RAISE EXCEPTION 'Étudiant % introuvable ou archivé', NEW.etudiant_id;
    END IF;
    IF v_annee IS NULL THEN
        RAISE EXCEPTION 'Année académique % introuvable ou archivée', NEW.annee_academique_id;
    END IF;
    IF v_faculte IS NULL OR v_domaine IS NULL OR v_promotion_entreprise IS NULL THEN
        RAISE EXCEPTION 'Faculté, domaine ou promotion introuvable(e)';
    END IF;

    IF v_etudiant <> NEW.entreprise_id
       OR v_annee <> NEW.entreprise_id
       OR v_faculte <> NEW.entreprise_id
       OR v_domaine <> NEW.entreprise_id
       OR v_promotion_entreprise <> NEW.entreprise_id THEN
        RAISE EXCEPTION 'Tous les éléments de l inscription doivent appartenir à la même entreprise';
    END IF;

    IF v_domaine_faculte <> NEW.faculte_id THEN
        RAISE EXCEPTION 'Le domaine % n appartient pas à la faculté %', NEW.domaine_id, NEW.faculte_id;
    END IF;

    IF v_promotion_domaine <> NEW.domaine_id OR v_promotion_faculte <> NEW.faculte_id THEN
        RAISE EXCEPTION 'La promotion % n appartient pas au domaine/faculté déclarés', NEW.promotion_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verifier_inscription
BEFORE INSERT OR UPDATE ON inscriptions
FOR EACH ROW EXECUTE FUNCTION verifier_inscription();

-- --- Génération automatique des dettes à la validation --------
-- Lorsqu une inscription passe à VALIDEE, les frais académiques
-- applicables (même entreprise, même année, faculté/domaine/promotion
-- compatibles) deviennent des dettes de l étudiant, sans doublon.

CREATE OR REPLACE FUNCTION generer_dettes_inscription()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.statut = 'VALIDEE' THEN
        INSERT INTO dettes (
            entreprise_id, etudiant_id, inscription_id,
            frais_academique_id, annee_academique_id,
            montant_initial, devise_id, date_echeance
        )
        SELECT
            f.entreprise_id, NEW.etudiant_id, NEW.id,
            f.id, f.annee_academique_id,
            f.montant, f.devise_id, f.date_limite
        FROM frais_academiques f
        WHERE f.entreprise_id = NEW.entreprise_id
          AND f.annee_academique_id = NEW.annee_academique_id
          AND f.statut = 'ACTIF'
          AND f.deleted_at IS NULL
          AND (f.faculte_id IS NULL OR f.faculte_id = NEW.faculte_id)
          AND (f.domaine_id IS NULL OR f.domaine_id = NEW.domaine_id)
          AND (f.promotion_id IS NULL OR f.promotion_id = NEW.promotion_id)
          AND NOT EXISTS (
                SELECT 1 FROM dettes d
                WHERE d.inscription_id = NEW.id
                  AND d.frais_academique_id = f.id
                  AND d.deleted_at IS NULL
          );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generer_dettes_inscription
AFTER UPDATE ON inscriptions
FOR EACH ROW
WHEN (NEW.statut = 'VALIDEE' AND OLD.statut IS DISTINCT FROM 'VALIDEE')
EXECUTE FUNCTION generer_dettes_inscription();

-- --- updated_at ------------------------------------------------

CREATE TRIGGER trg_maj_etudiants_updated_at
BEFORE UPDATE ON etudiants
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_inscriptions_updated_at
BEFORE UPDATE ON inscriptions
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();
-- ======================================================================
-- ============================================================
-- GESTION_UNIVERSITES · Base 4/6 — Devises et taux de change
-- ============================================================
-- Règle : une entreprise a un seul taux courant par paire de devises.
-- Le taux appliqué à chaque transaction est enregistré dans la
-- transaction : modifier le taux courant ne change jamais l historique.

CREATE TABLE devises (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    code VARCHAR(3) NOT NULL,               -- ISO : CDF, USD, EUR
    nom VARCHAR(60) NOT NULL,
    symbole VARCHAR(10),

    nb_decimales SMALLINT NOT NULL DEFAULT 2
        CHECK (nb_decimales BETWEEN 0 AND 4),

    est_reference BOOLEAN NOT NULL DEFAULT FALSE,

    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (statut IN ('ACTIVE', 'INACTIVE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_devise_code_entreprise
ON devises(entreprise_id, code)
WHERE deleted_at IS NULL;

-- Une seule devise de référence par entreprise
CREATE UNIQUE INDEX uq_devise_reference
ON devises(entreprise_id)
WHERE est_reference = TRUE
AND deleted_at IS NULL;

CREATE INDEX idx_devises_entreprise
ON devises(entreprise_id);

-- --- Taux de change -------------------------------------------

CREATE TABLE taux_changes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,

    devise_source_id BIGINT NOT NULL
        REFERENCES devises(id) ON DELETE RESTRICT,
    devise_cible_id BIGINT NOT NULL
        REFERENCES devises(id) ON DELETE RESTRICT,

    taux NUMERIC(18,6) NOT NULL
        CHECK (taux > 0),

    date_effet DATE NOT NULL DEFAULT CURRENT_DATE,

    est_courant BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (devise_source_id <> devise_cible_id)
);

-- Un seul taux courant par paire et par entreprise
CREATE UNIQUE INDEX uq_taux_courant
ON taux_changes(entreprise_id, devise_source_id, devise_cible_id)
WHERE est_courant = TRUE;

CREATE INDEX idx_taux_entreprise
ON taux_changes(entreprise_id);

-- Protection : suppression du taux courant autorisée seulement
-- tant qu'aucune opération financière n'y est liée (contrôlé aussi
-- côté applicatif) ; la suppression d un taux historique reste libre.
CREATE OR REPLACE FUNCTION verifier_suppression_taux()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.est_courant = TRUE THEN
        RAISE EXCEPTION 'Le taux courant ne peut pas être supprimé : modifiez-le plutôt (l historique des transactions reste inchangé)';
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_verifier_suppression_taux
BEFORE DELETE ON taux_changes
FOR EACH ROW EXECUTE FUNCTION verifier_suppression_taux();

CREATE TRIGGER trg_maj_devises_updated_at
BEFORE UPDATE ON devises
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_taux_updated_at
BEFORE UPDATE ON taux_changes
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();
-- ======================================================================
-- ============================================================
-- GESTION_UNIVERSITES · Base 5/6 — Frais académiques et dettes
-- ============================================================

CREATE TABLE frais_academiques (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    annee_academique_id BIGINT NOT NULL REFERENCES annees_academiques(id) ON DELETE RESTRICT,

    -- NULL = applicable à tout le périmètre de l année
    faculte_id BIGINT REFERENCES facultes(id) ON DELETE RESTRICT,
    domaine_id BIGINT REFERENCES domaines(id) ON DELETE RESTRICT,
    promotion_id BIGINT REFERENCES promotions(id) ON DELETE RESTRICT,

    libelle VARCHAR(150) NOT NULL,          -- ex. 'Frais d inscription'
    montant NUMERIC(18,2) NOT NULL CHECK (montant >= 0),
    devise_id BIGINT NOT NULL REFERENCES devises(id) ON DELETE RESTRICT,

    date_limite DATE,
    modalites TEXT,

    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF'
        CHECK (statut IN ('ACTIF', 'INACTIF')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_frais_entreprise ON frais_academiques(entreprise_id);
CREATE INDEX idx_frais_annee ON frais_academiques(annee_academique_id);

CREATE TABLE frais_tranches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    frais_academique_id BIGINT NOT NULL REFERENCES frais_academiques(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL CHECK (numero >= 1),
    libelle VARCHAR(120),
    pourcentage NUMERIC(6,3) NOT NULL CHECK (pourcentage > 0 AND pourcentage <= 100),
    date_limite DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (frais_academique_id, numero)
);

-- --- Dettes des étudiants -------------------------------------

CREATE TABLE dettes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    etudiant_id BIGINT NOT NULL REFERENCES etudiants(id) ON DELETE RESTRICT,
    inscription_id BIGINT NOT NULL REFERENCES inscriptions(id) ON DELETE RESTRICT,
    frais_academique_id BIGINT NOT NULL REFERENCES frais_academiques(id) ON DELETE RESTRICT,
    annee_academique_id BIGINT NOT NULL REFERENCES annees_academiques(id) ON DELETE RESTRICT,

    montant_initial NUMERIC(18,2) NOT NULL CHECK (montant_initial >= 0),
    montant_paye NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (montant_paye >= 0),
    solde NUMERIC(18,2) GENERATED ALWAYS AS (montant_initial - montant_paye) STORED,
    devise_id BIGINT NOT NULL REFERENCES devises(id) ON DELETE RESTRICT,

    date_echeance DATE,

    statut VARCHAR(20) NOT NULL DEFAULT 'IMPAYEE'
        CHECK (statut IN ('IMPAYEE', 'PARTIELLE', 'PAYEE', 'ANNULEE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CHECK (montant_paye <= montant_initial)
);

-- Anti-doublon : un seulè dette par frais et par inscription
CREATE UNIQUE INDEX uq_dette_frais_inscription
ON dettes(inscription_id, frais_academique_id)
WHERE deleted_at IS NULL;

CREATE INDEX idx_dettes_etudiant ON dettes(etudiant_id);
CREATE INDEX idx_dettes_entreprise ON dettes(entreprise_id, statut);
CREATE INDEX idx_dettes_annee ON dettes(annee_academique_id);

CREATE TRIGGER trg_maj_frais_updated_at
BEFORE UPDATE ON frais_academiques
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_dettes_updated_at
BEFORE UPDATE ON dettes
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();
-- ======================================================================
-- ============================================================
-- GESTION_UNIVERSITES · Base 6/6a — Caisses, paiements, mouvements
-- ============================================================

CREATE TABLE caisses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    code VARCHAR(30) NOT NULL,
    nom VARCHAR(120) NOT NULL,

    devise_id BIGINT NOT NULL REFERENCES devises(id) ON DELETE RESTRICT,
    caissier_id BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,

    solde_initial NUMERIC(18,2) NOT NULL DEFAULT 0,
    statut VARCHAR(20) NOT NULL DEFAULT 'FERMEE'
        CHECK (statut IN ('FERMEE', 'OUVERTE', 'SUSPENDUE')),

    ouverte_le TIMESTAMPTZ,
    fermee_le TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_caisse_code_entreprise
ON caisses(entreprise_id, code) WHERE deleted_at IS NULL;

CREATE INDEX idx_caisses_entreprise ON caisses(entreprise_id);

-- --- Paiements des étudiants ----------------------------------

CREATE TABLE paiements (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    etudiant_id BIGINT NOT NULL REFERENCES etudiants(id) ON DELETE RESTRICT,
    caisse_id BIGINT NOT NULL REFERENCES caisses(id) ON DELETE RESTRICT,

    numero_recu VARCHAR(40) NOT NULL,

    montant NUMERIC(18,2) NOT NULL CHECK (montant > 0),
    devise_id BIGINT NOT NULL REFERENCES devises(id) ON DELETE RESTRICT,
    -- Taux figé au moment du paiement : l historique ne change jamais
    taux_applique NUMERIC(18,6) CHECK (taux_applique IS NULL OR taux_applique > 0),
    montant_reference NUMERIC(18,2),        -- montant dans la devise de référence

    methode VARCHAR(30) NOT NULL DEFAULT 'ESPECES'
        CHECK (methode IN ('ESPECES', 'MOBILE_MONEY', 'CARTE_BANCAIRE', 'VIREMENT', 'CHEQUE', 'AUTRE')),
    reference_transaction VARCHAR(80),

    date_paiement TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    statut VARCHAR(20) NOT NULL DEFAULT 'VALIDE'
        CHECK (statut IN ('EN_ATTENTE', 'VALIDE', 'ANNULE', 'REMBOURSE')),

    enregistre_par BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    valide_par BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_paiement_recu
ON paiements(entreprise_id, numero_recu) WHERE deleted_at IS NULL;

CREATE INDEX idx_paiements_etudiant ON paiements(etudiant_id);
CREATE INDEX idx_paiements_entreprise ON paiements(entreprise_id, date_paiement);
CREATE INDEX idx_paiements_caisse ON paiements(caisse_id);

-- --- Affectation paiement → dettes ----------------------------

CREATE TABLE paiement_dettes (
    paiement_id BIGINT NOT NULL REFERENCES paiements(id) ON DELETE RESTRICT,
    dette_id BIGINT NOT NULL REFERENCES dettes(id) ON DELETE RESTRICT,
    montant NUMERIC(18,2) NOT NULL CHECK (montant > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (paiement_id, dette_id)
);

CREATE INDEX idx_paiement_dettes_dette ON paiement_dettes(dette_id);

-- Recalcule le montant payé et le statut de chaque dette touchée
CREATE OR REPLACE FUNCTION maj_dette_pour_paiement()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_dette BIGINT;
    v_total NUMERIC(18,2);
BEGIN
    v_dette := CASE WHEN TG_OP = 'DELETE' THEN OLD.dette_id ELSE NEW.dette_id END;

    SELECT COALESCE(SUM(pd.montant), 0) INTO v_total
    FROM paiement_dettes pd
    JOIN paiements p ON p.id = pd.paiement_id
    WHERE pd.dette_id = v_dette
      AND p.statut = 'VALIDE'
      AND p.deleted_at IS NULL;

    UPDATE dettes
    SET montant_paye = LEAST(v_total, montant_initial),
        statut = CASE
            WHEN statut = 'ANNULEE' THEN 'ANNULEE'
            WHEN v_total >= montant_initial THEN 'PAYEE'
            WHEN v_total > 0 THEN 'PARTIELLE'
            ELSE 'IMPAYEE'
        END
    WHERE id = v_dette;

    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_maj_dette_pour_paiement
AFTER INSERT OR UPDATE OR DELETE ON paiement_dettes
FOR EACH ROW EXECUTE FUNCTION maj_dette_pour_paiement();

-- --- Mouvements de caisse (entrées, sorties, transferts) ------

CREATE TABLE mouvements_caisse (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    caisse_id BIGINT NOT NULL REFERENCES caisses(id) ON DELETE RESTRICT,

    type VARCHAR(20) NOT NULL
        CHECK (type IN ('ENTREE', 'SORTIE', 'TRANSFERT', 'REMBOURSEMENT', 'CORRECTION')),
    numero_piece VARCHAR(40) NOT NULL,

    montant NUMERIC(18,2) NOT NULL CHECK (montant > 0),
    devise_id BIGINT NOT NULL REFERENCES devises(id) ON DELETE RESTRICT,

    motif TEXT NOT NULL,
    beneficiaire VARCHAR(150),
    categorie VARCHAR(80),
    reference VARCHAR(80),
    piece_justificative TEXT,

    -- Pour les transferts : caisse d'arrivée
    caisse_destination_id BIGINT REFERENCES caisses(id) ON DELETE RESTRICT,

    -- Lien vers le paiement étudiant si entrée de caisse associée
    paiement_id BIGINT REFERENCES paiements(id) ON DELETE RESTRICT,

    date_mouvement TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    statut VARCHAR(20) NOT NULL DEFAULT 'VALIDE'
        CHECK (statut IN ('EN_ATTENTE', 'VALIDE', 'ANNULE')),

    enregistre_par BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    valide_par BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CHECK (caisse_destination_id IS NULL OR caisse_destination_id <> caisse_id)
);

CREATE UNIQUE INDEX uq_mouvement_piece
ON mouvements_caisse(entreprise_id, numero_piece) WHERE deleted_at IS NULL;

CREATE INDEX idx_mouvements_caisse ON mouvements_caisse(caisse_id, date_mouvement);
CREATE INDEX idx_mouvements_entreprise ON mouvements_caisse(entreprise_id, date_mouvement);

-- Toute écriture de paiement/mouvement part dans le journal de caisse
-- automatiquement : table de traçabilité alimentée par les triggers.
CREATE TABLE journal_caisse (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    caisse_id BIGINT NOT NULL REFERENCES caisses(id) ON DELETE RESTRICT,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('PAIEMENT', 'MOUVEMENT')),
    source_id BIGINT NOT NULL,
    sens VARCHAR(10) NOT NULL CHECK (sens IN ('ENTREE', 'SORTIE')),
    montant NUMERIC(18,2) NOT NULL CHECK (montant > 0),
    devise_id BIGINT NOT NULL REFERENCES devises(id) ON DELETE RESTRICT,
    solde_apres NUMERIC(18,2),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_journal_caisse ON journal_caisse(caisse_id, cree_le);

CREATE TRIGGER trg_maj_caisses_updated_at
BEFORE UPDATE ON caisses
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_paiements_updated_at
BEFORE UPDATE ON paiements
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_mouvements_updated_at
BEFORE UPDATE ON mouvements_caisse
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();
-- ======================================================================
-- ============================================================
-- GESTION_UNIVERSITES · Base 7/8 — Comptabilité (SYSCOHADA)
-- ============================================================

CREATE TABLE comptes_comptables (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    code VARCHAR(20) NOT NULL,
    libelle VARCHAR(150) NOT NULL,
    classe SMALLINT NOT NULL CHECK (classe BETWEEN 1 AND 8),
    type_compte VARCHAR(20) NOT NULL
        CHECK (type_compte IN ('ACTIF', 'PASSIF', 'CHARGE', 'PRODUIT')),
    compte_parent_id BIGINT REFERENCES comptes_comptables(id) ON DELETE RESTRICT,
    est_synthetique BOOLEAN NOT NULL DEFAULT FALSE,
    statut VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'INACTIF')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_compte_code_entreprise
ON comptes_comptables(entreprise_id, code) WHERE deleted_at IS NULL;

CREATE INDEX idx_comptes_entreprise ON comptes_comptables(entreprise_id);

CREATE TABLE journaux (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    code VARCHAR(20) NOT NULL,
    nom VARCHAR(120) NOT NULL,
    type VARCHAR(30) NOT NULL
        CHECK (type IN ('CAISSE', 'BANQUE', 'ACHATS', 'VENTES', 'TRAVAUX', 'DIVERS')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_journal_code_entreprise
ON journaux(entreprise_id, code) WHERE deleted_at IS NULL;

CREATE TABLE ecritures (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    entreprise_id BIGINT NOT NULL REFERENCES entreprises(id) ON DELETE RESTRICT,
    journal_id BIGINT NOT NULL REFERENCES journaux(id) ON DELETE RESTRICT,
    numero VARCHAR(40) NOT NULL,
    date_ecriture DATE NOT NULL,
    libelle TEXT NOT NULL,
    piece_reference VARCHAR(80),
    statut VARCHAR(20) NOT NULL DEFAULT 'BROUILLON'
        CHECK (statut IN ('BROUILLON', 'VALIDEE', 'ANNULEE')),
    validee_par BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    validee_le TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_ecriture_numero_entreprise
ON ecritures(entreprise_id, numero) WHERE deleted_at IS NULL;

CREATE INDEX idx_ecritures_entreprise ON ecritures(entreprise_id, date_ecriture);
CREATE INDEX idx_ecritures_journal ON ecritures(journal_id, date_ecriture);

CREATE TABLE ecriture_lignes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ecriture_id BIGINT NOT NULL REFERENCES ecritures(id) ON DELETE CASCADE,
    compte_id BIGINT NOT NULL REFERENCES comptes_comptables(id) ON DELETE RESTRICT,
    debit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    libelle VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX idx_lignes_ecriture ON ecriture_lignes(ecriture_id);
CREATE INDEX idx_lignes_compte ON ecriture_lignes(compte_id);

-- Une écriture validée doit être équilibrée : Σ débits = Σ crédits
CREATE OR REPLACE FUNCTION verifier_equilibre_ecriture()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_total_debit NUMERIC(18,2);
    v_total_credit NUMERIC(18,2);
BEGIN
    IF NEW.statut = 'VALIDEE' THEN
        SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
            INTO v_total_debit, v_total_credit
        FROM ecriture_lignes
        WHERE ecriture_id = NEW.id;

        IF v_total_debit = 0 OR v_total_debit <> v_total_credit THEN
            RAISE EXCEPTION 'Écriture % non équilibrée : débits % ≠ crédits %',
                NEW.numero, v_total_debit, v_total_credit;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_verifier_equilibre_ecriture
BEFORE UPDATE OF statut ON ecritures
FOR EACH ROW EXECUTE FUNCTION verifier_equilibre_ecriture();

-- Une écriture validée ne peut plus être modifiée ni supprimée
CREATE OR REPLACE FUNCTION proteger_ecriture_validee()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.statut = 'VALIDEE' THEN
        RAISE EXCEPTION 'Écriture % validée : utilisez une annulation/contre-passation', OLD.numero;
    END IF;
    RETURN OLD;
END;
$$;

CREATE TRIGGER trg_proteger_ecriture_validee
BEFORE UPDATE OR DELETE ON ecritures
FOR EACH ROW EXECUTE FUNCTION proteger_ecriture_validee();

CREATE TRIGGER trg_maj_comptes_updated_at
BEFORE UPDATE ON comptes_comptables
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_journaux_updated_at
BEFORE UPDATE ON journaux
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

CREATE TRIGGER trg_maj_ecritures_updated_at
BEFORE UPDATE ON ecritures
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();
-- ======================================================================
-- ============================================================
-- GESTION_UNIVERSITES · Base 8/8 — Audit, permissions, corrections
-- Idempotent (réexécutable).
-- ============================================================

-- --- Journal d'audit ------------------------------------------

CREATE TABLE journal_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entreprise_id BIGINT REFERENCES entreprises(id) ON DELETE RESTRICT,
    utilisateur_id BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    table_concernee VARCHAR(80),
    enregistrement_id BIGINT,
    details JSONB,
    adresse_ip VARCHAR(45),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entreprise ON journal_audit(entreprise_id, cree_le DESC);
CREATE INDEX idx_audit_utilisateur ON journal_audit(utilisateur_id, cree_le DESC);

-- --- Rôles étudiants/enseignants (comptes optionnels) ---------

INSERT INTO roles (entreprise_id, code, nom, est_systeme)
VALUES
(NULL, 'ETUDIANT', 'Étudiant', TRUE),
(NULL, 'ENSEIGNANT', 'Enseignant', TRUE)
ON CONFLICT DO NOTHING;

-- --- Catalogue des permissions (module × action) --------------

INSERT INTO permissions (code, module, action, description)
SELECT m.module || '.' || a.action, m.module, a.action, m.module || ' : ' || a.action
FROM (VALUES
    ('PLATEFORME'), ('ENTREPRISE'), ('UTILISATEURS'), ('SUCCURSALES'), ('ROLES'),
    ('ACADEMIQUE'), ('ETUDIANTS'), ('INSCRIPTIONS'), ('MONNAIES'), ('FRAIS'),
    ('COMPTABILITE'), ('CAISSE'), ('RAPPORTS'), ('PARAMETRES'), ('AUDIT')
) AS m(module)
CROSS JOIN (VALUES
    ('CONSULTER'), ('CREER'), ('MODIFIER'), ('VALIDER'),
    ('ANNULER'), ('IMPRIMER'), ('EXPORTER'), ('SUPPRIMER')
) AS a(action)
ON CONFLICT (code) DO NOTHING;

-- --- Matrices de permissions des rôles système ----------------

CREATE OR REPLACE FUNCTION accorder_permissions(p_role VARCHAR, p_modules TEXT[], p_actions TEXT[])
RETURNS VOID LANGUAGE sql AS $$
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON p.module = ANY(p_modules) AND p.action = ANY(p_actions)
    WHERE r.est_systeme AND r.code = p_role AND r.entreprise_id IS NULL
    ON CONFLICT DO NOTHING;
$$;

SELECT accorder_permissions('SUPER_ADMIN',
    ARRAY['PLATEFORME','ENTREPRISE','UTILISATEURS','SUCCURSALES','ROLES','ACADEMIQUE','ETUDIANTS','INSCRIPTIONS','MONNAIES','FRAIS','COMPTABILITE','CAISSE','RAPPORTS','PARAMETRES','AUDIT'],
    ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER','SUPPRIMER']);

SELECT accorder_permissions('ADMIN_PRINCIPAL',
    ARRAY['ENTREPRISE','UTILISATEURS','SUCCURSALES','ROLES','ACADEMIQUE','ETUDIANTS','INSCRIPTIONS','MONNAIES','FRAIS','COMPTABILITE','CAISSE','RAPPORTS','PARAMETRES','AUDIT'],
    ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER','SUPPRIMER']);

SELECT accorder_permissions('ADMIN',
    ARRAY['ENTREPRISE'], ARRAY['CONSULTER','MODIFIER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['UTILISATEURS'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER','SUPPRIMER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['SUCCURSALES','ROLES'], ARRAY['CONSULTER','CREER','MODIFIER','SUPPRIMER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['ACADEMIQUE','ETUDIANTS','INSCRIPTIONS'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER','SUPPRIMER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['MONNAIES','FRAIS','COMPTABILITE'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['CAISSE'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['RAPPORTS','AUDIT'], ARRAY['CONSULTER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['PARAMETRES'], ARRAY['CONSULTER','MODIFIER']);

SELECT accorder_permissions('DIRECTEUR',
    ARRAY['ENTREPRISE','SUCCURSALES','UTILISATEURS','PARAMETRES'], ARRAY['CONSULTER']);
SELECT accorder_permissions('DIRECTEUR',
    ARRAY['ACADEMIQUE','INSCRIPTIONS'], ARRAY['CONSULTER','VALIDER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('DIRECTEUR',
    ARRAY['ETUDIANTS','FRAIS','COMPTABILITE','CAISSE','RAPPORTS','AUDIT'], ARRAY['CONSULTER','IMPRIMER','EXPORTER']);

SELECT accorder_permissions('AGENT_INSCRIPTION',
    ARRAY['ENTREPRISE','ACADEMIQUE'], ARRAY['CONSULTER']);
SELECT accorder_permissions('AGENT_INSCRIPTION',
    ARRAY['ETUDIANTS','INSCRIPTIONS'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('AGENT_INSCRIPTION',
    ARRAY['RAPPORTS'], ARRAY['CONSULTER','EXPORTER']);

SELECT accorder_permissions('COMPTABLE',
    ARRAY['ENTREPRISE','ACADEMIQUE','ETUDIANTS','INSCRIPTIONS'], ARRAY['CONSULTER']);
SELECT accorder_permissions('COMPTABLE',
    ARRAY['MONNAIES','FRAIS','COMPTABILITE'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('COMPTABLE',
    ARRAY['CAISSE'], ARRAY['CONSULTER','CREER','VALIDER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('COMPTABLE',
    ARRAY['RAPPORTS','AUDIT'], ARRAY['CONSULTER','IMPRIMER','EXPORTER']);

SELECT accorder_permissions('CAISSIER',
    ARRAY['ENTREPRISE','ETUDIANTS','INSCRIPTIONS','FRAIS'], ARRAY['CONSULTER']);
SELECT accorder_permissions('CAISSIER',
    ARRAY['CAISSE'], ARRAY['CONSULTER','CREER','VALIDER','IMPRIMER']);
SELECT accorder_permissions('CAISSIER',
    ARRAY['RAPPORTS'], ARRAY['CONSULTER','IMPRIMER']);

SELECT accorder_permissions('SECRETAIRE_ACADEMIQUE',
    ARRAY['ENTREPRISE','ACADEMIQUE'], ARRAY['CONSULTER']);
SELECT accorder_permissions('SECRETAIRE_ACADEMIQUE',
    ARRAY['ACADEMIQUE','ETUDIANTS','INSCRIPTIONS'], ARRAY['CONSULTER','CREER','MODIFIER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('SECRETAIRE_ACADEMIQUE',
    ARRAY['RAPPORTS'], ARRAY['CONSULTER','EXPORTER']);

SELECT accorder_permissions('AUDITEUR',
    ARRAY['ENTREPRISE','UTILISATEURS','SUCCURSALES','ROLES','ACADEMIQUE','ETUDIANTS','INSCRIPTIONS','MONNAIES','FRAIS','COMPTABILITE','CAISSE','RAPPORTS','PARAMETRES','AUDIT'],
    ARRAY['CONSULTER','EXPORTER']);

DROP FUNCTION accorder_permissions(VARCHAR, TEXT[], TEXT[]);

-- --- Corrections du lot 1 (idempotent) ------------------------

-- Protection des rôles système
CREATE OR REPLACE FUNCTION proteger_roles_systeme()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.est_systeme = TRUE AND TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'Le rôle système % ne peut pas être modifié ni supprimé', OLD.code;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_roles_systeme ON roles;
CREATE TRIGGER trg_proteger_roles_systeme
BEFORE UPDATE OR DELETE ON roles
FOR EACH ROW EXECUTE FUNCTION proteger_roles_systeme();

-- Anti-circulaire entre entreprises
CREATE OR REPLACE FUNCTION verifier_cycle_entreprise()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_parent BIGINT := NEW.entreprise_mere_id;
    v_compteur INTEGER := 0;
BEGIN
    WHILE v_parent IS NOT NULL LOOP
        IF v_parent = NEW.id THEN
            RAISE EXCEPTION 'Relation circulaire entre entreprises interdite';
        END IF;
        SELECT entreprise_mere_id INTO v_parent FROM entreprises WHERE id = v_parent;
        v_compteur := v_compteur + 1;
        IF v_compteur > 50 THEN
            RAISE EXCEPTION 'Chaîne d entreprises trop profonde';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verifier_cycle_entreprise ON entreprises;
CREATE TRIGGER trg_verifier_cycle_entreprise
BEFORE INSERT OR UPDATE ON entreprises
FOR EACH ROW EXECUTE FUNCTION verifier_cycle_entreprise();

-- updated_at manquants (lot 1)
DROP TRIGGER IF EXISTS trg_maj_entreprises_updated_at ON entreprises;
CREATE TRIGGER trg_maj_entreprises_updated_at
BEFORE UPDATE ON entreprises
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

DROP TRIGGER IF EXISTS trg_maj_utilisateurs_updated_at ON utilisateurs;
CREATE TRIGGER trg_maj_utilisateurs_updated_at
BEFORE UPDATE ON utilisateurs
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

DROP TRIGGER IF EXISTS trg_maj_roles_updated_at ON roles;
CREATE TRIGGER trg_maj_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

-- Index manquants
CREATE INDEX IF NOT EXISTS idx_utilisateurs_entreprise ON utilisateurs(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_utilisateur_roles_role ON utilisateur_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ============================================================
-- GESTION_UNIVERSITES · Base 9/8+ — Compléments fonctionnels
-- Idempotent (réexécutable).
--   · Accès utilisateurs ↔ succursales
--   · Sessions de caisse (ouverture / clôture / écarts)
--   · Remises/réductions sur dettes (traçables)
--   · Liens comptables paiement/mouvement → écriture
--   · Réinitialisation de mot de passe
--   · Compteurs de numérotation par entreprise
--   · Buckets de stockage (logos, photos, pièces justificatives)
-- À exécuter APRÈS les migrations 0001 → 0008.
-- ============================================================

-- --- Accès utilisateurs ↔ succursales -------------------------
-- Une succursale est une ligne de la table entreprises (est_mere = false).
-- Cette table indique à quelles succursales un utilisateur a accès.

CREATE TABLE IF NOT EXISTS utilisateur_succursales (
    utilisateur_id BIGINT NOT NULL
        REFERENCES utilisateurs(id) ON DELETE CASCADE,
    succursale_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (utilisateur_id, succursale_id)
);

CREATE INDEX IF NOT EXISTS idx_utilisateur_succursales_succ
ON utilisateur_succursales(succursale_id);

-- --- Compteurs de numérotation --------------------------------
-- Génère des numéros uniques par entreprise (reçus, inscriptions,
-- pièces de caisse, écritures) de manière atomique.

CREATE TABLE IF NOT EXISTS sequences_documents (
    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE CASCADE,
    cle VARCHAR(60) NOT NULL,
    prefixe VARCHAR(20) NOT NULL DEFAULT '',
    annee INTEGER,
    dernier_numero BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (entreprise_id, cle)
);

CREATE OR REPLACE FUNCTION prochain_numero(
    p_entreprise BIGINT,
    p_cle VARCHAR,
    p_prefixe VARCHAR DEFAULT '',
    p_annee INTEGER DEFAULT NULL,
    p_largeur INTEGER DEFAULT 5
) RETURNS VARCHAR
LANGUAGE plpgsql AS $$
DECLARE
    v_num BIGINT;
    v_prefixe VARCHAR;
BEGIN
    INSERT INTO sequences_documents (entreprise_id, cle, prefixe, annee, dernier_numero)
    VALUES (p_entreprise, p_cle, COALESCE(p_prefixe, ''), p_annee, 1)
    ON CONFLICT (entreprise_id, cle)
    DO UPDATE SET
        dernier_numero = sequences_documents.dernier_numero + 1,
        prefixe = COALESCE(p_prefixe, sequences_documents.prefixe),
        annee = p_annee,
        updated_at = NOW()
    RETURNING dernier_numero, prefixe INTO v_num, v_prefixe;

    RETURN v_prefixe
        || CASE WHEN p_annee IS NOT NULL THEN p_annee::text || '-' ELSE '' END
        || lpad(v_num::text, GREATEST(p_largeur, 1), '0');
END;
$$;

-- --- Remises / réductions sur dettes -------------------------

CREATE TABLE IF NOT EXISTS remises_dettes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,
    dette_id BIGINT NOT NULL
        REFERENCES dettes(id) ON DELETE CASCADE,
    montant NUMERIC(18,2) NOT NULL CHECK (montant > 0),
    motif TEXT,
    accordee_par BIGINT
        REFERENCES utilisateurs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remises_dette ON remises_dettes(dette_id);
CREATE INDEX IF NOT EXISTS idx_remises_entreprise ON remises_dettes(entreprise_id);

-- Colonne de cumul des remises sur la dette
ALTER TABLE dettes
    ADD COLUMN IF NOT EXISTS montant_reduction NUMERIC(18,2) NOT NULL DEFAULT 0;

-- Recalcule le solde généré en tenant compte des remises
ALTER TABLE dettes DROP COLUMN IF EXISTS solde;
ALTER TABLE dettes
    ADD COLUMN solde NUMERIC(18,2)
    GENERATED ALWAYS AS (montant_initial - montant_reduction - montant_paye) STORED;

-- Remplace la contrainte montants (montant_paye <= montant_initial)
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'dettes'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%montant_paye <= montant_initial%'
    LOOP
        EXECUTE format('ALTER TABLE dettes DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE dettes DROP CONSTRAINT IF EXISTS dettes_montants_coherents;
ALTER TABLE dettes
    ADD CONSTRAINT dettes_montants_coherents
    CHECK (montant_paye + montant_reduction <= montant_initial);

ALTER TABLE dettes DROP CONSTRAINT IF EXISTS dettes_montant_reduction_positif;
ALTER TABLE dettes
    ADD CONSTRAINT dettes_montant_reduction_positif
    CHECK (montant_reduction >= 0);

-- Fonction unique de recalcul d'une dette
CREATE OR REPLACE FUNCTION recalculer_dette(p_dette BIGINT)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_initial NUMERIC(18,2);
    v_statut VARCHAR(20);
    v_reduction NUMERIC(18,2);
    v_paye NUMERIC(18,2);
BEGIN
    SELECT montant_initial, statut
        INTO v_initial, v_statut
    FROM dettes WHERE id = p_dette;

    IF v_initial IS NULL THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(montant), 0) INTO v_reduction
    FROM remises_dettes WHERE dette_id = p_dette;

    SELECT COALESCE(SUM(pd.montant), 0) INTO v_paye
    FROM paiement_dettes pd
    JOIN paiements p ON p.id = pd.paiement_id
    WHERE pd.dette_id = p_dette
      AND p.statut = 'VALIDE'
      AND p.deleted_at IS NULL;

    IF v_paye + v_reduction > v_initial THEN
        v_reduction := GREATEST(v_initial - v_paye, 0);
    END IF;

    UPDATE dettes
    SET montant_reduction = v_reduction,
        montant_paye = LEAST(v_paye, v_initial),
        statut = CASE
            WHEN v_statut = 'ANNULEE' THEN 'ANNULEE'
            WHEN v_paye + v_reduction >= v_initial THEN 'PAYEE'
            WHEN v_paye > 0 OR v_reduction > 0 THEN 'PARTIELLE'
            ELSE 'IMPAYEE'
        END
    WHERE id = p_dette;
END;
$$;

-- Trigger paiements → recalcul dette
CREATE OR REPLACE FUNCTION maj_dette_pour_paiement()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculer_dette(OLD.dette_id);
    ELSE
        PERFORM recalculer_dette(NEW.dette_id);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_maj_dette_pour_paiement ON paiement_dettes;
CREATE TRIGGER trg_maj_dette_pour_paiement
AFTER INSERT OR UPDATE OR DELETE ON paiement_dettes
FOR EACH ROW EXECUTE FUNCTION maj_dette_pour_paiement();

-- Trigger remises → recalcul dette
CREATE OR REPLACE FUNCTION maj_dette_pour_remise()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculer_dette(OLD.dette_id);
    ELSE
        PERFORM recalculer_dette(NEW.dette_id);
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_maj_dette_pour_remise ON remises_dettes;
CREATE TRIGGER trg_maj_dette_pour_remise
AFTER INSERT OR UPDATE OR DELETE ON remises_dettes
FOR EACH ROW EXECUTE FUNCTION maj_dette_pour_remise();

-- --- Sessions de caisse ---------------------------------------

CREATE TABLE IF NOT EXISTS sessions_caisse (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    entreprise_id BIGINT NOT NULL
        REFERENCES entreprises(id) ON DELETE RESTRICT,
    caisse_id BIGINT NOT NULL
        REFERENCES caisses(id) ON DELETE RESTRICT,
    caissier_id BIGINT
        REFERENCES utilisateurs(id) ON DELETE SET NULL,

    fonds_initial NUMERIC(18,2) NOT NULL DEFAULT 0,

    ouverte_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cloturee_le TIMESTAMPTZ,

    total_entrees NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_sorties NUMERIC(18,2) NOT NULL DEFAULT 0,
    solde_theorique NUMERIC(18,2),
    montant_compte NUMERIC(18,2),
    ecart NUMERIC(18,2),

    observations TEXT,

    statut VARCHAR(20) NOT NULL DEFAULT 'OUVERTE'
        CHECK (statut IN ('OUVERTE', 'CLOTUREE')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Une seule session ouverte par caisse
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_caisse_ouverte
ON sessions_caisse(caisse_id) WHERE statut = 'OUVERTE';

CREATE INDEX IF NOT EXISTS idx_sessions_caisse
ON sessions_caisse(caisse_id, ouverte_le DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_entreprise
ON sessions_caisse(entreprise_id, ouverte_le DESC);

-- Rattachement des opérations à la session de caisse
ALTER TABLE paiements
    ADD COLUMN IF NOT EXISTS session_caisse_id BIGINT
        REFERENCES sessions_caisse(id) ON DELETE SET NULL;

ALTER TABLE mouvements_caisse
    ADD COLUMN IF NOT EXISTS session_caisse_id BIGINT
        REFERENCES sessions_caisse(id) ON DELETE SET NULL;

-- --- Liens comptables -----------------------------------------

ALTER TABLE paiements
    ADD COLUMN IF NOT EXISTS ecriture_id BIGINT
        REFERENCES ecritures(id) ON DELETE SET NULL;

ALTER TABLE mouvements_caisse
    ADD COLUMN IF NOT EXISTS ecriture_id BIGINT
        REFERENCES ecritures(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_paiements_ecriture ON paiements(ecriture_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_ecriture ON mouvements_caisse(ecriture_id);

-- --- Réinitialisation de mot de passe -------------------------

CREATE TABLE IF NOT EXISTS reinitialisations_mot_de_passe (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL
        REFERENCES utilisateurs(id) ON DELETE CASCADE,
    jeton_hash TEXT NOT NULL,
    expire_le TIMESTAMPTZ NOT NULL,
    utilise_le TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reinit_jeton
ON reinitialisations_mot_de_passe(jeton_hash);

CREATE INDEX IF NOT EXISTS idx_reinit_utilisateur
ON reinitialisations_mot_de_passe(utilisateur_id);

-- --- Buckets de stockage --------------------------------------
-- Créés via SQL dans Supabase (storage.buckets). Les politiques
-- d'accès sont définies dans la migration 0010.

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('logos', 'logos', TRUE),
    ('photos-etudiants', 'photos-etudiants', FALSE),
    ('pieces-justificatives', 'pieces-justificatives', FALSE),
    ('documents', 'documents', FALSE)
ON CONFLICT (id) DO NOTHING;

-- --- updated_at manquants -------------------------------------

DROP TRIGGER IF EXISTS trg_maj_sessions_caisse_updated_at ON sessions_caisse;
CREATE TRIGGER trg_maj_sessions_caisse_updated_at
BEFORE UPDATE ON sessions_caisse
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();


-- ============================================================
-- GESTION_UNIVERSITES · Base 10 — RLS, journal de caisse, vues
-- Idempotent (réexécutable).
-- ============================================================
-- NOTE SÉCURITÉ
-- L'application accède à la base via la clé `service_role`
-- (voir src/bibliotheque/bd.ts) qui CONTOURNE la RLS. La RLS
-- ci-dessous est une défense en profondeur : elle empêche toute
-- lecture/écriture directe via la clé `anon`/`authenticated`
-- (aucune politique n'est créée ⇒ accès refusé par défaut).
-- L'isolation multi-tenant réelle est assurée côté serveur par
-- le helper de scoping (src/bibliotheque/portee.ts).
-- ============================================================

-- --- Activation RLS sur toutes les tables applicatives --------

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'entreprises','utilisateurs','roles','permissions','role_permissions',
        'utilisateur_roles','journal_audit','annees_academiques','facultes',
        'domaines','promotions','etudiants','inscriptions','devises','taux_changes',
        'frais_academiques','frais_tranches','dettes','caisses','paiements',
        'paiement_dettes','mouvements_caisse','journal_caisse','comptes_comptables',
        'journaux','ecritures','ecriture_lignes','utilisateur_succursales',
        'sequences_documents','remises_dettes','sessions_caisse',
        'reinitialisations_mot_de_passe'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
        END IF;
    END LOOP;
END $$;

-- --- Journal de caisse : alimentation automatique -------------
-- Chaque paiement / mouvement validé génère une ligne de journal.

CREATE OR REPLACE FUNCTION journaliser_paiement()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM journal_caisse
        WHERE source_type = 'PAIEMENT' AND source_id = OLD.id;
        RETURN OLD;
    END IF;

    DELETE FROM journal_caisse
    WHERE source_type = 'PAIEMENT' AND source_id = NEW.id;

    IF NEW.statut = 'VALIDE' AND NEW.deleted_at IS NULL THEN
        INSERT INTO journal_caisse (
            entreprise_id, caisse_id, source_type, source_id,
            sens, montant, devise_id
        )
        VALUES (
            NEW.entreprise_id, NEW.caisse_id, 'PAIEMENT', NEW.id,
            'ENTREE', NEW.montant, NEW.devise_id
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journaliser_paiement ON paiements;
CREATE TRIGGER trg_journaliser_paiement
AFTER INSERT OR UPDATE OR DELETE ON paiements
FOR EACH ROW EXECUTE FUNCTION journaliser_paiement();

CREATE OR REPLACE FUNCTION journaliser_mouvement()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_sens VARCHAR(10);
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM journal_caisse
        WHERE source_type = 'MOUVEMENT' AND source_id = OLD.id;
        RETURN OLD;
    END IF;

    DELETE FROM journal_caisse
    WHERE source_type = 'MOUVEMENT' AND source_id = NEW.id;

    IF NEW.statut = 'VALIDE' AND NEW.deleted_at IS NULL THEN
        -- Sens principal du mouvement sur sa caisse d'origine
        v_sens := CASE
            WHEN NEW.type IN ('ENTREE') THEN 'ENTREE'
            ELSE 'SORTIE'
        END;

        INSERT INTO journal_caisse (
            entreprise_id, caisse_id, source_type, source_id,
            sens, montant, devise_id
        )
        VALUES (
            NEW.entreprise_id, NEW.caisse_id, 'MOUVEMENT', NEW.id,
            v_sens, NEW.montant, NEW.devise_id
        );

        -- Un transfert crédite aussi la caisse de destination
        IF NEW.type = 'TRANSFERT' AND NEW.caisse_destination_id IS NOT NULL THEN
            INSERT INTO journal_caisse (
                entreprise_id, caisse_id, source_type, source_id,
                sens, montant, devise_id
            )
            VALUES (
                NEW.entreprise_id, NEW.caisse_destination_id, 'MOUVEMENT', NEW.id,
                'ENTREE', NEW.montant, NEW.devise_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journaliser_mouvement ON mouvements_caisse;
CREATE TRIGGER trg_journaliser_mouvement
AFTER INSERT OR UPDATE OR DELETE ON mouvements_caisse
FOR EACH ROW EXECUTE FUNCTION journaliser_mouvement();

-- --- Vues consolidées -----------------------------------------

-- Solde courant de chaque caisse
CREATE OR REPLACE VIEW vue_solde_caisse AS
SELECT
    c.id AS caisse_id,
    c.entreprise_id,
    c.code,
    c.nom,
    c.devise_id,
    c.statut,
    c.solde_initial
        + COALESCE((
            SELECT SUM(p.montant) FROM paiements p
            WHERE p.caisse_id = c.id AND p.statut = 'VALIDE' AND p.deleted_at IS NULL
        ), 0)
        + COALESCE((
            SELECT SUM(m.montant) FROM mouvements_caisse m
            WHERE m.statut = 'VALIDE' AND m.deleted_at IS NULL
              AND m.type = 'ENTREE' AND m.caisse_id = c.id
        ), 0)
        + COALESCE((
            SELECT SUM(m.montant) FROM mouvements_caisse m
            WHERE m.statut = 'VALIDE' AND m.deleted_at IS NULL
              AND m.type = 'TRANSFERT' AND m.caisse_destination_id = c.id
        ), 0)
        - COALESCE((
            SELECT SUM(m.montant) FROM mouvements_caisse m
            WHERE m.statut = 'VALIDE' AND m.deleted_at IS NULL
              AND m.type IN ('SORTIE', 'REMBOURSEMENT') AND m.caisse_id = c.id
        ), 0)
        - COALESCE((
            SELECT SUM(m.montant) FROM mouvements_caisse m
            WHERE m.statut = 'VALIDE' AND m.deleted_at IS NULL
              AND m.type = 'TRANSFERT' AND m.caisse_id = c.id
        ), 0)
        AS solde_courant
FROM caisses c
WHERE c.deleted_at IS NULL;

-- Situation financière par étudiant
CREATE OR REPLACE VIEW vue_situation_etudiants AS
SELECT
    e.id AS etudiant_id,
    e.entreprise_id,
    e.matricule,
    e.nom,
    e.postnom,
    e.prenom,
    COALESCE(SUM(d.montant_initial), 0)   AS total_du,
    COALESCE(SUM(d.montant_reduction), 0) AS total_reduction,
    COALESCE(SUM(d.montant_paye), 0)      AS total_paye,
    COALESCE(SUM(d.solde), 0)             AS total_solde
FROM etudiants e
LEFT JOIN dettes d
    ON d.etudiant_id = e.id
   AND d.deleted_at IS NULL
   AND d.statut <> 'ANNULEE'
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.entreprise_id, e.matricule, e.nom, e.postnom, e.prenom;

-- Situation des dettes par entreprise / statut
CREATE OR REPLACE VIEW vue_dettes_entreprise AS
SELECT
    d.entreprise_id,
    d.annee_academique_id,
    d.statut,
    COUNT(*)                         AS nombre,
    COALESCE(SUM(d.montant_initial), 0)   AS total_initial,
    COALESCE(SUM(d.montant_reduction), 0) AS total_reduction,
    COALESCE(SUM(d.montant_paye), 0)      AS total_paye,
    COALESCE(SUM(d.solde), 0)             AS total_solde
FROM dettes d
WHERE d.deleted_at IS NULL
GROUP BY d.entreprise_id, d.annee_academique_id, d.statut;

-- --- Permissions sur les vues ---------------------------------

DO $$
DECLARE
    v text;
BEGIN
    FOREACH v IN ARRAY ARRAY['vue_solde_caisse','vue_situation_etudiants','vue_dettes_entreprise']
    LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', v);
    END LOOP;
END $$;

-- --- Storage : politiques des buckets -------------------------
-- Le bucket public `logos` est lisible publiquement (URL publique).
-- Les buckets privés ne sont accessibles que via service_role.

DROP POLICY IF EXISTS "logos_lecture_publique" ON storage.objects;
CREATE POLICY "logos_lecture_publique"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');


-- ============================================================
-- GESTION_UNIVERSITES · Base 11 — Super administrateur initial
-- Idempotent : crée l'entreprise plateforme et le super admin
-- par défaut uniquement s'ils n'existent pas encore.
-- À exécuter APRÈS les migrations 0001 → 0010.
-- ============================================================
-- Identifiants de connexion :
--   Établissement : ACADEMIA
--   Identifiant   : Admin@gmail.com
--   Mot de passe  : 12345678
-- (à changer après la première connexion)
-- ============================================================

-- 1. Entreprise plateforme (une seule)
INSERT INTO entreprises (nom, sigle, type_entreprise, statut, est_mere)
SELECT 'Plateforme Academia', 'ACADEMIA', 'PLATEFORME', 'ACTIVE', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM entreprises
    WHERE type_entreprise = 'PLATEFORME' AND deleted_at IS NULL
);

-- 2. Utilisateur super admin
INSERT INTO utilisateurs (
    entreprise_id, nom_complet, nom_utilisateur, email,
    password_hash, est_admin_principal, doit_changer_mot_de_passe, statut
)
SELECT
    e.id,
    'Super Administrateur',
    'Admin@gmail.com',
    'admin@gmail.com',
    '$2b$12$LOiQoNaVAfQ/i3orqt6haObqPy0l3f6mvCbaTSv.2C0fEVaQqerCC',
    FALSE,
    FALSE,
    'ACTIF'
FROM entreprises e
WHERE e.type_entreprise = 'PLATEFORME'
  AND e.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE lower(u.nom_utilisateur) = lower('Admin@gmail.com')
  );

-- 3. Attribution du rôle SUPER_ADMIN
INSERT INTO utilisateur_roles (utilisateur_id, role_id)
SELECT u.id, r.id
FROM utilisateurs u
JOIN entreprises e ON e.id = u.entreprise_id
JOIN roles r ON r.code = 'SUPER_ADMIN' AND r.entreprise_id IS NULL
WHERE e.type_entreprise = 'PLATEFORME'
  AND e.deleted_at IS NULL
  AND lower(u.nom_utilisateur) = lower('Admin@gmail.com')
ON CONFLICT (utilisateur_id, role_id) DO NOTHING;
