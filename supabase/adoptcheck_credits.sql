-- AdoptCheck paid credits, keyed by Supabase auth user id.
-- Free scans are metered anonymously per device in adoptcheck_sessions; once a
-- user buys, credits live here on their account so they persist across devices.
-- Run once in the Supabase SQL editor for the project configured in
-- SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.

create table if not exists public.adoptcheck_credits (
  user_id     uuid        primary key references auth.users (id) on delete cascade,
  credits     integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Writes happen only via the service-role key (Dodo webhook + scan consumption),
-- which bypasses RLS. Enable RLS with no policies so the anon/public key cannot
-- read or modify credit balances.
alter table public.adoptcheck_credits enable row level security;
