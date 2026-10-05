-- Dekket — stored AI analyses. NOT NEEDED YET: the analysis feature is switched off
-- (features.analysis = false in src/content/site.js). Run this when the analysis is turned on.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run. Safe to re-run.
-- Run order: documents.sql → account.sql → dashboard.sql → doc-kind.sql → analysis.sql
--
-- `analyses`: the AI analysis of a policy document, one row per run (we keep the history).
-- The server function api/analyze.js writes a row after each successful run, using the
-- logged-in user's own session, so the normal row-level security applies.

create table if not exists public.analyses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  policy_id  uuid not null references public.policies (id) on delete cascade,
  created_at timestamptz not null default now(),
  model      text,                 -- which AI model produced it
  result     jsonb not null,       -- the structured analysis (see api/_analysis.js for the shape)
  usage      jsonb                 -- token counts, for cost follow-up
);

create index if not exists analyses_policy_created_idx on public.analyses (policy_id, created_at desc);
create index if not exists analyses_user_created_idx   on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

grant select, insert, delete on public.analyses to authenticated;

drop policy if exists "Own analyses: select" on public.analyses;
create policy "Own analyses: select" on public.analyses
  for select to authenticated
  using (user_id = (select auth.uid()));

-- You can only add an analysis for a policy that is yours.
drop policy if exists "Own analyses: insert" on public.analyses;
create policy "Own analyses: insert" on public.analyses
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.policies p
      where p.id = policy_id and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "Own analyses: delete" on public.analyses;
create policy "Own analyses: delete" on public.analyses
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Deleting a policy (or the whole account) removes its analyses automatically:
-- policy_id → on delete cascade, and delete_my_account() (account.sql) deletes policies first.
