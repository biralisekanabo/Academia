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
