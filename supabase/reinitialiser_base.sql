-- ============================================================
-- ACADEMIA · Réinitialisation de la base (schéma public)
-- ATTENTION : supprime TOUTES les données de l'application
-- (entreprises, utilisateurs, étudiants, finances, comptabilité...).
-- À exécuter UNIQUEMENT lors d'une remise à zéro / d'un setup.
-- Permet ensuite de relancer `gestion_universites_complet.sql`
-- sur une base propre.
-- Idempotent : réexécutable sans erreur.
-- ============================================================

-- 1. Vues consolidées
DROP VIEW IF EXISTS vue_solde_caisse CASCADE;
DROP VIEW IF EXISTS vue_situation_etudiants CASCADE;
DROP VIEW IF EXISTS vue_dettes_entreprise CASCADE;

-- 2. Tables applicatives (CASCADE : index, triggers, contraintes, FK)
DROP TABLE IF EXISTS reinitialisations_mot_de_passe CASCADE;
DROP TABLE IF EXISTS sequences_documents CASCADE;
DROP TABLE IF EXISTS utilisateur_succursales CASCADE;
DROP TABLE IF EXISTS remises_dettes CASCADE;
DROP TABLE IF EXISTS sessions_caisse CASCADE;
DROP TABLE IF EXISTS journal_caisse CASCADE;
DROP TABLE IF EXISTS paiement_dettes CASCADE;
DROP TABLE IF EXISTS paiements CASCADE;
DROP TABLE IF EXISTS mouvements_caisse CASCADE;
DROP TABLE IF EXISTS caisses CASCADE;
DROP TABLE IF EXISTS ecriture_lignes CASCADE;
DROP TABLE IF EXISTS ecritures CASCADE;
DROP TABLE IF EXISTS journaux CASCADE;
DROP TABLE IF EXISTS comptes_comptables CASCADE;
DROP TABLE IF EXISTS frais_tranches CASCADE;
DROP TABLE IF EXISTS dettes CASCADE;
DROP TABLE IF EXISTS frais_academiques CASCADE;
DROP TABLE IF EXISTS taux_changes CASCADE;
DROP TABLE IF EXISTS devises CASCADE;
DROP TABLE IF EXISTS inscriptions CASCADE;
DROP TABLE IF EXISTS etudiants CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS domaines CASCADE;
DROP TABLE IF EXISTS facultes CASCADE;
DROP TABLE IF EXISTS annees_academiques CASCADE;
DROP TABLE IF EXISTS journal_audit CASCADE;
DROP TABLE IF EXISTS utilisateur_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS utilisateurs CASCADE;
DROP TABLE IF EXISTS entreprises CASCADE;

-- 3. Fonctions métier (au cas où un corps/fonction serait resté)
DROP FUNCTION IF EXISTS journaliser_paiement() CASCADE;
DROP FUNCTION IF EXISTS journaliser_mouvement() CASCADE;
DROP FUNCTION IF EXISTS prochain_numero(BIGINT, VARCHAR, VARCHAR, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS recalculer_dette(BIGINT) CASCADE;
DROP FUNCTION IF EXISTS maj_dette_pour_paiement() CASCADE;
DROP FUNCTION IF EXISTS maj_dette_pour_remise() CASCADE;
DROP FUNCTION IF EXISTS verifier_equilibre_ecriture() CASCADE;
DROP FUNCTION IF EXISTS proteger_ecriture_validee() CASCADE;
DROP FUNCTION IF EXISTS verifier_domaine_faculte() CASCADE;
DROP FUNCTION IF EXISTS verifier_promotion_coherence() CASCADE;
DROP FUNCTION IF EXISTS verifier_inscription() CASCADE;
DROP FUNCTION IF EXISTS generer_dettes_inscription() CASCADE;
DROP FUNCTION IF EXISTS verifier_suppression_taux() CASCADE;
DROP FUNCTION IF EXISTS proteger_roles_systeme() CASCADE;
DROP FUNCTION IF EXISTS verifier_cycle_entreprise() CASCADE;
DROP FUNCTION IF EXISTS verifier_mouvement_caisse() CASCADE;
DROP FUNCTION IF EXISTS maj_updated_at() CASCADE;

-- NOTE : les buckets Storage (logos, photos-etudiants,
-- pieces-justificatives, documents) et leurs objets NE sont PAS
-- supprimés ici. Les retirer via l'API Storage si nécessaire.
