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
