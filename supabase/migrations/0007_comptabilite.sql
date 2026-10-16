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
