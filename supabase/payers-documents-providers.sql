-- Dekket — who pays, "other documents", and insurance providers.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run. Safe to re-run.
-- Run order for a fresh setup:
--   documents.sql → account.sql → dashboard.sql → doc-kind.sql → payers-documents-providers.sql
--
-- 1) policies.payer — who PAYS the premium (can differ from who holds the policy, `holder`).
--    Existing rows get payer = holder once (e.g. "via jobben" → the job pays); the user can change it.
-- 2) `documents` — documents that are not insurance (housing-association bylaws, purchase contracts …).
--    The files live in the same private storage bucket (`policies`), in the user's own folder.
-- 3) `providers` — the insurance companies the user deals with: contact details, claims link, logo.
--    Logos live in a private bucket `provider-logos` (small images, max 512 kB).
-- 4) The activity log trigger is replaced so it also records changes to payer and document type.

-- 1) Who pays ------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'policies' and column_name = 'payer'
  ) then
    alter table public.policies add column payer text not null default 'private';
      -- private | work | sameie | spouse | other
    update public.policies set payer = holder where holder <> 'private';
  end if;
end $$;

grant update (payer) on public.policies to authenticated;

-- 2) Other documents ------------------------------------------------------------

create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  title           text not null,
  category        text not null default 'other',  -- bylaws | housing | other
  notes           text,
  doc_date        date,                            -- e.g. when the document was issued or adopted
  file_path       text not null,                   -- path inside the `policies` bucket: <user_id>/<uuid>.<ext>
  file_name       text not null,
  file_size       bigint,
  mime_type       text,
  consent_at      timestamptz,
  consent_version text
);

create index if not exists documents_user_created_idx on public.documents (user_id, created_at desc);

alter table public.documents enable row level security;

grant select, insert, delete on public.documents to authenticated;
grant update (title, category, notes, doc_date) on public.documents to authenticated;

drop policy if exists "Own documents: select" on public.documents;
create policy "Own documents: select" on public.documents
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Own documents: insert" on public.documents;
create policy "Own documents: insert" on public.documents
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Own documents: update" on public.documents;
create policy "Own documents: update" on public.documents
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Own documents: delete" on public.documents;
create policy "Own documents: delete" on public.documents
  for delete to authenticated using (user_id = (select auth.uid()));

-- 3) Insurance providers ----------------------------------------------------------

create table if not exists public.providers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now(),
  name            text not null,
  website_url     text,
  claims_url      text,     -- where to report a claim ("meld skade")
  phone           text,     -- customer service
  claims_phone    text,     -- claims line
  email           text,
  address         text,
  customer_number text,
  notes           text,
  logo_path       text      -- path inside the `provider-logos` bucket: <user_id>/<uuid>.png
);

create index if not exists providers_user_name_idx on public.providers (user_id, name);

alter table public.providers enable row level security;

grant select, insert, delete on public.providers to authenticated;
grant update (name, website_url, claims_url, phone, claims_phone, email, address, customer_number, notes, logo_path)
  on public.providers to authenticated;

drop policy if exists "Own providers: select" on public.providers;
create policy "Own providers: select" on public.providers
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Own providers: insert" on public.providers;
create policy "Own providers: insert" on public.providers
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Own providers: update" on public.providers;
create policy "Own providers: update" on public.providers
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Own providers: delete" on public.providers;
create policy "Own providers: delete" on public.providers
  for delete to authenticated using (user_id = (select auth.uid()));

-- Private bucket for the logos, one folder per user (same pattern as the documents bucket).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provider-logos', 'provider-logos', false, 524288, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

grant select, insert, delete on storage.objects to authenticated;

drop policy if exists "Own logos: select" on storage.objects;
create policy "Own logos: select" on storage.objects
  for select to authenticated
  using (bucket_id = 'provider-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Own logos: insert" on storage.objects;
create policy "Own logos: insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'provider-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Own logos: delete" on storage.objects;
create policy "Own logos: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'provider-logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 4) Activity log: also record payer and document type -------------------------------
-- Same function as in dashboard.sql, plus the two new fields. They are read through to_jsonb()
-- so the function keeps working even if a column has not been added yet.

create or replace function public.log_policy_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  diff jsonb := '{}'::jsonb;
  o jsonb;
  n jsonb;
  field text;
begin
  if tg_op = 'INSERT' then
    insert into public.policy_events (user_id, policy_id, event, title, insurance_type)
    values (new.user_id, new.id, 'added', new.title, new.insurance_type);
    return new;

  elsif tg_op = 'UPDATE' then
    o := to_jsonb(old);
    n := to_jsonb(new);
    foreach field in array array['title', 'insurance_type', 'insurer', 'holder', 'payer', 'doc_kind', 'valid_from', 'valid_to', 'annual_premium']
    loop
      if (n -> field) is distinct from (o -> field) then
        diff := diff || jsonb_build_object(field, jsonb_build_array(o -> field, n -> field));
      end if;
    end loop;

    if diff <> '{}'::jsonb then
      insert into public.policy_events (user_id, policy_id, event, title, insurance_type, changes)
      values (new.user_id, new.id, 'updated', new.title, new.insurance_type, diff);
    end if;
    return new;

  else -- DELETE
    insert into public.policy_events (user_id, policy_id, event, title, insurance_type)
    values (old.user_id, old.id, 'deleted', old.title, old.insurance_type);
    return old;
  end if;
end;
$$;

revoke all on function public.log_policy_event() from public, anon, authenticated;
