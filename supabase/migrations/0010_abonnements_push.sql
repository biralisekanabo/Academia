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

drop policy if exists "openlu_abonnements_lecture_soi" on public.openlu_abonnements_push;
create policy "openlu_abonnements_lecture_soi" on public.openlu_abonnements_push
  for select using (utilisateur_id = auth.uid());

drop policy if exists "openlu_abonnements_creation_soi" on public.openlu_abonnements_push;
create policy "openlu_abonnements_creation_soi" on public.openlu_abonnements_push
  for insert with check (utilisateur_id = auth.uid());

drop policy if exists "openlu_abonnements_modification_soi" on public.openlu_abonnements_push;
create policy "openlu_abonnements_modification_soi" on public.openlu_abonnements_push
  for update using (utilisateur_id = auth.uid())
  with check (utilisateur_id = auth.uid());

drop policy if exists "openlu_abonnements_suppression_soi" on public.openlu_abonnements_push;
create policy "openlu_abonnements_suppression_soi" on public.openlu_abonnements_push
  for delete using (utilisateur_id = auth.uid());
