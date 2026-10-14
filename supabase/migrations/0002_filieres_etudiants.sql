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