-- Migration: Add is_published to events table
alter table public.events
  add column if not exists is_published boolean not null default false;

create index if not exists idx_events_is_published on public.events (is_published);
