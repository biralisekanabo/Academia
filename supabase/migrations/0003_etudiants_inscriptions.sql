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
