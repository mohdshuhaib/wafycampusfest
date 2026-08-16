-- Migration to ensure public/anon select policy on events table
-- This allows unauthenticated TV displays to query programme names and codes

-- Enable RLS if not enabled
alter table public.events enable row level security;

-- Policy for everyone (authenticated & anon) to select events
drop policy if exists "Everyone can view events" on public.events;
create policy "Everyone can view events"
on public.events for select to authenticated, anon
using (true);
