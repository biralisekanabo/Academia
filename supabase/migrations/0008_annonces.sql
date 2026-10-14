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
