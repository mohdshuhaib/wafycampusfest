-- Migration to create programme_schedules table
create table if not exists public.programme_schedules (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.events(id) on delete cascade,
  schedule_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_end_after_start check (end_time > start_time)
);

-- Indexes for performance
create index if not exists idx_programme_schedules_date on public.programme_schedules(schedule_date);
create index if not exists idx_programme_schedules_programme on public.programme_schedules(programme_id);

-- Enable Row Level Security (RLS)
alter table public.programme_schedules enable row level security;

-- Policy 1: Admins can manage programme_schedules
drop policy if exists "Admins manage programme_schedules" on public.programme_schedules;
create policy "Admins manage programme_schedules"
on public.programme_schedules for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Policy 2: Everyone can view programme_schedules
drop policy if exists "Everyone can view programme_schedules" on public.programme_schedules;
create policy "Everyone can view programme_schedules"
on public.programme_schedules for select to authenticated, anon
using (true);
