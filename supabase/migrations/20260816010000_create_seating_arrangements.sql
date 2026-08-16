-- Migration to create seating_arrangements table
create table if not exists public.seating_arrangements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  programme_ids jsonb not null default '[]'::jsonb,
  seats_per_row integer not null check (seats_per_row >= 2 and seats_per_row <= 4),
  layout_grid jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index on created_at
create index if not exists idx_seating_arrangements_created on public.seating_arrangements(created_at);

-- Enable RLS
alter table public.seating_arrangements enable row level security;

-- Policy 1: Admins manage seating_arrangements
drop policy if exists "Admins manage seating_arrangements" on public.seating_arrangements;
create policy "Admins manage seating_arrangements"
on public.seating_arrangements for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Policy 2: Everyone view seating_arrangements
drop policy if exists "Everyone view seating_arrangements" on public.seating_arrangements;
create policy "Everyone view seating_arrangements"
on public.seating_arrangements for select to authenticated, anon
using (true);
