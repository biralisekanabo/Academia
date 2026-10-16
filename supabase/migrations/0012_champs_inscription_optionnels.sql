-- ============================================================
-- GESTION_UNIVERSITES · Base 12 — Champs d'inscription optionnels
-- Rend facultatives les colonnes académiques d'une inscription
-- (année, faculté, domaine, promotion). L'étudiant reste requis.
-- Idempotent : à exécuter APRÈS les migrations 0001 → 0011.
-- ============================================================

ALTER TABLE inscriptions ALTER COLUMN annee_academique_id DROP NOT NULL;
ALTER TABLE inscriptions ALTER COLUMN faculte_id DROP NOT NULL;
ALTER TABLE inscriptions ALTER COLUMN domaine_id DROP NOT NULL;
ALTER TABLE inscriptions ALTER COLUMN promotion_id DROP NOT NULL;
