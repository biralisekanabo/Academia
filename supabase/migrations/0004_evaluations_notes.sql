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