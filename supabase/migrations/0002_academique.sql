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
