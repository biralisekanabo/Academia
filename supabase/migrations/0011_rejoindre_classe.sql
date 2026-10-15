-- ============================================================
-- OPENLU · 0011 - Rejoindre une classe par lien + messagerie
-- ============================================================
-- L'enseignant génère un lien public contenant le jeton du cours. Le chef
-- de promotion le partage aux étudiants. En ouvrant le lien, l'étudiant
-- saisit son identité complète, est inscrit au cours puis redirigé dedans.
-- Cette migration est idempotente (rejouable sans erreur).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Colonnes d'inscription par lien sur les cours
-- ------------------------------------------------------------
alter table public.openlu_cours
  add column if not exists jeton_inscription text;
alter table public.openlu_cours
  add column if not exists inscription_ouverte boolean not null default true;

update public.openlu_cours
  set jeton_inscription = replace(gen_random_uuid()::text, '-', '')
  where jeton_inscription is null;

alter table public.openlu_cours
  alter column jeton_inscription set default replace(gen_random_uuid()::text, '-', '');
alter table public.openlu_cours
  alter column jeton_inscription set not null;

create unique index if not exists openlu_cours_jeton_key
  on public.openlu_cours (jeton_inscription);

comment on column public.openlu_cours.jeton_inscription is
  'Jeton public partagé pour l inscription autonome via un lien.';
comment on column public.openlu_cours.inscription_ouverte is
  'Autorise l inscription autonome par lien tant que vrai.';

-- ------------------------------------------------------------
-- 2. Fonction publique : cours par jeton (lecture visiteur)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 3. Messagerie de classe (enseignant -> étudiants)
-- ------------------------------------------------------------
create table if not exists public.openlu_messages_cours (
  id         uuid primary key default gen_random_uuid(),
  cours_id   uuid not null references public.openlu_cours (id) on delete cascade,
  auteur_id  uuid references public.openlu_profils (id) on delete set null,
  contenu    text not null,
  cree_le    timestamptz not null default now(),
  constraint openlu_messages_cours_contenu check (char_length(contenu) between 1 and 8000)
);

comment on table public.openlu_messages_cours is
  'Fil de messages publiés par l enseignant d un cours.';

create index if not exists openlu_messages_cours_idx
  on public.openlu_messages_cours (cours_id, cree_le desc);

alter table public.openlu_messages_cours enable row level security;

drop policy if exists "openlu_messages_lecture_membres" on public.openlu_messages_cours;
create policy "openlu_messages_lecture_membres" on public.openlu_messages_cours
  for select using (
    public.openlu_est_administratif()
    or (
      public.openlu_est_enseignant() and exists (
        select 1 from public.openlu_cours c
        where c.id = cours_id and c.enseignant_id = auth.uid()
      )
    )
    or exists (
      select 1 from public.openlu_inscriptions_cours i
      where i.cours_id = cours_id and i.etudiant_id = auth.uid()
    )
  );

drop policy if exists "openlu_messages_ecriture_enseignants" on public.openlu_messages_cours;
create policy "openlu_messages_ecriture_enseignants" on public.openlu_messages_cours
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

drop policy if exists "openlu_messages_administration_totale" on public.openlu_messages_cours;
create policy "openlu_messages_administration_totale" on public.openlu_messages_cours
  for all using (public.openlu_est_administrateur());
