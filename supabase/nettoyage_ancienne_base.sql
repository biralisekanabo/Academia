-- ============================================================
-- EDUPLEX · Nettoyage de l'ancienne base (schéma openlu_*)
-- Idempotent : supprime tous les objets de l'ancienne application
-- (tables, vues, fonctions, types, politiques RLS).
-- À exécuter EN PREMIER, avant les migrations 0001 → 0008.
-- ============================================================

-- Ancien trigger de création de profil sur auth.users
drop trigger if exists openlu_sur_nouvel_utilisateur on auth.users;

-- 1. Fonctions
do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'openlu\_%'
  loop
    execute format('drop function if exists public.%I(%s) cascade', r.proname, r.args);
  end loop;
end $$;

-- 2. Vues matérialisées
do $$
declare r record;
begin
  for r in
    select matviewname from pg_matviews
    where schemaname = 'public' and matviewname like 'openlu\_%'
  loop
    execute format('drop materialized view if exists public.%I cascade', r.matviewname);
  end loop;
end $$;

-- 3. Vues
do $$
declare r record;
begin
  for r in
    select viewname from pg_views
    where schemaname = 'public' and viewname like 'openlu\_%'
  loop
    execute format('drop view if exists public.%I cascade', r.viewname);
  end loop;
end $$;

-- 4. Politiques RLS des tables openlu_*
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename like 'openlu\_%'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 5. Politiques RLS storage liées aux buckets openlu_*
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'openlu\_%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- 6. Tables
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'openlu\_%'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end $$;

-- 7. Types énumérés
do $$
declare r record;
begin
  for r in
    select t.typname from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e' and t.typname like 'openlu\_%'
  loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;

-- NOTE : les buckets Storage de l'ancienne app (openlu_supports,
-- openlu_soumissions, openlu_annonces) ne peuvent PAS être supprimés par SQL :
-- Supabase interdit la suppression directe dans storage.buckets
-- (« Use the Storage API instead »). Les retirer via l'API Storage :
--   supabase.storage.from('openlu_supports').empty()  puis  .deleteBucket('openlu_supports')
