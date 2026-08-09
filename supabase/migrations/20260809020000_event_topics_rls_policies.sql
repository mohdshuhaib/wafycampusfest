-- Migration to enable Row Level Security (RLS) and policies on public.event_topics

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
