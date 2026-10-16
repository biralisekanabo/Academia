-- ============================================================
-- GESTION_UNIVERSITES · Base 10 — RLS, journal de caisse, vues
-- Idempotent (réexécutable).
-- ============================================================
-- NOTE SÉCURITÉ
-- L'application accède à la base via la clé `service_role`
-- (voir src/bibliotheque/bd.ts) qui CONTOURNE la RLS. La RLS
-- ci-dessous est une défense en profondeur : elle empêche toute
-- lecture/écriture directe via la clé `anon`/`authenticated`
-- (aucune politique n'est créée ⇒ accès refusé par défaut).
-- L'isolation multi-tenant réelle est assurée côté serveur par
-- le helper de scoping (src/bibliotheque/portee.ts).
-- ============================================================

-- --- Activation RLS sur toutes les tables applicatives --------

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'entreprises','utilisateurs','roles','permissions','role_permissions',
        'utilisateur_roles','journal_audit','annees_academiques','facultes',
        'domaines','promotions','etudiants','inscriptions','devises','taux_changes',
        'frais_academiques','frais_tranches','dettes','caisses','paiements',
        'paiement_dettes','mouvements_caisse','journal_caisse','comptes_comptables',
        'journaux','ecritures','ecriture_lignes','utilisateur_succursales',
        'sequences_documents','remises_dettes','sessions_caisse',
        'reinitialisations_mot_de_passe'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
        END IF;
    END LOOP;
END $$;

-- --- Journal de caisse : alimentation automatique -------------
-- Chaque paiement / mouvement validé génère une ligne de journal.

CREATE OR REPLACE FUNCTION journaliser_paiement()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM journal_caisse
        WHERE source_type = 'PAIEMENT' AND source_id = OLD.id;
        RETURN OLD;
    END IF;

    DELETE FROM journal_caisse
    WHERE source_type = 'PAIEMENT' AND source_id = NEW.id;

    IF NEW.statut = 'VALIDE' AND NEW.deleted_at IS NULL THEN
        INSERT INTO journal_caisse (
            entreprise_id, caisse_id, source_type, source_id,
            sens, montant, devise_id
        )
        VALUES (
            NEW.entreprise_id, NEW.caisse_id, 'PAIEMENT', NEW.id,
            'ENTREE', NEW.montant, NEW.devise_id
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journaliser_paiement ON paiements;
CREATE TRIGGER trg_journaliser_paiement
AFTER INSERT OR UPDATE OR DELETE ON paiements
FOR EACH ROW EXECUTE FUNCTION journaliser_paiement();

CREATE OR REPLACE FUNCTION journaliser_mouvement()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_sens VARCHAR(10);
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM journal_caisse
        WHERE source_type = 'MOUVEMENT' AND source_id = OLD.id;
        RETURN OLD;
    END IF;

    DELETE FROM journal_caisse
    WHERE source_type = 'MOUVEMENT' AND source_id = NEW.id;

    IF NEW.statut = 'VALIDE' AND NEW.deleted_at IS NULL THEN
        -- Sens principal du mouvement sur sa caisse d'origine
        v_sens := CASE
            WHEN NEW.type IN ('ENTREE') THEN 'ENTREE'
            ELSE 'SORTIE'
        END;

        INSERT INTO journal_caisse (
            entreprise_id, caisse_id, source_type, source_id,
            sens, montant, devise_id
        )
        VALUES (
            NEW.entreprise_id, NEW.caisse_id, 'MOUVEMENT', NEW.id,
            v_sens, NEW.montant, NEW.devise_id
        );

        -- Un transfert crédite aussi la caisse de destination
        IF NEW.type = 'TRANSFERT' AND NEW.caisse_destination_id IS NOT NULL THEN
            INSERT INTO journal_caisse (
                entreprise_id, caisse_id, source_type, source_id,
                sens, montant, devise_id
            )
            VALUES (
                NEW.entreprise_id, NEW.caisse_destination_id, 'MOUVEMENT', NEW.id,
                'ENTREE', NEW.montant, NEW.devise_id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_journaliser_mouvement ON mouvements_caisse;
CREATE TRIGGER trg_journaliser_mouvement
AFTER INSERT OR UPDATE OR DELETE ON mouvements_caisse
FOR EACH ROW EXECUTE FUNCTION journaliser_mouvement();

-- --- Vues consolidées -----------------------------------------

-- Solde courant de chaque caisse
CREATE OR REPLACE VIEW vue_solde_caisse AS
SELECT
    c.id AS caisse_id,
    c.entreprise_id,
    c.code,
    c.nom,
    c.devise_id,
    c.statut,
    c.solde_initial
        + COALESCE((
            SELECT SUM(p.montant) FROM paiements p
            WHERE p.caisse_id = c.id AND p.statut = 'VALIDE' AND p.deleted_at IS NULL
        ), 0)
        + COALESCE((
            SELECT SUM(m.montant) FROM mouvements_caisse m
            WHERE m.statut = 'VALIDE' AND m.deleted_at IS NULL
              AND m.type = 'ENTREE' AND m.caisse_id = c.id
        ), 0)
        + COALESCE((
            SELECT SUM(m.montant) FROM mouvements_caisse m
            WHERE m.statut = 'VALIDE' AND m.deleted_at IS NULL
              AND m.type = 'TRANSFERT' AND m.caisse_destination_id = c.id
        ), 0)
        - COALESCE((
            SELECT SUM(m.montant) FROM mouvements_caisse m
            WHERE m.statut = 'VALIDE' AND m.deleted_at IS NULL
              AND m.type IN ('SORTIE', 'REMBOURSEMENT') AND m.caisse_id = c.id
        ), 0)
        - COALESCE((
            SELECT SUM(m.montant) FROM mouvements_caisse m
            WHERE m.statut = 'VALIDE' AND m.deleted_at IS NULL
              AND m.type = 'TRANSFERT' AND m.caisse_id = c.id
        ), 0)
        AS solde_courant
FROM caisses c
WHERE c.deleted_at IS NULL;

-- Situation financière par étudiant
CREATE OR REPLACE VIEW vue_situation_etudiants AS
SELECT
    e.id AS etudiant_id,
    e.entreprise_id,
    e.matricule,
    e.nom,
    e.postnom,
    e.prenom,
    COALESCE(SUM(d.montant_initial), 0)   AS total_du,
    COALESCE(SUM(d.montant_reduction), 0) AS total_reduction,
    COALESCE(SUM(d.montant_paye), 0)      AS total_paye,
    COALESCE(SUM(d.solde), 0)             AS total_solde
FROM etudiants e
LEFT JOIN dettes d
    ON d.etudiant_id = e.id
   AND d.deleted_at IS NULL
   AND d.statut <> 'ANNULEE'
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.entreprise_id, e.matricule, e.nom, e.postnom, e.prenom;

-- Situation des dettes par entreprise / statut
CREATE OR REPLACE VIEW vue_dettes_entreprise AS
SELECT
    d.entreprise_id,
    d.annee_academique_id,
    d.statut,
    COUNT(*)                         AS nombre,
    COALESCE(SUM(d.montant_initial), 0)   AS total_initial,
    COALESCE(SUM(d.montant_reduction), 0) AS total_reduction,
    COALESCE(SUM(d.montant_paye), 0)      AS total_paye,
    COALESCE(SUM(d.solde), 0)             AS total_solde
FROM dettes d
WHERE d.deleted_at IS NULL
GROUP BY d.entreprise_id, d.annee_academique_id, d.statut;

-- --- Permissions sur les vues ---------------------------------

DO $$
DECLARE
    v text;
BEGIN
    FOREACH v IN ARRAY ARRAY['vue_solde_caisse','vue_situation_etudiants','vue_dettes_entreprise']
    LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', v);
    END LOOP;
END $$;

-- --- Storage : politiques des buckets -------------------------
-- Le bucket public `logos` est lisible publiquement (URL publique).
-- Les buckets privés ne sont accessibles que via service_role.

DROP POLICY IF EXISTS "logos_lecture_publique" ON storage.objects;
CREATE POLICY "logos_lecture_publique"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');
