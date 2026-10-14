-- ============================================================
-- OPENLU - Script unique (migrations 0001->0007 + seed)
-- A coller tel quel dans l editeur SQL de Supabase, puis Execute.
-- Projet partage avec KivuPort : ne cree que des objets prefixes openlu_.
-- Reexecutable : le script supprime d'abord les objets openlu_ puis les recree.
-- ATTENTION : les donnees des tables openlu_ seront effacees a chaque execution.
-- ============================================================

begin;

-- ============================================================
-- Nettoyage idempotent : suppression de TOUS les objets OPENLU
-- existants (uniquement prefixes openlu_) avant recreation.
-- N'affecte AUCUN objet KivuPort.
-- ============================================================
drop trigger if exists openlu_sur_nouvel_utilisateur on auth.users;

-- Policies sur storage.objects (ne disparaissent pas avec les tables)
drop policy if exists "openlu_supports_lecture_authentifies" on storage.objects;
drop policy if exists "openlu_supports_ecriture_pedagogique" on storage.objects;
drop policy if exists "openlu_supports_modification_pedagogique" on storage.objects;
drop policy if exists "openlu_supports_suppression_pedagogique" on storage.objects;
drop policy if exists "openlu_soumissions_lecture_soi" on storage.objects;
drop policy if exists "openlu_soumissions_lecture_pedagogique" on storage.objects;
drop policy if exists "openlu_soumissions_ecriture_soi" on storage.objects;
drop policy if exists "openlu_soumissions_modification_soi" on storage.objects;
drop policy if exists "openlu_soumissions_suppression_soi" on storage.objects;

-- Tables (cascade : index, contraintes, triggers et policies associees)
drop table if exists public.openlu_abonnements_push cascade;
drop table if exists public.openlu_notifications cascade;
drop table if exists public.openlu_transactions cascade;
drop table if exists public.openlu_soumissions cascade;
drop table if exists public.openlu_devoirs cascade;
drop table if exists public.openlu_supports_cours cascade;
drop table if exists public.openlu_paiements_enseignants cascade;
drop table if exists public.openlu_paiements cascade;
drop table if exists public.openlu_frais_scolarite cascade;
drop table if exists public.openlu_notes cascade;
drop table if exists public.openlu_evaluations cascade;
drop table if exists public.openlu_seances cascade;
drop table if exists public.openlu_inscriptions_cours cascade;
drop table if exists public.openlu_cours cascade;
drop table if exists public.openlu_etudiants cascade;
drop table if exists public.openlu_enseignants cascade;
drop table if exists public.openlu_filieres cascade;
drop table if exists public.openlu_facultes cascade;
drop table if exists public.openlu_profils cascade;

-- Fonctions (apres les tables : leurs policies dependantes sont deja supprimees)
drop function if exists public.openlu_obtenir_role();
drop function if exists public.openlu_est_administrateur();
drop function if exists public.openlu_est_enseignant();
drop function if exists public.openlu_est_etudiant();
drop function if exists public.openlu_est_reception();
drop function if exists public.openlu_est_finance();
drop function if exists public.openlu_est_administratif();
drop function if exists public.openlu_gerer_nouveau_utilisateur();
drop function if exists public.openlu_surveiller_mise_a_jour();

-- Types
drop type if exists public.openlu_type_notification cascade;
drop type if exists public.openlu_type_transaction cascade;
drop type if exists public.openlu_type_categorie_transaction cascade;
drop type if exists public.openlu_type_statut_soumission cascade;
drop type if exists public.openlu_type_statut_paiement cascade;
drop type if exists public.openlu_type_statut cascade;
drop type if exists public.openlu_type_role cascade;
drop type if exists public.openlu_type_niveau cascade;
drop type if exists public.openlu_type_methode_paiement cascade;
drop type if exists public.openlu_type_inscription_statut cascade;
drop type if exists public.openlu_type_evaluation cascade;

-- 
-- ### 0001_roles_profils.sql
-- 
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

-- 
-- ### 0002_filieres_etudiants.sql
-- 
-- ============================================================
-- OPENLU · 0002 - Facultés, filières, étudiants et enseignants
-- ============================================================

-- --- Niveau / promotion (L1…M2) --------------------------------
drop type if exists openlu_type_niveau cascade;
create type openlu_type_niveau as enum ('L1', 'L2', 'L3', 'M1', 'M2');

-- --- Facultés -----------------------------------------------------
create table if not exists public.openlu_facultes (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  nom          text not null,
  description  text,
  ordre        int not null default 0,
  cree_le      timestamptz not null default now(),
  mis_a_jour   timestamptz not null default now()
);

comment on table public.openlu_facultes is 'Facultés de l université (5 par défaut).';

-- --- Filières (spécialisations) -----------------------------------
create table if not exists public.openlu_filieres (
  id           uuid primary key default gen_random_uuid(),
  faculte_id   uuid not null references public.openlu_facultes (id) on delete cascade,
  code         text not null unique,
  nom          text not null,
  description  text,
  cree_le      timestamptz not null default now(),
  mis_a_jour   timestamptz not null default now()
);

comment on table public.openlu_filieres is 'Spécialisations rattachées à une faculté.';

-- --- Étudiants -----------------------------------------------------
create table if not exists public.openlu_etudiants (
  id                uuid primary key references public.openlu_profils (id) on delete cascade,
  matricule         text not null unique,
  filiere_id        uuid references public.openlu_filieres (id) on delete set null,
  niveau            openlu_type_niveau not null default 'L1',
  annee_universitaire text not null default '2026-2027',
  statut            openlu_type_statut not null default 'en_attente',
  date_inscription  date not null default current_date,
  cree_le           timestamptz not null default now(),
  mis_a_jour        timestamptz not null default now()
);

comment on table public.openlu_etudiants is 'Dossier académique rattaché au profil étudiant.';

-- --- Enseignants ------------------------------------------------------
create table if not exists public.openlu_enseignants (
  id               uuid primary key references public.openlu_profils (id) on delete cascade,
  specialite       text,
  statut           openlu_type_statut not null default 'actif',
  date_embauche    date,
  cree_le          timestamptz not null default now(),
  mis_a_jour       timestamptz not null default now()
);

