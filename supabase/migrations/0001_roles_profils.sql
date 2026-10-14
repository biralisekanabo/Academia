-- ============================================================
-- OPENLU · 0001 - Rôles, profils et sécurisation (RLS)
-- ============================================================

create extension if not exists "pgcrypto";

-- --- Enums ---------------------------------------------------
drop type if exists openlu_type_role cascade;
create type openlu_type_role as enum (
  'etudiant',
  'enseignant',
  'administrateur',
  'personnel',
  'reception',
  'finance'
);

drop type if exists openlu_type_statut cascade;
create type openlu_type_statut as enum ('actif', 'inactif', 'suspendu', 'diplome', 'rejete', 'en_attente');

-- --- Table openlu_profils ---------------------------------------------
create table if not exists public.openlu_profils (
  id          uuid primary key references auth.users (id) on delete cascade,
  prenom      text not null default '',
  nom         text not null default '',
  role        openlu_type_role not null default 'etudiant',
  telephone   text,
  avatar_url  text,
  cree_le     timestamptz not null default now(),
  mis_a_jour  timestamptz not null default now()
);

comment on table public.openlu_profils is 'Profil public rattaché à un compte Supabase Auth.';

-- --- Fonctions utilitaires (RLS) --------------------------------
create or replace function public.openlu_obtenir_role()
returns openlu_type_role
language sql stable security definer set search_path = public
as $$
  select role from public.openlu_profils where id = auth.uid();
$$;

create or replace function public.openlu_est_administrateur()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.openlu_profils
    where id = auth.uid() and role = 'administrateur'
  );
$$;

create or replace function public.openlu_est_enseignant()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.openlu_profils
    where id = auth.uid() and role = 'enseignant'
  );
$$;

create or replace function public.openlu_est_etudiant()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.openlu_profils
    where id = auth.uid() and role = 'etudiant'
  );
$$;

create or replace function public.openlu_est_reception()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.openlu_profils
    where id = auth.uid() and role = 'reception'
  );
$$;

create or replace function public.openlu_est_finance()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.openlu_profils
    where id = auth.uid() and role = 'finance'
  );
$$;

-- Droits étendus : personnel, réception et finance voient tout sauf plus
create or replace function public.openlu_est_administratif()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.openlu_profils
    where id = auth.uid() and role in ('administrateur', 'personnel', 'reception', 'finance')
  );
$$;

-- --- Trigger : profil auto à la création du compte --------------
create or replace function public.openlu_gerer_nouveau_utilisateur()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role      public.openlu_type_role;
  v_role_brut text;
begin
  v_role_brut := lower(coalesce(new.raw_user_meta_data ->> 'role', ''));

  v_role := case
    when v_role_brut in (
      'etudiant', 'enseignant', 'administrateur',
      'personnel', 'reception', 'finance'
    ) then v_role_brut::public.openlu_type_role
    else 'etudiant'::public.openlu_type_role
  end;

  insert into public.openlu_profils (id, prenom, nom, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    coalesce(new.raw_user_meta_data ->> 'nom', ''),
    v_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists openlu_sur_nouvel_utilisateur on auth.users;
create trigger openlu_sur_nouvel_utilisateur
  after insert on auth.users
  for each row execute function public.openlu_gerer_nouveau_utilisateur();

-- --- Trigger : mise à jour du champ mis_a_jour -------------------
create or replace function public.openlu_surveiller_mise_a_jour()
returns trigger
language plpgsql
as $$
begin
  new.mis_a_jour = now();
  return new;
end;
$$;

-- --- RLS openlu_profils ------------------------------------------------
alter table public.openlu_profils enable row level security;

create policy "openlu_profils_lecture_soi" on public.openlu_profils
  for select using (auth.uid() = id);

create policy "openlu_profils_lecture_tous_authentifies" on public.openlu_profils
  for select using (auth.role() = 'authenticated');

create policy "openlu_profils_modification_soi" on public.openlu_profils
  for update using (auth.uid() = id)
  with check (
    (auth.uid() = id and role = (select role from public.openlu_profils where id = auth.uid()))
    or exists (
      select 1 from public.openlu_profils where id = auth.uid() and role = 'administrateur'
    )
  );

create policy "openlu_profils_administration_totale" on public.openlu_profils
  for all using (public.openlu_est_administrateur());