alter type public.event_category add value if not exists 'GENERAL';
alter type public.event_category add value if not exists 'SPECIAL';

alter table public.events
  drop constraint if exists events_grade_type_check;

alter table public.events
  add constraint events_grade_type_check
  check (grade_type in ('A', 'B', 'C', 'D'));

alter table public.events
  drop constraint if exists events_category_grade_rule;

alter table public.events
  add constraint events_category_grade_rule
  check (
    (category::text = 'GENERAL' and grade_type = 'C')
    or (category::text = 'SPECIAL' and grade_type = 'D')
    or category::text in ('ON STAGE', 'OFF STAGE')
  );

alter table public.participations
  drop constraint if exists participations_performance_grade_check;

alter table public.participations
  add constraint participations_performance_grade_check
  check (performance_grade in ('A+', 'A', 'B', 'C', 'NONE'));

alter table public.grade_settings
  drop constraint if exists grade_settings_grade_type_check;

alter table public.grade_settings
  add constraint grade_settings_grade_type_check
  check (grade_type in ('A', 'B', 'C', 'D'));

create table if not exists public.performance_grade_settings (
  id uuid primary key default gen_random_uuid(),
  grade_label text not null unique check (grade_label in ('A+', 'A', 'B', 'C')),
  points integer not null default 0 check (points >= 0)
);

alter table public.performance_grade_settings enable row level security;

drop policy if exists "Authenticated users can read performance grade settings" on public.performance_grade_settings;
create policy "Authenticated users can read performance grade settings"
on public.performance_grade_settings for select to authenticated
using (true);

drop policy if exists "Admins manage performance grade settings" on public.performance_grade_settings;
create policy "Admins manage performance grade settings"
on public.performance_grade_settings for all to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.grade_settings (grade_type, first_place, second_place, third_place)
values ('D', 0, 0, 0)
on conflict (grade_type) do nothing;

insert into public.performance_grade_settings (grade_label, points)
values
  ('A+', 0),
  ('A', 5),
  ('B', 3),
  ('C', 1)
on conflict (grade_label) do nothing;