comment on table public.openlu_enseignants is 'Dossier professionnel rattaché au profil enseignant.';

-- --- Triggers mis_a_jour ---------------------------------------------------
drop trigger if exists openlu_facultes_maj on public.openlu_facultes;
create trigger openlu_facultes_maj before update on public.openlu_facultes
  for each row execute function public.openlu_surveiller_mise_a_jour();

drop trigger if exists openlu_filieres_maj on public.openlu_filieres;
create trigger openlu_filieres_maj before update on public.openlu_filieres
  for each row execute function public.openlu_surveiller_mise_a_jour();

drop trigger if exists openlu_etudiants_maj on public.openlu_etudiants;
create trigger openlu_etudiants_maj before update on public.openlu_etudiants
  for each row execute function public.openlu_surveiller_mise_a_jour();

drop trigger if exists openlu_enseignants_maj on public.openlu_enseignants;
create trigger openlu_enseignants_maj before update on public.openlu_enseignants
  for each row execute function public.openlu_surveiller_mise_a_jour();

-- --- RLS facultés -----------------------------------------------------------
alter table public.openlu_facultes enable row level security;

create policy "openlu_facultes_lecture_authentifies" on public.openlu_facultes
  for select using (auth.role() = 'authenticated');

create policy "openlu_facultes_gestion_reception" on public.openlu_facultes
  for all using (public.openlu_est_administratif());

create policy "openlu_facultes_administration_totale" on public.openlu_facultes
  for all using (public.openlu_est_administrateur());

-- --- RLS filières -------------------------------------------------------------
alter table public.openlu_filieres enable row level security;

create policy "openlu_filieres_lecture_authentifies" on public.openlu_filieres
  for select using (auth.role() = 'authenticated');

create policy "openlu_filieres_gestion_reception" on public.openlu_filieres
  for all using (public.openlu_est_administratif());

create policy "openlu_filieres_administration_totale" on public.openlu_filieres
  for all using (public.openlu_est_administrateur());

-- --- RLS étudiants ------------------------------------------------------------------
alter table public.openlu_etudiants enable row level security;

create policy "openlu_etudiants_lecture_soi" on public.openlu_etudiants
  for select using (id = auth.uid());

create policy "openlu_etudiants_lecture_academique" on public.openlu_etudiants
  for select using (public.openlu_est_administratif() or public.openlu_est_enseignant());

create policy "openlu_etudiants_inscription_reception" on public.openlu_etudiants
  for insert with check (public.openlu_est_administratif());

create policy "openlu_etudiants_modification_reception" on public.openlu_etudiants
  for update using (public.openlu_est_administratif());

create policy "openlu_etudiants_suppression_reception" on public.openlu_etudiants
  for delete using (public.openlu_est_administratif());

-- --- RLS enseignants ----------------------------------------------------------------
alter table public.openlu_enseignants enable row level security;

create policy "openlu_enseignants_lecture_authentifies" on public.openlu_enseignants
  for select using (auth.role() = 'authenticated');

create policy "openlu_enseignants_modification_soi" on public.openlu_enseignants
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy "openlu_enseignants_administration_totale" on public.openlu_enseignants
  for all using (public.openlu_est_administrateur());

-- --- Index ----------------------------------------------------------------------------
create index if not exists openlu_filieres_faculte_idx on public.openlu_filieres (faculte_id);
create index if not exists openlu_etudiants_filiere_idx on public.openlu_etudiants (filiere_id);
create index if not exists openlu_etudiants_matricule_idx on public.openlu_etudiants (matricule);
create index if not exists openlu_etudiants_statut_idx on public.openlu_etudiants (statut);

-- 
-- ### 0003_cours_inscriptions.sql
-- 
-- ============================================================
-- OPENLU · 0003 - Cours, inscriptions et emploi du temps
-- ============================================================

-- --- Cours -----------------------------------------------------
create table if not exists public.openlu_cours (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  titre              text not null,
  description        text,
  credits            numeric not null default 6 check (credits > 0),
  semestre           int not null default 1 check (semestre between 1 and 8),
  enseignant_id      uuid references public.openlu_profils (id) on delete set null,
  jeton_inscription  text not null unique default replace(gen_random_uuid()::text, '-', ''),
  inscription_ouverte boolean not null default true,
  cree_le            timestamptz not null default now(),
  mis_a_jour         timestamptz not null default now()
);

comment on table public.openlu_cours is 'Catalogue des cours de l université.';
comment on column public.openlu_cours.jeton_inscription is 'Jeton public partagé pour l inscription autonome via un lien.';
comment on column public.openlu_cours.inscription_ouverte is 'Autorise l inscription autonome par lien tant que vrai.';

-- --- Fonction publique : cours par jeton d inscription -------------------
-- Lecture par un visiteur non authentifié (page publique /rejoindre/[jeton]).
create or replace function public.openlu_cours_par_jeton(p_jeton text)
returns table (
  id          uuid,
  code        text,
  titre       text,
  description text,
  credits     numeric,
  semestre    int,
  enseignant  text,
  ouverte     boolean
)
language sql stable security definer set search_path = public
as $$
  select
    c.id,
    c.code,
    c.titre,
    c.description,
    c.credits,
    c.semestre,
    trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')),
    c.inscription_ouverte
  from public.openlu_cours c
  left join public.openlu_profils p on p.id = c.enseignant_id
  where c.jeton_inscription = p_jeton
  limit 1;
$$;

grant execute on function public.openlu_cours_par_jeton(text) to anon, authenticated;

-- --- Inscriptions aux cours -------------------------------------
drop type if exists openlu_type_inscription_statut cascade;
create type openlu_type_inscription_statut as enum ('en_attente', 'validee', 'refusee');

create table if not exists public.openlu_inscriptions_cours (
  id               uuid primary key default gen_random_uuid(),
  etudiant_id      uuid not null references public.openlu_profils (id) on delete cascade,
  cours_id         uuid not null references public.openlu_cours (id) on delete cascade,
  statut           openlu_type_inscription_statut not null default 'en_attente',
  date_inscription timestamptz not null default now(),
  unique (etudiant_id, cours_id)
);

