-- Migration to allow everyone (authenticated and anon) to read teams, students, and participations
-- for public displays, seating, score boards, and the public code letter studio.

-- 1. Teams
alter table public.teams enable row level security;
drop policy if exists "Everyone can view teams" on public.teams;
create policy "Everyone can view teams"
on public.teams for select to authenticated, anon
using (true);

-- 2. Students
alter table public.students enable row level security;
drop policy if exists "Everyone can view students" on public.students;
create policy "Everyone can view students"
on public.students for select to authenticated, anon
using (true);

-- 3. Participations
alter table public.participations enable row level security;
drop policy if exists "Everyone can view participations" on public.participations;
create policy "Everyone can view participations"
on public.participations for select to authenticated, anon
using (true);
