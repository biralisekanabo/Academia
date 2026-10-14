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