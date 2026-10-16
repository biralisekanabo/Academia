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
