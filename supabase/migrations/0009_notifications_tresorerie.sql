-- ============================================================
-- OPENLU · 0009 - Notifications temps réel & trésorerie
-- ============================================================

-- ------------------------------------------------------------
-- 1. Notifications (diffusion en temps réel via Supabase Realtime)
-- ------------------------------------------------------------
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

drop policy if exists "openlu_notifications_lecture_soi" on public.openlu_notifications;
create policy "openlu_notifications_lecture_soi" on public.openlu_notifications
  for select using (destinataire_id = auth.uid());

drop policy if exists "openlu_notifications_modification_soi" on public.openlu_notifications;
create policy "openlu_notifications_modification_soi" on public.openlu_notifications
  for update using (destinataire_id = auth.uid())
  with check (destinataire_id = auth.uid());

drop policy if exists "openlu_notifications_suppression_soi" on public.openlu_notifications;
create policy "openlu_notifications_suppression_soi" on public.openlu_notifications
  for delete using (destinataire_id = auth.uid());

drop policy if exists "openlu_notifications_creation_administrative" on public.openlu_notifications;
create policy "openlu_notifications_creation_administrative" on public.openlu_notifications
  for insert with check (public.openlu_est_administratif() or public.openlu_est_enseignant());

-- Active la diffusion temps réel sur la table des notifications.
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

-- ------------------------------------------------------------
-- 2. Trésorerie : entrées et sorties (caisse de l'université)
-- ------------------------------------------------------------
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
  devise            text not null default 'CDF',
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

drop policy if exists "openlu_transactions_lecture_gestion" on public.openlu_transactions;
create policy "openlu_transactions_lecture_gestion" on public.openlu_transactions
  for select using (public.openlu_est_administratif());

drop policy if exists "openlu_transactions_gestion_finance" on public.openlu_transactions;
create policy "openlu_transactions_gestion_finance" on public.openlu_transactions
  for all using (public.openlu_est_finance() or public.openlu_est_administrateur())
  with check (public.openlu_est_finance() or public.openlu_est_administrateur());
