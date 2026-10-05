-- Dekket — announced changes, document versions, and e-mail reminders.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run. Safe to re-run.
-- Run order for a fresh setup:
--   documents → account → dashboard → doc-kind → payers-documents-providers → payments → versions-reminders
--
-- 1) policies.next_change_date / next_annual_premium / next_change_note — a change the insurer has ANNOUNCED
--    (for example "from 1 January the price rises to …"), so the app can show it and remind about it.
-- 2) policy_versions — older versions of a policy's document. The current file stays on the policy row; when the
--    user uploads a new version, the function add_policy_version() moves the old one here (with a snapshot of the
--    price and dates it had), so the history is kept and changes between versions can be shown.
-- 3) notification_settings — per user: are e-mail reminders on, and how many days before.
-- 4) reminders_sent — a log so the daily job never sends the same reminder twice. Only the server job (service
--    role) can read or write it; users cannot.
-- 5) The activity log trigger is replaced so it also records the new fields (and a new file = "Fil" changed).

-- 1) Announced change -----------------------------------------------------------------------------

alter table public.policies add column if not exists next_change_date date;
alter table public.policies add column if not exists next_annual_premium numeric(12, 2);  -- NOK per year, from that date
alter table public.policies add column if not exists next_change_note text;

alter table public.policies drop constraint if exists policies_next_premium_check;
alter table public.policies add constraint policies_next_premium_check
  check (next_annual_premium is null or next_annual_premium >= 0);

grant update (next_change_date, next_annual_premium, next_change_note) on public.policies to authenticated;

-- 2) Versions ---------------------------------------------------------------------------------------

-- When the CURRENT file was uploaded, and what the user wrote about it. (Filled for old rows from created_at.)
alter table public.policies add column if not exists file_added_at timestamptz;
update public.policies set file_added_at = created_at where file_added_at is null;
alter table public.policies alter column file_added_at set default now();
alter table public.policies alter column file_added_at set not null;
alter table public.policies add column if not exists version_note text;

create table if not exists public.policy_versions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  policy_id        uuid not null references public.policies (id) on delete cascade,
  created_at       timestamptz not null default now(),  -- when this version was replaced by a newer one
  added_at         timestamptz,                         -- when this file was originally uploaded
  note             text,                                -- what the user wrote about this version
  file_path        text not null,
  file_name        text not null,
  file_size        bigint,
  mime_type        text,
  doc_kind         text,
  -- snapshot of what was true while this version was current:
  insurer          text,
  valid_from       date,
  valid_to         date,
  annual_premium   numeric(12, 2),
  fee_per_payment  numeric(10, 2)
);

create index if not exists policy_versions_policy_idx on public.policy_versions (policy_id, created_at desc);

alter table public.policy_versions enable row level security;

-- Users can read and delete their old versions. They can NOT insert: only add_policy_version() does that.
grant select, delete on public.policy_versions to authenticated;

drop policy if exists "Own versions: select" on public.policy_versions;
create policy "Own versions: select" on public.policy_versions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Own versions: delete" on public.policy_versions;
create policy "Own versions: delete" on public.policy_versions
  for delete to authenticated using (user_id = (select auth.uid()));

-- Replaces a policy's file with a new version and keeps the old one as history. The browser cannot change
-- file_path directly (column-level grants), so this small SECURITY DEFINER function does it, after checking
-- that the policy is the caller's and that the new file sits in the caller's own storage folder.
create or replace function public.add_policy_version(
  p_policy uuid, p_path text, p_name text, p_size bigint, p_mime text, p_note text, p_consent_version text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur public.policies%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into cur from public.policies where id = p_policy and user_id = auth.uid() for update;
  if not found then
    raise exception 'Policy not found';
  end if;

  if split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'The file must be in your own folder';
  end if;

  insert into public.policy_versions (
    user_id, policy_id, added_at, note, file_path, file_name, file_size, mime_type, doc_kind,
    insurer, valid_from, valid_to, annual_premium, fee_per_payment
  ) values (
    cur.user_id, cur.id, cur.file_added_at, cur.version_note, cur.file_path, cur.file_name, cur.file_size,
    cur.mime_type, cur.doc_kind, cur.insurer, cur.valid_from, cur.valid_to, cur.annual_premium, cur.fee_per_payment
  );

  update public.policies
     set file_path = p_path,
         file_name = p_name,
         file_size = p_size,
         mime_type = p_mime,
         version_note = nullif(trim(p_note), ''),
         file_added_at = now(),
         consent_at = now(),
         consent_version = p_consent_version
   where id = p_policy;
end;
$$;

revoke all on function public.add_policy_version(uuid, text, text, bigint, text, text, text) from public, anon;
grant execute on function public.add_policy_version(uuid, text, text, bigint, text, text, text) to authenticated;

-- 3) Reminder settings --------------------------------------------------------------------------------

create table if not exists public.notification_settings (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email_reminders boolean not null default false,       -- OFF until the user turns it on
  lead_days       integer[] not null default '{30,7}',   -- how many days before to remind
  updated_at      timestamptz not null default now()
);

alter table public.notification_settings enable row level security;
grant select, insert, update on public.notification_settings to authenticated;

drop policy if exists "Own settings: select" on public.notification_settings;
create policy "Own settings: select" on public.notification_settings
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Own settings: insert" on public.notification_settings;
create policy "Own settings: insert" on public.notification_settings
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "Own settings: update" on public.notification_settings;
create policy "Own settings: update" on public.notification_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 4) Reminder log (server job only) -----------------------------------------------------------------

create table if not exists public.reminders_sent (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  policy_id   uuid not null references public.policies (id) on delete cascade,
  kind        text not null,        -- renewal | change
  target_date date not null,        -- the renewal / change date the reminder was about
  lead_days   integer not null,     -- which reminder bucket (e.g. 30 or 7)
  sent_at     timestamptz not null default now(),
  unique (policy_id, kind, target_date, lead_days)
);

alter table public.reminders_sent enable row level security;  -- no policies: users cannot touch it

-- The daily job runs with the service role. Grant it exactly what it needs (service role skips RLS, but still
-- needs table privileges because new tables are not exposed automatically in this project).
grant select on public.policies to service_role;
grant select on public.notification_settings to service_role;
grant select, insert, delete on public.reminders_sent to service_role;  -- delete: undo a claim when sending fails

-- 5) Activity log: record the new fields too ---------------------------------------------------------

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
    foreach field in array array[
      'title', 'insurance_type', 'insurer', 'holder', 'payer', 'doc_kind',
      'valid_from', 'valid_to', 'annual_premium',
      'auto_renews', 'payment_frequency', 'payment_anchor', 'fee_per_payment',
      'next_change_date', 'next_annual_premium', 'file_name'
    ]
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