comment on table public.openlu_inscriptions_cours is 'Inscription d un étudiant à un cours.';

-- --- Séances de cours (emploi du temps) ---------------------------
create table if not exists public.openlu_seances (
  id             uuid primary key default gen_random_uuid(),
  cours_id       uuid not null references public.openlu_cours (id) on delete cascade,
  type_seance    text not null default 'cours' check (type_seance in ('cours', 'td', 'tp', 'examen')),
  jour_semaine   int not null default 1 check (jour_semaine between 1 and 7),
  heure_debut    time not null,
  heure_fin      time not null,
  salle          text,
  cree_le        timestamptz not null default now(),
  check (heure_fin > heure_debut)
);

comment on table public.openlu_seances is 'Créneaux hebdomadaires de l emploi du temps.';

-- --- Messages de classe (fil de communication enseignant -> étudiants) ---
create table if not exists public.openlu_messages_cours (
  id         uuid primary key default gen_random_uuid(),
  cours_id   uuid not null references public.openlu_cours (id) on delete cascade,
  auteur_id  uuid references public.openlu_profils (id) on delete set null,
  contenu    text not null,
  cree_le    timestamptz not null default now(),
  constraint openlu_messages_cours_contenu check (char_length(contenu) between 1 and 8000)
);

comment on table public.openlu_messages_cours is 'Fil de messages publiés par l enseignant d un cours.';

-- --- Triggers mis_a_jour -------------------------------------------
drop trigger if exists openlu_cours_maj on public.openlu_cours;
create trigger openlu_cours_maj before update on public.openlu_cours
  for each row execute function public.openlu_surveiller_mise_a_jour();

-- --- RLS cours --------------------------------------------------------
alter table public.openlu_cours enable row level security;

create policy "openlu_cours_lecture_authentifies" on public.openlu_cours
  for select using (auth.role() = 'authenticated');

create policy "openlu_cours_ecriture_enseignants" on public.openlu_cours
  for insert with check (public.openlu_est_enseignant() and enseignant_id = auth.uid());

create policy "openlu_cours_modification_proprietaire" on public.openlu_cours
  for update using (public.openlu_est_enseignant() and enseignant_id = auth.uid())
  with check (enseignant_id = auth.uid());

create policy "openlu_cours_administration_totale" on public.openlu_cours
  for all using (public.openlu_est_administrateur());

-- --- RLS inscriptions_cours --------------------------------------------
alter table public.openlu_inscriptions_cours enable row level security;

create policy "openlu_inscriptions_lecture_soi" on public.openlu_inscriptions_cours
  for select using (etudiant_id = auth.uid());

create policy "openlu_inscriptions_creation_soi" on public.openlu_inscriptions_cours
  for insert with check (etudiant_id = auth.uid());

create policy "openlu_inscriptions_modification_soi" on public.openlu_inscriptions_cours
  for update using (etudiant_id = auth.uid());

create policy "openlu_inscriptions_lecture_enseignants" on public.openlu_inscriptions_cours
  for select using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_cours c
      where c.id = cours_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_inscriptions_administration_totale" on public.openlu_inscriptions_cours
  for all using (public.openlu_est_administrateur());

-- --- RLS seances --------------------------------------------------------
alter table public.openlu_seances enable row level security;

create policy "openlu_seances_lecture_authentifies" on public.openlu_seances
  for select using (auth.role() = 'authenticated');

