-- AdoptCheck check history. Each completed scan by a signed-in user is saved
-- here and can be revisited (history page) or shared via /r/<slug>.
-- Run once in the Supabase SQL editor for the configured project.

create table if not exists public.adoptcheck_reports (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  slug            text        not null unique,
  repo_full_name  text,
  verdict         text,
  report_data     jsonb       not null,
  created_at      timestamptz not null default now()
);

create index if not exists adoptcheck_reports_user_created_idx
  on public.adoptcheck_reports (user_id, created_at desc);

-- All reads/writes go through the service-role key (server-side: save on scan,
-- list on the history page, fetch-by-slug on the public share page), which
-- bypasses RLS. Lock the table so the anon/public key cannot enumerate reports.
alter table public.adoptcheck_reports enable row level security;
