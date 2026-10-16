-- ============================================================
-- GESTION_UNIVERSITES · Base 11 — Super administrateur initial
-- Idempotent : crée l'entreprise plateforme et le super admin
-- par défaut uniquement s'ils n'existent pas encore.
-- À exécuter APRÈS les migrations 0001 → 0010.
-- ============================================================
-- Identifiants de connexion :
--   Établissement : ACADEMIA
--   Identifiant   : Admin@gmail.com
--   Mot de passe  : 12345678
-- (à changer après la première connexion)
-- ============================================================

-- 1. Entreprise plateforme (une seule)
INSERT INTO entreprises (nom, sigle, type_entreprise, statut, est_mere)
SELECT 'Plateforme Academia', 'ACADEMIA', 'PLATEFORME', 'ACTIVE', TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM entreprises
    WHERE type_entreprise = 'PLATEFORME' AND deleted_at IS NULL
);

-- 2. Utilisateur super admin
INSERT INTO utilisateurs (
    entreprise_id, nom_complet, nom_utilisateur, email,
    password_hash, est_admin_principal, doit_changer_mot_de_passe, statut
)
SELECT
    e.id,
    'Super Administrateur',
    'Admin@gmail.com',
    'admin@gmail.com',
    '$2b$12$LOiQoNaVAfQ/i3orqt6haObqPy0l3f6mvCbaTSv.2C0fEVaQqerCC',
    FALSE,
    FALSE,
    'ACTIF'
FROM entreprises e
WHERE e.type_entreprise = 'PLATEFORME'
  AND e.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM utilisateurs u
      WHERE lower(u.nom_utilisateur) = lower('Admin@gmail.com')
  );

-- 3. Attribution du rôle SUPER_ADMIN
INSERT INTO utilisateur_roles (utilisateur_id, role_id)
SELECT u.id, r.id
FROM utilisateurs u
JOIN entreprises e ON e.id = u.entreprise_id
JOIN roles r ON r.code = 'SUPER_ADMIN' AND r.entreprise_id IS NULL
WHERE e.type_entreprise = 'PLATEFORME'
  AND e.deleted_at IS NULL
  AND lower(u.nom_utilisateur) = lower('Admin@gmail.com')
ON CONFLICT (utilisateur_id, role_id) DO NOTHING;
