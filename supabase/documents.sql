-- Dekket — step 2: uploaded insurance documents.
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run (uses "if not exists" / "drop ... if exists").
--
-- What it creates:
--   1. A table `policies` with one row per uploaded document (who, what, where the file is).
--   2. A PRIVATE storage bucket `policies` that holds the actual files.
--   3. Row-level security (RLS) so every user can only see and change their OWN rows/files.
--
-- Because "Automatically expose new tables" is OFF in this project, nothing is reachable
-- from the browser until we grant it explicitly — that's what the `grant` lines do.

-- 1) Table ------------------------------------------------------------------

create table if not exists public.policies (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  title          text not null,                 -- name the user sees, e.g. "Hjemforsikring 2026"
  insurance_type text not null default 'other', -- home, contents, car, travel, health, life, other
  insurer        text,                          -- e.g. "If", "Gjensidige"
  file_path      text not null,                 -- path inside the `policies` bucket: <user_id>/<uuid>.<ext>
  file_name      text not null,                 -- original file name
  file_size      bigint,
  mime_type      text
);

create index if not exists policies_user_created_idx
  on public.policies (user_id, created_at desc);

alter table public.policies enable row level security;

-- Only logged-in users get access at all (anon = not logged in gets nothing).
grant select, insert, delete on public.policies to authenticated;

drop policy if exists "Own policies: select" on public.policies;
create policy "Own policies: select" on public.policies
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Own policies: insert" on public.policies;
create policy "Own policies: insert" on public.policies
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Own policies: delete" on public.policies;
create policy "Own policies: delete" on public.policies
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 2) Private storage bucket ---------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'policies', 'policies', false,
  10485760,  -- 10 MB per file
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 3) Storage rules: a user may only touch files in their own folder (<user_id>/...) ----

grant select, insert, delete on storage.objects to authenticated;

drop policy if exists "Own policy files: select" on storage.objects;
create policy "Own policy files: select" on storage.objects
  for select to authenticated
  using (bucket_id = 'policies' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Own policy files: insert" on storage.objects;
create policy "Own policy files: insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'policies' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Own policy files: delete" on storage.objects;
create policy "Own policy files: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'policies' and (storage.foldername(name))[1] = (select auth.uid())::text);
