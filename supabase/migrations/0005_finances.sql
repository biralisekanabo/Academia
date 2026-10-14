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
  devise               text not null default 'FCFA',
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