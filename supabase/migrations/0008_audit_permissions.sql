-- ============================================================
-- GESTION_UNIVERSITES · Base 8/8 — Audit, permissions, corrections
-- Idempotent (réexécutable).
-- ============================================================

-- --- Journal d'audit ------------------------------------------

CREATE TABLE journal_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entreprise_id BIGINT REFERENCES entreprises(id) ON DELETE RESTRICT,
    utilisateur_id BIGINT REFERENCES utilisateurs(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    table_concernee VARCHAR(80),
    enregistrement_id BIGINT,
    details JSONB,
    adresse_ip VARCHAR(45),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entreprise ON journal_audit(entreprise_id, cree_le DESC);
CREATE INDEX idx_audit_utilisateur ON journal_audit(utilisateur_id, cree_le DESC);

-- --- Rôles étudiants/enseignants (comptes optionnels) ---------

INSERT INTO roles (entreprise_id, code, nom, est_systeme)
VALUES
(NULL, 'ETUDIANT', 'Étudiant', TRUE),
(NULL, 'ENSEIGNANT', 'Enseignant', TRUE)
ON CONFLICT DO NOTHING;

-- --- Catalogue des permissions (module × action) --------------

INSERT INTO permissions (code, module, action, description)
SELECT m.module || '.' || a.action, m.module, a.action, m.module || ' : ' || a.action
FROM (VALUES
    ('PLATEFORME'), ('ENTREPRISE'), ('UTILISATEURS'), ('SUCCURSALES'), ('ROLES'),
    ('ACADEMIQUE'), ('ETUDIANTS'), ('INSCRIPTIONS'), ('MONNAIES'), ('FRAIS'),
    ('COMPTABILITE'), ('CAISSE'), ('RAPPORTS'), ('PARAMETRES'), ('AUDIT')
) AS m(module)
CROSS JOIN (VALUES
    ('CONSULTER'), ('CREER'), ('MODIFIER'), ('VALIDER'),
    ('ANNULER'), ('IMPRIMER'), ('EXPORTER'), ('SUPPRIMER')
) AS a(action)
ON CONFLICT (code) DO NOTHING;

-- --- Matrices de permissions des rôles système ----------------

CREATE OR REPLACE FUNCTION accorder_permissions(p_role VARCHAR, p_modules TEXT[], p_actions TEXT[])
RETURNS VOID LANGUAGE sql AS $$
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON p.module = ANY(p_modules) AND p.action = ANY(p_actions)
    WHERE r.est_systeme AND r.code = p_role AND r.entreprise_id IS NULL
    ON CONFLICT DO NOTHING;
$$;

SELECT accorder_permissions('SUPER_ADMIN',
    ARRAY['PLATEFORME','ENTREPRISE','UTILISATEURS','SUCCURSALES','ROLES','ACADEMIQUE','ETUDIANTS','INSCRIPTIONS','MONNAIES','FRAIS','COMPTABILITE','CAISSE','RAPPORTS','PARAMETRES','AUDIT'],
    ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER','SUPPRIMER']);

SELECT accorder_permissions('ADMIN_PRINCIPAL',
    ARRAY['ENTREPRISE','UTILISATEURS','SUCCURSALES','ROLES','ACADEMIQUE','ETUDIANTS','INSCRIPTIONS','MONNAIES','FRAIS','COMPTABILITE','CAISSE','RAPPORTS','PARAMETRES','AUDIT'],
    ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER','SUPPRIMER']);

SELECT accorder_permissions('ADMIN',
    ARRAY['ENTREPRISE'], ARRAY['CONSULTER','MODIFIER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['UTILISATEURS'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER','SUPPRIMER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['SUCCURSALES','ROLES'], ARRAY['CONSULTER','CREER','MODIFIER','SUPPRIMER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['ACADEMIQUE','ETUDIANTS','INSCRIPTIONS'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER','SUPPRIMER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['MONNAIES','FRAIS','COMPTABILITE'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['CAISSE'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['RAPPORTS','AUDIT'], ARRAY['CONSULTER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('ADMIN',
    ARRAY['PARAMETRES'], ARRAY['CONSULTER','MODIFIER']);

SELECT accorder_permissions('DIRECTEUR',
    ARRAY['ENTREPRISE','SUCCURSALES','UTILISATEURS','PARAMETRES'], ARRAY['CONSULTER']);
SELECT accorder_permissions('DIRECTEUR',
    ARRAY['ACADEMIQUE','INSCRIPTIONS'], ARRAY['CONSULTER','VALIDER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('DIRECTEUR',
    ARRAY['ETUDIANTS','FRAIS','COMPTABILITE','CAISSE','RAPPORTS','AUDIT'], ARRAY['CONSULTER','IMPRIMER','EXPORTER']);

SELECT accorder_permissions('AGENT_INSCRIPTION',
    ARRAY['ENTREPRISE','ACADEMIQUE'], ARRAY['CONSULTER']);
SELECT accorder_permissions('AGENT_INSCRIPTION',
    ARRAY['ETUDIANTS','INSCRIPTIONS'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('AGENT_INSCRIPTION',
    ARRAY['RAPPORTS'], ARRAY['CONSULTER','EXPORTER']);

SELECT accorder_permissions('COMPTABLE',
    ARRAY['ENTREPRISE','ACADEMIQUE','ETUDIANTS','INSCRIPTIONS'], ARRAY['CONSULTER']);
SELECT accorder_permissions('COMPTABLE',
    ARRAY['MONNAIES','FRAIS','COMPTABILITE'], ARRAY['CONSULTER','CREER','MODIFIER','VALIDER','ANNULER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('COMPTABLE',
    ARRAY['CAISSE'], ARRAY['CONSULTER','CREER','VALIDER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('COMPTABLE',
    ARRAY['RAPPORTS','AUDIT'], ARRAY['CONSULTER','IMPRIMER','EXPORTER']);

SELECT accorder_permissions('CAISSIER',
    ARRAY['ENTREPRISE','ETUDIANTS','INSCRIPTIONS','FRAIS'], ARRAY['CONSULTER']);
SELECT accorder_permissions('CAISSIER',
    ARRAY['CAISSE'], ARRAY['CONSULTER','CREER','VALIDER','IMPRIMER']);
SELECT accorder_permissions('CAISSIER',
    ARRAY['RAPPORTS'], ARRAY['CONSULTER','IMPRIMER']);

SELECT accorder_permissions('SECRETAIRE_ACADEMIQUE',
    ARRAY['ENTREPRISE','ACADEMIQUE'], ARRAY['CONSULTER']);
SELECT accorder_permissions('SECRETAIRE_ACADEMIQUE',
    ARRAY['ACADEMIQUE','ETUDIANTS','INSCRIPTIONS'], ARRAY['CONSULTER','CREER','MODIFIER','IMPRIMER','EXPORTER']);
SELECT accorder_permissions('SECRETAIRE_ACADEMIQUE',
    ARRAY['RAPPORTS'], ARRAY['CONSULTER','EXPORTER']);

SELECT accorder_permissions('AUDITEUR',
    ARRAY['ENTREPRISE','UTILISATEURS','SUCCURSALES','ROLES','ACADEMIQUE','ETUDIANTS','INSCRIPTIONS','MONNAIES','FRAIS','COMPTABILITE','CAISSE','RAPPORTS','PARAMETRES','AUDIT'],
    ARRAY['CONSULTER','EXPORTER']);

DROP FUNCTION accorder_permissions(VARCHAR, TEXT[], TEXT[]);

-- --- Corrections du lot 1 (idempotent) ------------------------

-- Protection des rôles système
CREATE OR REPLACE FUNCTION proteger_roles_systeme()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.est_systeme = TRUE AND TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'Le rôle système % ne peut pas être modifié ni supprimé', OLD.code;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_roles_systeme ON roles;
CREATE TRIGGER trg_proteger_roles_systeme
BEFORE UPDATE OR DELETE ON roles
FOR EACH ROW EXECUTE FUNCTION proteger_roles_systeme();

-- Anti-circulaire entre entreprises
CREATE OR REPLACE FUNCTION verifier_cycle_entreprise()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_parent BIGINT := NEW.entreprise_mere_id;
    v_compteur INTEGER := 0;
BEGIN
    WHILE v_parent IS NOT NULL LOOP
        IF v_parent = NEW.id THEN
            RAISE EXCEPTION 'Relation circulaire entre entreprises interdite';
        END IF;
        SELECT entreprise_mere_id INTO v_parent FROM entreprises WHERE id = v_parent;
        v_compteur := v_compteur + 1;
        IF v_compteur > 50 THEN
            RAISE EXCEPTION 'Chaîne d entreprises trop profonde';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verifier_cycle_entreprise ON entreprises;
CREATE TRIGGER trg_verifier_cycle_entreprise
BEFORE INSERT OR UPDATE ON entreprises
FOR EACH ROW EXECUTE FUNCTION verifier_cycle_entreprise();

-- updated_at manquants (lot 1)
DROP TRIGGER IF EXISTS trg_maj_entreprises_updated_at ON entreprises;
CREATE TRIGGER trg_maj_entreprises_updated_at
BEFORE UPDATE ON entreprises
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

DROP TRIGGER IF EXISTS trg_maj_utilisateurs_updated_at ON utilisateurs;
CREATE TRIGGER trg_maj_utilisateurs_updated_at
BEFORE UPDATE ON utilisateurs
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

DROP TRIGGER IF EXISTS trg_maj_roles_updated_at ON roles;
CREATE TRIGGER trg_maj_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION maj_updated_at();

-- Index manquants
CREATE INDEX IF NOT EXISTS idx_utilisateurs_entreprise ON utilisateurs(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_utilisateur_roles_role ON utilisateur_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
