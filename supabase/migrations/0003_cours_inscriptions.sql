-- ============================================================
-- OPENLU · 0003 - Cours, inscriptions et emploi du temps
-- ============================================================

-- --- Cours -----------------------------------------------------
create table if not exists public.openlu_cours (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  titre         text not null,
  description   text,
  credits       numeric not null default 6 check (credits > 0),
  semestre      int not null default 1 check (semestre between 1 and 8),
  enseignant_id uuid references public.openlu_profils (id) on delete set null,
  cree_le       timestamptz not null default now(),
  mis_a_jour    timestamptz not null default now()
);

comment on table public.openlu_cours is 'Catalogue des cours de l université.';

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