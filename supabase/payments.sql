-- Dekket — auto-renewal, payment schedule and fees on each policy.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run. Safe to re-run.
-- Run order for a fresh setup:
--   documents.sql → account.sql → dashboard.sql → doc-kind.sql → payers-documents-providers.sql → payments.sql
--
-- New columns on `policies`:
--   auto_renews        true  = the policy renews by itself every year (most do). `valid_to` is then the end
--                      of the period the document describes, and the app counts forward to the NEXT renewal
--                      instead of calling the policy "expired". false = it really ends on valid_to.
--                      Existing rows become `true` (the default); untick it on policies that have really ended.
--   payment_frequency  monthly | quarterly | semiannual | annual (null = not entered)
--   payment_anchor     ONE known payment day (the last or the next one). The others follow from the frequency.
--   fee_per_payment    invoice / instalment fee in NOK per payment (null = not entered, 0 = no fee)
-- The activity log trigger is replaced so it also records changes to these fields.

alter table public.policies add column if not exists auto_renews boolean not null default true;
alter table public.policies add column if not exists payment_frequency text;
alter table public.policies add column if not exists payment_anchor date;
alter table public.policies add column if not exists fee_per_payment numeric(10, 2);

alter table public.policies drop constraint if exists policies_payment_frequency_check;
alter table public.policies add constraint policies_payment_frequency_check
  check (payment_frequency is null or payment_frequency in ('monthly', 'quarterly', 'semiannual', 'annual'));

alter table public.policies drop constraint if exists policies_fee_check;
alter table public.policies add constraint policies_fee_check
  check (fee_per_payment is null or fee_per_payment >= 0);

-- The user may edit these (the column-level update grant only covers listed columns).
grant update (auto_renews, payment_frequency, payment_anchor, fee_per_payment) on public.policies to authenticated;

-- Activity log: same function as in payers-documents-providers.sql, with the new fields added to the list.
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
      'auto_renews', 'payment_frequency', 'payment_anchor', 'fee_per_payment'
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
