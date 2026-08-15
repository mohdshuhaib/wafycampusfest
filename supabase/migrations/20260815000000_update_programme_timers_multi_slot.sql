-- Migration to support 1, 2, or 3 programmes in a single timer session
alter table public.programme_timers 
  alter column programme_id drop not null,
  alter column language drop not null,
  alter column subject drop not null,
  alter column duration_seconds drop not null;

alter table public.programme_timers 
  add column if not exists slots_count integer not null default 1,
  add column if not exists programme_slots jsonb default '[]'::jsonb;
