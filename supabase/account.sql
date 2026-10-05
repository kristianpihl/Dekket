-- Dekket — account deletion + consent record on documents.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run. Run documents.sql first (this file changes its `policies` table).
--
-- 1) Two columns on `policies` that record WHEN and under WHICH version of the texts
--    the user gave consent for processing that document (it may contain health data).
-- 2) A function `delete_my_account()` the logged-in user can call to delete their OWN account.
--    The browser can't delete a user directly (that needs admin rights), so this small
--    SECURITY DEFINER function does it — and only ever for auth.uid(), i.e. the caller.
--    The FILES in storage are removed by the app before it calls this (Postgres does not
--    allow deleting storage rows directly).

-- 1) Consent record ---------------------------------------------------------

alter table public.policies add column if not exists consent_at timestamptz;
alter table public.policies add column if not exists consent_version text;

-- 2) Delete my account ------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  -- Delete the policies explicitly first (instead of relying on the cascade). If the activity
  -- log from dashboard.sql exists, this writes "deleted" entries to it, which we then erase
  -- together with the rest of the log, so nothing about the user is left behind.
  delete from public.policies where user_id = auth.uid();

  if to_regclass('public.policy_events') is not null then
    execute 'delete from public.policy_events where user_id = $1' using auth.uid();
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

-- Functions are callable by everyone by default — lock it down to logged-in users only.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
