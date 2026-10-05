-- Dekket — dashboard data: who holds the policy, dates, price, editing, and an activity log.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run. Run order for a fresh setup: documents.sql → account.sql → dashboard.sql.
--
-- What it does:
--   1. New columns on `policies`: holder (who took it out), valid_from / valid_to, annual_premium.
--   2. Lets the user EDIT those fields (and title, type, insurer) — but nothing else, so file_path,
--      user_id etc. can't be tampered with from the browser.
--   3. A table `policy_events` that logs every add / change / delete of a policy automatically
--      (database triggers, so it can't be skipped or faked by the browser). The user can read
--      their own log, but not write to it.

-- 1) New columns ------------------------------------------------------------

alter table public.policies add column if not exists holder text not null default 'private';
  -- private | work | sameie | spouse | other
alter table public.policies add column if not exists valid_from date;
alter table public.policies add column if not exists valid_to date;          -- end / renewal date
alter table public.policies add column if not exists annual_premium numeric(12, 2);  -- NOK per year

alter table public.policies drop constraint if exists policies_premium_check;
alter table public.policies add constraint policies_premium_check
  check (annual_premium is null or annual_premium >= 0);

alter table public.policies drop constraint if exists policies_dates_check;
alter table public.policies add constraint policies_dates_check
  check (valid_from is null or valid_to is null or valid_to >= valid_from);

-- 2) Editing ------------------------------------------------------------------

-- Column-level grant: only these columns can be changed from the browser.
grant update (title, insurance_type, insurer, holder, valid_from, valid_to, annual_premium)
  on public.policies to authenticated;

drop policy if exists "Own policies: update" on public.policies;
create policy "Own policies: update" on public.policies
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3) Activity log -------------------------------------------------------------

create table if not exists public.policy_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,           -- no foreign key on purpose: see delete_my_account() in account.sql
  policy_id      uuid,
  event          text not null check (event in ('added', 'updated', 'deleted')),
  title          text,
  insurance_type text,
  changes        jsonb,                   -- for 'updated': { "valid_to": ["2025-06-30", "2026-06-30"], ... }
  created_at     timestamptz not null default now()
);

create index if not exists policy_events_user_created_idx
  on public.policy_events (user_id, created_at desc);

alter table public.policy_events enable row level security;

-- Read-only for the user. Nobody can write from the browser — only the trigger below does.
grant select on public.policy_events to authenticated;

drop policy if exists "Own events: select" on public.policy_events;
create policy "Own events: select" on public.policy_events
  for select to authenticated
  using (user_id = (select auth.uid()));

-- The trigger function runs with the rights of its owner (security definer), so it can write
-- to the log even though the user can't.
create or replace function public.log_policy_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  diff jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.policy_events (user_id, policy_id, event, title, insurance_type)
    values (new.user_id, new.id, 'added', new.title, new.insurance_type);
    return new;

  elsif tg_op = 'UPDATE' then
    if new.title is distinct from old.title then
      diff := diff || jsonb_build_object('title', jsonb_build_array(old.title, new.title));
    end if;
    if new.insurance_type is distinct from old.insurance_type then
      diff := diff || jsonb_build_object('insurance_type', jsonb_build_array(old.insurance_type, new.insurance_type));
    end if;
    if new.insurer is distinct from old.insurer then
      diff := diff || jsonb_build_object('insurer', jsonb_build_array(old.insurer, new.insurer));
    end if;
    if new.holder is distinct from old.holder then
      diff := diff || jsonb_build_object('holder', jsonb_build_array(old.holder, new.holder));
    end if;
    if new.valid_from is distinct from old.valid_from then
      diff := diff || jsonb_build_object('valid_from', jsonb_build_array(old.valid_from, new.valid_from));
    end if;
    if new.valid_to is distinct from old.valid_to then
      diff := diff || jsonb_build_object('valid_to', jsonb_build_array(old.valid_to, new.valid_to));
    end if;
    if new.annual_premium is distinct from old.annual_premium then
      diff := diff || jsonb_build_object('annual_premium', jsonb_build_array(old.annual_premium, new.annual_premium));
    end if;

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

drop trigger if exists policies_log on public.policies;
create trigger policies_log
  after insert or update or delete on public.policies
  for each row execute function public.log_policy_event();

-- Give policies that were added BEFORE the log existed an "added" entry (only once each).
insert into public.policy_events (user_id, policy_id, event, title, insurance_type, created_at)
select p.user_id, p.id, 'added', p.title, p.insurance_type, p.created_at
from public.policies p
where not exists (
  select 1 from public.policy_events e where e.policy_id = p.id and e.event = 'added'
);
