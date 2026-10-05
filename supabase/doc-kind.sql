-- Dekket — document type on each policy.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run. Safe to re-run.
-- Run order for a fresh setup: documents.sql → account.sql → dashboard.sql → doc-kind.sql
--
-- `policies.doc_kind` says what kind of document the user uploaded:
--   certificate (forsikringsbevis) | terms (vilkår) | both | bylaws (vedtekter) | other | unknown
-- Files uploaded before this existed are 'unknown'. The dashboard uses it to point out missing
-- documents (e.g. terms but no certificate) — no AI involved.

alter table public.policies add column if not exists doc_kind text not null default 'unknown';

-- The user may change it later (the column-level update grant only covers listed columns).
grant update (doc_kind) on public.policies to authenticated;
