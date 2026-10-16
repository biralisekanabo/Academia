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
