-- Migration to create programme_timers table
create table if not exists public.programme_timers (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.events(id) on delete cascade,
  language text not null default 'english' check (language in ('english', 'malayalam', 'arabic')),
  subject text not null,
  duration_seconds integer not null check (duration_seconds > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for performance
create index if not exists idx_programme_timers_programme on public.programme_timers(programme_id);

-- Enable Row Level Security (RLS)
alter table public.programme_timers enable row level security;

-- Policy 1: Admins can manage programme_timers
drop policy if exists "Admins manage programme_timers" on public.programme_timers;
create policy "Admins manage programme_timers"
on public.programme_timers for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Policy 2: Everyone can view programme_timers for share link
drop policy if exists "Everyone can view programme_timers" on public.programme_timers;
create policy "Everyone can view programme_timers"
on public.programme_timers for select to authenticated, anon
using (true);
