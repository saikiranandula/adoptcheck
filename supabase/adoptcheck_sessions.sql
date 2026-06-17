-- AdoptCheck metering store.
-- Run once in the Supabase SQL editor (or via migration) for the project
-- whose URL/service-role key are configured in SUPABASE_URL /
-- SUPABASE_SERVICE_ROLE_KEY.
--
-- AdoptCheck has no user accounts. Each anonymous device is identified by the
-- httpOnly `ac_sid` cookie; this table tracks free scans used and purchased
-- credits per device session.

create table if not exists public.adoptcheck_sessions (
  session_id  text primary key,
  free_used   integer     not null default 0,
  credits     integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Writes happen only from the server using the service-role key, which
-- bypasses RLS. Enable RLS with no policies so the anon/public key cannot
-- read or write this table.
alter table public.adoptcheck_sessions enable row level security;