create policy "openlu_seances_ecriture_enseignants" on public.openlu_seances
  for all using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_cours c
      where c.id = cours_id and c.enseignant_id = auth.uid()
    )
  ) with check (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_cours c
      where c.id = cours_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_seances_administration_totale" on public.openlu_seances
  for all using (public.openlu_est_administrateur());

-- --- Index -----------------------------------------------------------
create index if not exists openlu_cours_enseignant_idx on public.openlu_cours (enseignant_id);
create index if not exists openlu_inscriptions_etudiant_idx on public.openlu_inscriptions_cours (etudiant_id);
create index if not exists openlu_inscriptions_cours_idx on public.openlu_inscriptions_cours (cours_id);
create index if not exists openlu_seances_cours_idx on public.openlu_seances (cours_id);

-- 
-- ### 0004_evaluations_notes.sql
-- 
-- ============================================================
-- OPENLU · 0004 - Évaluations et notes
-- ============================================================

-- --- Types -----------------------------------------------------
drop type if exists openlu_type_evaluation cascade;
create type openlu_type_evaluation as enum ('devoir', 'examen', 'projet', 'partiel');

-- --- Évaluations ------------------------------------------------
create table if not exists public.openlu_evaluations (
  id             uuid primary key default gen_random_uuid(),
  cours_id       uuid not null references public.openlu_cours (id) on delete cascade,
  titre          text not null,
  type           openlu_type_evaluation not null default 'devoir',
  coefficient    numeric not null default 1 check (coefficient > 0),
  bareme         numeric not null default 20 check (bareme > 0),
  date_echeance  date,
  cree_le        timestamptz not null default now(),
  mis_a_jour     timestamptz not null default now()
);

comment on table public.openlu_evaluations is 'Contrôle continu, partiels et examens d un cours.';

-- --- Notes --------------------------------------------------------
create table if not exists public.openlu_notes (
  id            uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.openlu_evaluations (id) on delete cascade,
  etudiant_id   uuid not null references public.openlu_profils (id) on delete cascade,
  valeur        numeric not null check (valeur >= 0),
  appreciation  text,
  saisie_le     timestamptz not null default now(),
  unique (evaluation_id, etudiant_id)
);

comment on table public.openlu_notes is 'Note attribuée à un étudiant pour une évaluation donnée.';

-- --- Trigger mise à jour ---------------------------------------------
drop trigger if exists openlu_evaluations_maj on public.openlu_evaluations;
create trigger openlu_evaluations_maj before update on public.openlu_evaluations
  for each row execute function public.openlu_surveiller_mise_a_jour();

-- --- RLS évaluations ----------------------------------------------------
alter table public.openlu_evaluations enable row level security;

create policy "openlu_evaluations_lecture_authentifies" on public.openlu_evaluations
  for select using (auth.role() = 'authenticated');

create policy "openlu_evaluations_ecriture_enseignants" on public.openlu_evaluations
  for all using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_cours c
      where c.id = cours_id and c.enseignant_id = auth.uid()
    )
  ) with check (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_cours c
      where c.id = cours_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_evaluations_administration_totale" on public.openlu_evaluations
  for all using (public.openlu_est_administrateur());

-- --- RLS notes --------------------------------------------------------------
alter table public.openlu_notes enable row level security;

create policy "openlu_notes_lecture_soi" on public.openlu_notes
  for select using (etudiant_id = auth.uid());

create policy "openlu_notes_lecture_enseignants" on public.openlu_notes
  for select using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_evaluations e
      join public.openlu_cours c on c.id = e.cours_id
      where e.id = evaluation_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_notes_ecriture_enseignants" on public.openlu_notes
  for insert with check (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_evaluations e
      join public.openlu_cours c on c.id = e.cours_id
      where e.id = evaluation_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_notes_modification_enseignants" on public.openlu_notes
  for update using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_evaluations e
      join public.openlu_cours c on c.id = e.cours_id
      where e.id = evaluation_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_notes_suppression_enseignants" on public.openlu_notes
  for delete using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_evaluations e
      join public.openlu_cours c on c.id = e.cours_id
      where e.id = evaluation_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_notes_administration_totale" on public.openlu_notes
  for all using (public.openlu_est_administrateur());

-- --- Index --------------------------------------------------------------------
create index if not exists openlu_evaluations_cours_idx on public.openlu_evaluations (cours_id);
create index if not exists openlu_notes_etudiant_idx on public.openlu_notes (etudiant_id);
create index if not exists openlu_notes_evaluation_idx on public.openlu_notes (evaluation_id);

-- 
-- ### 0005_finances.sql
-- 
-- ============================================================
-- OPENLU · 0005 - Finances : frais, paiements et salaires
-- ============================================================

-- --- Frais de scolarité ------------------------------------------
create table if not exists public.openlu_frais_scolarite (
  id                   uuid primary key default gen_random_uuid(),
  faculte_id           uuid references public.openlu_facultes (id) on delete cascade,
  filiere_id           uuid references public.openlu_filieres (id) on delete cascade,
  niveau               openlu_type_niveau not null default 'L1',
  libelle              text not null,
  montant              numeric not null check (montant >= 0),
  devise               text not null default 'CDF',
  annee_universitaire  text not null default '2026-2027',
  cree_le              timestamptz not null default now(),
  mis_a_jour           timestamptz not null default now(),
  unique (filiere_id, niveau, annee_universitaire)
);

comment on table public.openlu_frais_scolarite is 'Barèmes fixés par la finance : faculté / filière / promotion.';

-- --- Paiements des étudiants ----------------------------------------
drop type if exists openlu_type_methode_paiement cascade;
create type openlu_type_methode_paiement as enum ('especes', 'mobile_money', 'carte_bancaire', 'virement', 'cheque', 'autre');

drop type if exists openlu_type_statut_paiement cascade;
create type openlu_type_statut_paiement as enum ('en_attente', 'valide', 'echoue', 'rembourse');

create table if not exists public.openlu_paiements (
  id             uuid primary key default gen_random_uuid(),
  etudiant_id    uuid not null references public.openlu_profils (id) on delete cascade,
  frais_id       uuid references public.openlu_frais_scolarite (id) on delete restrict,
  reference      text not null unique default ('PAIE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  libelle        text,
  montant        numeric not null check (montant > 0),
  methode        openlu_type_methode_paiement not null default 'mobile_money',
  statut         openlu_type_statut_paiement not null default 'valide',
  date_paiement  date not null default current_date,
  note           text,
  enregistre_par uuid references public.openlu_profils (id),
  cree_le        timestamptz not null default now(),
  mis_a_jour     timestamptz not null default now()
);

comment on table public.openlu_paiements is 'Transactions financières des étudiants. Le reçu est généré depuis ceci.';

-- --- Salaires des enseignants ----------------------------------------
create table if not exists public.openlu_paiements_enseignants (
  id             uuid primary key default gen_random_uuid(),
  enseignant_id  uuid not null references public.openlu_profils (id) on delete cascade,
  reference      text not null unique default ('SAL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  libelle        text not null default 'Salaire mensuel',
  montant        numeric not null check (montant > 0),
  mois           date not null,
  statut         openlu_type_statut_paiement not null default 'en_attente',
  methode        openlu_type_methode_paiement not null default 'virement',
  date_paiement  date,
  note           text,
  enregistre_par uuid references public.openlu_profils (id),
  cree_le        timestamptz not null default now(),
  mis_a_jour     timestamptz not null default now()
);

comment on table public.openlu_paiements_enseignants is 'Paies des enseignants gérées par la finance.';

-- --- Triggers mis à jour -----------------------------------------------------
drop trigger if exists openlu_frais_maj on public.openlu_frais_scolarite;
create trigger openlu_frais_maj before update on public.openlu_frais_scolarite
  for each row execute function public.openlu_surveiller_mise_a_jour();

drop trigger if exists openlu_paiements_maj on public.openlu_paiements;
create trigger openlu_paiements_maj before update on public.openlu_paiements
  for each row execute function public.openlu_surveiller_mise_a_jour();

drop trigger if exists openlu_paies_maj on public.openlu_paiements_enseignants;
create trigger openlu_paies_maj before update on public.openlu_paiements_enseignants
  for each row execute function public.openlu_surveiller_mise_a_jour();

-- --- RLS frais_scolarite -----------------------------------------------------------
alter table public.openlu_frais_scolarite enable row level security;

create policy "openlu_frais_lecture_authentifies" on public.openlu_frais_scolarite
  for select using (auth.role() = 'authenticated');

create policy "openlu_frais_gestion_finance" on public.openlu_frais_scolarite
  for all using (public.openlu_est_finance() or public.openlu_est_administrateur());

-- --- RLS paiements -----------------------------------------------------------------
alter table public.openlu_paiements enable row level security;

create policy "openlu_paiements_lecture_soi" on public.openlu_paiements
  for select using (etudiant_id = auth.uid());

create policy "openlu_paiements_lecture_gestion" on public.openlu_paiements
  for select using (public.openlu_est_administratif());

create policy "openlu_paiements_creation_gestion" on public.openlu_paiements
  for insert with check (public.openlu_est_administratif());

create policy "openlu_paiements_modification_gestion" on public.openlu_paiements
  for update using (public.openlu_est_administratif());

create policy "openlu_paiements_suppression_gestion" on public.openlu_paiements
  for delete using (public.openlu_est_administratif());

-- --- RLS paiements_enseignants ----------------------------------------------------------
alter table public.openlu_paiements_enseignants enable row level security;

create policy "openlu_paies_lecture_soi" on public.openlu_paiements_enseignants
  for select using (enseignant_id = auth.uid());

create policy "openlu_paies_lecture_gestion" on public.openlu_paiements_enseignants
  for select using (public.openlu_est_administratif());

create policy "openlu_paies_gestion_finance" on public.openlu_paiements_enseignants
  for all using (public.openlu_est_finance() or public.openlu_est_administrateur());

-- --- Index -------------------------------------------------------------------------------
create index if not exists openlu_frais_filiere_idx on public.openlu_frais_scolarite (filiere_id);
create index if not exists openlu_frais_faculte_idx on public.openlu_frais_scolarite (faculte_id);
create index if not exists openlu_paiements_etudiant_idx on public.openlu_paiements (etudiant_id);
create index if not exists openlu_paiements_frais_idx on public.openlu_paiements (frais_id);
create index if not exists openlu_paiements_statut_idx on public.openlu_paiements (statut);
create index if not exists openlu_paies_enseignant_idx on public.openlu_paiements_enseignants (enseignant_id);

-- 
-- ### 0006_apprentissage.sql
-- 
-- ============================================================
-- OPENLU · 0006 - Portail e-learning
-- ============================================================

-- --- Supports de cours ------------------------------------------
create table if not exists public.openlu_supports_cours (
  id            uuid primary key default gen_random_uuid(),
  cours_id      uuid not null references public.openlu_cours (id) on delete cascade,
  titre         text not null,
  type_support  text not null default 'document'
                check (type_support in ('document', 'video', 'exercice', 'lien')),
  url           text,
  description   text,
  cree_le       timestamptz not null default now(),
  mis_a_jour    timestamptz not null default now()
);

comment on table public.openlu_supports_cours is 'Ressources pédagogiques mises à disposition par le cours.';

-- --- Devoirs ---------------------------------------------------------
create table if not exists public.openlu_devoirs (
  id            uuid primary key default gen_random_uuid(),
  cours_id      uuid not null references public.openlu_cours (id) on delete cascade,
  titre         text not null,
  description   text,
  date_limite   timestamptz,
  bareme        numeric not null default 20 check (bareme > 0),
  cree_le       timestamptz not null default now(),
  mis_a_jour    timestamptz not null default now()
);

comment on table public.openlu_devoirs is 'Travaux à rendre proposés aux étudiants d un cours.';

-- --- Soumissions -------------------------------------------------------------
drop type if exists openlu_type_statut_soumission cascade;
create type openlu_type_statut_soumission as enum ('rendu', 'corrige', 'refuse');

create table if not exists public.openlu_soumissions (
  id                 uuid primary key default gen_random_uuid(),
  devoir_id          uuid not null references public.openlu_devoirs (id) on delete cascade,
  etudiant_id        uuid not null references public.openlu_profils (id) on delete cascade,
  url                text,
  contenu            text,
  statut             openlu_type_statut_soumission not null default 'rendu',
  note               numeric check (note is null or note >= 0),
  date_soumission    timestamptz not null default now(),
  mis_a_jour         timestamptz not null default now(),
  unique (devoir_id, etudiant_id)
);

comment on table public.openlu_soumissions is 'Copie rendue par un étudiant pour un devoir.';

-- --- Triggers mis à jour ---------------------------------------------------------
drop trigger if exists openlu_supports_maj on public.openlu_supports_cours;
create trigger openlu_supports_maj before update on public.openlu_supports_cours
  for each row execute function public.openlu_surveiller_mise_a_jour();

drop trigger if exists openlu_devoirs_maj on public.openlu_devoirs;
create trigger openlu_devoirs_maj before update on public.openlu_devoirs
  for each row execute function public.openlu_surveiller_mise_a_jour();

drop trigger if exists openlu_soumissions_maj on public.openlu_soumissions;
create trigger openlu_soumissions_maj before update on public.openlu_soumissions
  for each row execute function public.openlu_surveiller_mise_a_jour();

-- --- RLS supports_cours --------------------------------------------------------------
alter table public.openlu_supports_cours enable row level security;

create policy "openlu_supports_lecture_authentifies" on public.openlu_supports_cours
  for select using (auth.role() = 'authenticated');

create policy "openlu_supports_ecriture_enseignants" on public.openlu_supports_cours
  for all using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_cours c
      where c.id = cours_id and c.enseignant_id = auth.uid()
    )
  ) with check (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_cours c
      where c.id = cours_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_supports_administration_totale" on public.openlu_supports_cours
  for all using (public.openlu_est_administrateur());

-- --- RLS devoirs ------------------------------------------------------------------------
alter table public.openlu_devoirs enable row level security;

create policy "openlu_devoirs_lecture_authentifies" on public.openlu_devoirs
  for select using (auth.role() = 'authenticated');

create policy "openlu_devoirs_ecriture_enseignants" on public.openlu_devoirs
  for all using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_cours c
      where c.id = cours_id and c.enseignant_id = auth.uid()
    )
  ) with check (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_cours c
      where c.id = cours_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_devoirs_administration_totale" on public.openlu_devoirs
  for all using (public.openlu_est_administrateur());

-- --- RLS soumissions ------------------------------------------------------------------------
alter table public.openlu_soumissions enable row level security;

create policy "openlu_soumissions_lecture_soi" on public.openlu_soumissions
  for select using (etudiant_id = auth.uid());

create policy "openlu_soumissions_creation_soi" on public.openlu_soumissions
  for insert with check (etudiant_id = auth.uid());

create policy "openlu_soumissions_modification_soi" on public.openlu_soumissions
  for update using (etudiant_id = auth.uid())
  with check (public.openlu_est_etudiant());

create policy "openlu_soumissions_lecture_enseignants" on public.openlu_soumissions
  for select using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_devoirs d
      join public.openlu_cours c on c.id = d.cours_id
      where d.id = devoir_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_soumissions_correction_enseignants" on public.openlu_soumissions
  for update using (
    public.openlu_est_enseignant() and exists (
      select 1 from public.openlu_devoirs d
      join public.openlu_cours c on c.id = d.cours_id
      where d.id = devoir_id and c.enseignant_id = auth.uid()
    )
  );

create policy "openlu_soumissions_administration_totale" on public.openlu_soumissions
  for all using (public.openlu_est_administrateur());

-- --- Index ------------------------------------------------------------------------------------------
create index if not exists openlu_supports_cours_idx on public.openlu_supports_cours (cours_id);
create index if not exists openlu_devoirs_cours_idx on public.openlu_devoirs (cours_id);
create index if not exists openlu_soumissions_etudiant_idx on public.openlu_soumissions (etudiant_id);
create index if not exists openlu_soumissions_devoir_idx on public.openlu_soumissions (devoir_id);

-- 
-- ### 0007_stockage.sql
-- 
-- ============================================================
-- OPENLU · 0007 - Stockage (supports de cours, copies)
-- ============================================================

insert into storage.buckets (id, name, public)
values
  ('openlu_supports', 'openlu_supports', false),
  ('openlu_soumissions', 'openlu_soumissions', false)
on conflict (id) do nothing;

-- --- Supports : lecture par tous les authentifiés --------------------
create policy "openlu_supports_lecture_authentifies"
  on storage.objects for select
  using (bucket_id = 'openlu_supports' and auth.role() = 'authenticated');

-- --- Supports : écriture par enseignants et administrateurs ----------
create policy "openlu_supports_ecriture_pedagogique"
  on storage.objects for insert
  with check (
    bucket_id = 'openlu_supports'
    and (public.openlu_est_enseignant() or public.openlu_est_administrateur())
  );

create policy "openlu_supports_modification_pedagogique"
  on storage.objects for update
  using (
    bucket_id = 'openlu_supports'
    and (public.openlu_est_enseignant() or public.openlu_est_administrateur())
  );

create policy "openlu_supports_suppression_pedagogique"
  on storage.objects for delete
  using (
    bucket_id = 'openlu_supports'
    and (public.openlu_est_enseignant() or public.openlu_est_administrateur())
  );

-- --- Soumissions : l étudiant gère ses propres copies -----------------
create policy "openlu_soumissions_lecture_soi"
  on storage.objects for select
  using (bucket_id = 'openlu_soumissions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "openlu_soumissions_lecture_pedagogique"
  on storage.objects for select
  using (
    bucket_id = 'openlu_soumissions'
    and (public.openlu_est_enseignant() or public.openlu_est_administrateur())
  );

create policy "openlu_soumissions_ecriture_soi"
  on storage.objects for insert
  with check (
    bucket_id = 'openlu_soumissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "openlu_soumissions_modification_soi"
  on storage.objects for update
  using (
    bucket_id = 'openlu_soumissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "openlu_soumissions_suppression_soi"
  on storage.objects for delete
  using (
    bucket_id = 'openlu_soumissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 
-- ### seed.sql (donnees de demonstration)
-- 
-- ============================================================
-- OPENLU · Données de démonstration (pour découvrir l app)
-- Exécuté uniquement via `supabase db reset` (seed).
-- ============================================================

-- --- Facultés -------------------------------------------------
insert into public.openlu_facultes (code, nom, description, ordre) values
  ('SEG', 'Sciences Économiques et Gestion des Affaires', 'Administration, gestion, finance et entrepreneurship.', 1),
  ('PSE', 'Psychologie et Sciences de l''Éducation', 'Psychologie clinique, counseling et éducation.', 2),
  ('SAGE', 'Sciences Agronomiques et Gestion de l''Environnement', 'Agronomie, environnement, agro-business et projets ruraux.', 3),
  ('SATS', 'Sciences Appliquées, Technologiques et de la Santé', 'Informatique, chimie, biologie et santé publique.', 4),
  ('EIE', 'École d''Innovation et Entrepreneuriat (Diploma)', 'Diplomas professionnels : management, santé, numérique.', 5)
on conflict (code) do nothing;

-- --- Filières : SEG -------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'SEG-01', 'Administration des Affaires' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-02', 'Management du système Informatique' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-03', 'Management des infrastructures et Réseau Informatique' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-04', 'Logistique et transport' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-05', 'Marketing Digital' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-06', 'Management et Gestion des ressources humaines' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-07', 'Organisation et Communication d''entreprise' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-08', 'Finance et comptabilité' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-09', 'Logistique de santé' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-10', 'Gestion des archives et administration de bureau' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-11', 'Gestion des conflits' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-12', 'Tourisme et gestion hôtelière' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-13', 'Gestion des institutions et politique de système de Santé' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-14', 'Gestion de développement communautaire et Sanitaire' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-15', 'Entrepreneuriat et Gestion d''Innovation' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-16', 'Gouvernance, Paix et Transformation des Conflits' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-17', 'Gestion des achats et chaînes d''approvisionnement' from public.openlu_facultes f where f.code = 'SEG'
union all select f.id, 'SEG-18', 'Leadership Organisationnel' from public.openlu_facultes f where f.code = 'SEG'
on conflict (code) do nothing;

-- --- Filières : PSE -------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'PSE-01', 'Counseling & Psychologie Clinique' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-02', 'Counseling en addictologie & santé mentale' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-03', 'Psychologie Clinique & Psychopathologie' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-04', 'Psychologie sociale & communautaire' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-05', 'Sciences de l''éducation' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-06', 'Technologie Éducative' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-07', 'Curriculum & didactique' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-08', 'Pédagogie de l''enseignement Maternelle, Primaire et Secondaire' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-09', 'Administration & leadership éducatif' from public.openlu_facultes f where f.code = 'PSE'
union all select f.id, 'PSE-10', 'Éducation sociale' from public.openlu_facultes f where f.code = 'PSE'
on conflict (code) do nothing;

-- --- Filières : SAGE ------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'SAGE-01', 'Sciences du sol et production végétale' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-02', 'Chimie Bio-Industrie' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-03', 'Gestion de Biodiversité, gestion de sol, eau et Assainissement' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-04', 'Technologie post-production agricole' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-05', 'Agroécologie' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-06', 'Gestion des ressources naturelles et Environnementale' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-07', 'Gestion durable et de ressource renouvelable' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-08', 'Gestion de catastrophe et développement durable' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-09', 'Agro-Business' from public.openlu_facultes f where f.code = 'SAGE'
union all select f.id, 'SAGE-10', 'Gestion des projets et développement rural' from public.openlu_facultes f where f.code = 'SAGE'
on conflict (code) do nothing;

-- --- Filières : SATS ------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'SATS-01', 'Chimie appliquée et Biologie' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-02', 'Informatique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-03', 'Ingénierie informatique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-04', 'Informatique Biomédicale et de Santé' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-05', 'Sciences et Analyse des données' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-06', 'Mathématique informatique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-07', 'Santé Publique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-08', 'Nutrition et santé communautaire' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-09', 'Épidémiologie et contrôle des maladies' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-10', 'Bio-statique et Santé Numérique' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-11', 'Santé Environnementale et Hygiène' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-12', 'Promotion de la Santé et Prévention' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-13', 'Santé Maternelle, Néonatale et Infantile' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-14', 'Santé infirmière et médecine familiale' from public.openlu_facultes f where f.code = 'SATS'
union all select f.id, 'SATS-15', 'Innovation et technologie alimentaire' from public.openlu_facultes f where f.code = 'SATS'
on conflict (code) do nothing;

-- --- Filières : EIE -------------------------------------------
insert into public.openlu_filieres (faculte_id, code, nom)
select f.id, 'EIE-01', 'Système Informatique et entrepreneuriat' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-02', 'Gestion Informatique et Réseaux' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-03', 'Analyse des données & Business Intelligence' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-04', 'Réseaux, IoT & maintenance systems' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-05', 'Développement web & mobile' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-06', 'Management des affaires & Entrepreneuriat' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-07', 'Entrepreneuriat social & innovation frugale' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-08', 'Gestion de projet' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-09', 'Gestion des urgences & sécurité' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-10', 'Informatique de santé & télémédecine' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-11', 'Nutrition & santé communautaire' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-12', 'Counseling & accompagnement psychosocial' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-13', 'Agro-transformation & agriculture intelligente' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-14', 'Logistique & supply chain' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-15', 'Conception pédagogique digitale & e-Learning' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-16', 'Leadership éducatif & administration scolaire' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-17', 'Agro-entrepreneuriat & Chaînes de valeur' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-18', 'Sécurité Alimentaire, Nutrition' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-19', 'Diplomatie Économique & Coopération Transfrontalière' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-20', 'Bonne Gouvernance, Intégrité & Gestion Publique' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-21', 'Gestion des Conflits, Médiation & Consolidation de la Paix' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-22', 'Action Humanitaire, Protection & Gestion des Urgences' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-23', 'Décentralisation, Politiques Publiques & Management Territorial' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-24', 'Agro-transformation & packaging' from public.openlu_facultes f where f.code = 'EIE'
union all select f.id, 'EIE-25', 'Finance agricole & gestion coopérative' from public.openlu_facultes f where f.code = 'EIE'
on conflict (code) do nothing;

-- --- Cours de démonstration ------------------------------------
insert into public.openlu_cours (code, titre, description, credits, semestre) values
  ('ALGO1', 'Algorithmique et Programmation 1', 'Bases de l algorithmique et du langage C.', 6, 1),
  ('DB1', 'Bases de Données', 'Modélisation relationnelle et SQL.', 6, 1),
  ('WEB1', 'Développement Web', 'HTML/CSS, JavaScript et frameworks modernes.', 6, 2),
  ('RES1', 'Réseaux de Communication', 'Architecture OSI/TCP/IP, routage.', 6, 2)
on conflict (code) do nothing;

-- ============================================================
-- OPENLU · 0008 - Tableau d'annonces public et pièces jointes
-- ============================================================

create table if not exists public.openlu_annonces (
  id           uuid primary key default gen_random_uuid(),
  titre        text not null,
  contenu      text not null,
  publiee      boolean not null default false,
  publiee_le   timestamptz,
  auteur_id    uuid references public.openlu_profils (id) on delete set null,
  cree_le      timestamptz not null default now(),
  mis_a_jour   timestamptz not null default now(),
  constraint openlu_annonces_titre_longueur check (char_length(titre) between 3 and 160),
  constraint openlu_annonces_contenu_longueur check (char_length(contenu) between 3 and 12000)
);

create table if not exists public.openlu_annonces_fichiers (
  id             uuid primary key default gen_random_uuid(),
  annonce_id     uuid not null references public.openlu_annonces (id) on delete cascade,
  nom            text not null,
  chemin         text not null unique,
  type_mime      text not null,
  taille_octets  bigint not null,
  cree_le        timestamptz not null default now(),
  constraint openlu_annonces_fichiers_taille check (taille_octets between 1 and 4194304)
);

create index if not exists openlu_annonces_publication_idx
  on public.openlu_annonces (publiee, publiee_le desc, cree_le desc);
create index if not exists openlu_annonces_fichiers_annonce_idx
  on public.openlu_annonces_fichiers (annonce_id);

drop trigger if exists openlu_annonces_maj on public.openlu_annonces;
create trigger openlu_annonces_maj before update on public.openlu_annonces
  for each row execute function public.openlu_surveiller_mise_a_jour();

alter table public.openlu_annonces enable row level security;
alter table public.openlu_annonces_fichiers enable row level security;

drop policy if exists "openlu_annonces_lecture_publique" on public.openlu_annonces;
create policy "openlu_annonces_lecture_publique" on public.openlu_annonces
  for select to anon, authenticated
  using (publiee = true);

drop policy if exists "openlu_annonces_gestion_admin" on public.openlu_annonces;
create policy "openlu_annonces_gestion_admin" on public.openlu_annonces
  for all to authenticated
  using (public.openlu_est_administrateur())
  with check (public.openlu_est_administrateur());

drop policy if exists "openlu_annonces_fichiers_lecture_publication" on public.openlu_annonces_fichiers;
create policy "openlu_annonces_fichiers_lecture_publication" on public.openlu_annonces_fichiers
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.openlu_annonces a
      where a.id = annonce_id and a.publiee = true
    )
  );

drop policy if exists "openlu_annonces_fichiers_gestion_admin" on public.openlu_annonces_fichiers;
create policy "openlu_annonces_fichiers_gestion_admin" on public.openlu_annonces_fichiers
  for all to authenticated
  using (public.openlu_est_administrateur())
  with check (public.openlu_est_administrateur());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'openlu_annonces',
  'openlu_annonces',
  false,
  4194304,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 
-- ### 0009_notifications_tresorerie.sql
-- 
-- ============================================================
-- OPENLU · 0009 - Notifications temps réel & trésorerie
-- ============================================================

-- --- Notifications ------------------------------------------
drop type if exists openlu_type_notification cascade;
create type openlu_type_notification as enum (
  'info', 'succes', 'alerte', 'paiement', 'note', 'annonce'
);

create table if not exists public.openlu_notifications (
  id              uuid primary key default gen_random_uuid(),
  destinataire_id uuid not null references public.openlu_profils (id) on delete cascade,
  titre           text not null,
  message         text,
  type            openlu_type_notification not null default 'info',
  lien            text,
  lue             boolean not null default false,
  cree_le         timestamptz not null default now()
);

comment on table public.openlu_notifications is 'Notifications personnelles poussées en temps réel.';

create index if not exists openlu_notifications_destinataire_idx
  on public.openlu_notifications (destinataire_id, lue, cree_le desc);

alter table public.openlu_notifications enable row level security;

create policy "openlu_notifications_lecture_soi" on public.openlu_notifications
  for select using (destinataire_id = auth.uid());

create policy "openlu_notifications_modification_soi" on public.openlu_notifications
  for update using (destinataire_id = auth.uid())
  with check (destinataire_id = auth.uid());

create policy "openlu_notifications_suppression_soi" on public.openlu_notifications
  for delete using (destinataire_id = auth.uid());

create policy "openlu_notifications_creation_administrative" on public.openlu_notifications
  for insert with check (public.openlu_est_administratif() or public.openlu_est_enseignant());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'openlu_notifications'
  ) then
    alter publication supabase_realtime add table public.openlu_notifications;
  end if;
end
$$;

-- --- Trésorerie : entrées et sorties ------------------------
drop type if exists openlu_type_transaction cascade;
create type openlu_type_transaction as enum ('entree', 'sortie');

drop type if exists openlu_type_categorie_transaction cascade;
create type openlu_type_categorie_transaction as enum (
  'scolarite',
  'salaire',
  'fourniture',
  'loyer',
  'service',
  'subvention',
  'don',
  'maintenance',
  'autre'
);

create table if not exists public.openlu_transactions (
  id                uuid primary key default gen_random_uuid(),
  type              openlu_type_transaction not null,
  categorie         openlu_type_categorie_transaction not null default 'autre',
  libelle           text not null,
  montant           numeric not null check (montant > 0),
  devise               text not null default 'CDF',
  methode           openlu_type_methode_paiement not null default 'especes',
  reference         text not null unique default ('TRX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  date_transaction  date not null default current_date,
  description       text,
  source_id         uuid,
  enregistre_par    uuid references public.openlu_profils (id),
  cree_le           timestamptz not null default now(),
  mis_a_jour        timestamptz not null default now()
);

comment on table public.openlu_transactions is 'Journal de caisse : entrées et sorties de l''université.';

drop trigger if exists openlu_transactions_maj on public.openlu_transactions;
create trigger openlu_transactions_maj before update on public.openlu_transactions
  for each row execute function public.openlu_surveiller_mise_a_jour();

create index if not exists openlu_transactions_type_idx on public.openlu_transactions (type);
create index if not exists openlu_transactions_date_idx on public.openlu_transactions (date_transaction desc);
create index if not exists openlu_transactions_categorie_idx on public.openlu_transactions (categorie);

alter table public.openlu_transactions enable row level security;

create policy "openlu_transactions_lecture_gestion" on public.openlu_transactions
  for select using (public.openlu_est_administratif());

create policy "openlu_transactions_gestion_finance" on public.openlu_transactions
  for all using (public.openlu_est_finance() or public.openlu_est_administrateur())
  with check (public.openlu_est_finance() or public.openlu_est_administrateur());

-- 
-- ### 0010_abonnements_push.sql
-- 
-- ============================================================
-- OPENLU · 0010 - Abonnements Web Push (notifications app fermée)
-- ============================================================

create table if not exists public.openlu_abonnements_push (
  id             uuid primary key default gen_random_uuid(),
  utilisateur_id uuid not null references public.openlu_profils (id) on delete cascade,
  endpoint       text not null unique,
  p256dh         text not null,
  auth           text not null,
  user_agent     text,
  cree_le        timestamptz not null default now()
);

comment on table public.openlu_abonnements_push is
  'Abonnements Web Push par appareil (mobile / bureau) pour recevoir les notifications app fermée.';

create index if not exists openlu_abonnements_push_utilisateur_idx
  on public.openlu_abonnements_push (utilisateur_id);

alter table public.openlu_abonnements_push enable row level security;

create policy "openlu_abonnements_lecture_soi" on public.openlu_abonnements_push
  for select using (utilisateur_id = auth.uid());

create policy "openlu_abonnements_creation_soi" on public.openlu_abonnements_push
  for insert with check (utilisateur_id = auth.uid());

create policy "openlu_abonnements_modification_soi" on public.openlu_abonnements_push
  for update using (utilisateur_id = auth.uid())
  with check (utilisateur_id = auth.uid());

create policy "openlu_abonnements_suppression_soi" on public.openlu_abonnements_push
  for delete using (utilisateur_id = auth.uid());

commit;
