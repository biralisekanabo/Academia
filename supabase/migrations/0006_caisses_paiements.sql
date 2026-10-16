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
