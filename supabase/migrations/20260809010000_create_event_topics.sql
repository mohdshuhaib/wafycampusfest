-- Migration to create event_topics table, compatibility columns, and RLS policies
create table if not exists public.event_topics (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  topic_type text not null default 'general' check (topic_type in ('general', 'personal', 'participant')),
  topic_language text not null default 'english' check (topic_language in ('english', 'malayalam', 'arabic')),
  publish_type text not null default 'immediate' check (publish_type in ('immediate', 'scheduled')),
  scheduled_publish_time timestamptz,
  general_topic text,
  team_topics jsonb default '{}'::jsonb,
  participant_topics jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_topics_event_id_key unique (event_id)
);

-- Ensure public.events table compatibility columns
alter table public.events 
add column if not exists topic text,
add column if not exists topic_language text check (topic_language in ('english', 'malayalam', 'arabic'));

-- Enable Row Level Security (RLS)
alter table public.event_topics enable row level security;

-- Policy 1: Admins can view, insert, update, and delete all event_topics
drop policy if exists "Admins manage event_topics" on public.event_topics;
create policy "Admins manage event_topics"
on public.event_topics for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Policy 2: Captains and authenticated users can view published topics (immediate or scheduled_publish_time <= now())
drop policy if exists "Authenticated users read published event_topics" on public.event_topics;
create policy "Authenticated users read published event_topics"
on public.event_topics for select to authenticated
using (
  public.is_admin()
  or publish_type = 'immediate'
  or (publish_type = 'scheduled' and scheduled_publish_time <= now())
);
