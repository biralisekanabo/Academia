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