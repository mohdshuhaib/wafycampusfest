-- Wafy Campus Fest initial Supabase schema.
-- Run this in the Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin', 'captain');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.student_section as enum ('Senior');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.event_category as enum ('ON STAGE', 'OFF STAGE');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.participation_status as enum ('registered', 'completed', 'disqualified', 'winner');
exception when duplicate_object then null;
end $$;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color_hex text not null,
  access_override boolean,
  penalty_points integer not null default 0 check (penalty_points >= 0),
  created_at timestamptz not null default now(),
  constraint teams_color_hex_format check (color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  full_name text,
  role public.user_role not null default 'captain',
  created_at timestamptz not null default now(),
  constraint captain_profiles_need_team check (role = 'admin' or team_id is not null)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chest_no text unique,
  class_grade text,
  image_link text,
  section public.student_section not null,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now()
  ,
  constraint students_image_link_url check (
    image_link is null
    or image_link = ''
    or image_link ~* '^https?://'
  ),
  constraint students_senior_only check (section = 'Senior'::public.student_section)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_code text unique,
  category public.event_category not null,
  description text,
  max_participants_per_team integer not null default 2 check (max_participants_per_team > 0),
  grade_type text check (grade_type in ('A', 'B', 'C')),
  applicable_section text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  constraint events_applicable_section_values check (
    applicable_section = array['Senior']::text[]
  )
);

create table if not exists public.participations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  status public.participation_status not null default 'registered',
  result_position text check (result_position in ('FIRST', 'SECOND', 'THIRD')),
  points_earned integer not null default 0 check (points_earned >= 0),
  performance_grade text check (performance_grade in ('A', 'B', 'C', 'NONE')),
  attendance_status text not null default 'pending' check (attendance_status in ('pending', 'present', 'absent')),
  created_at timestamptz not null default now()
);

create unique index if not exists participations_unique_student_event
  on public.participations(event_id, team_id, student_id)
  where student_id is not null;

create unique index if not exists participations_unique_team_event_result
  on public.participations(event_id, team_id)
  where student_id is null;

create table if not exists public.grade_settings (
  id uuid primary key default gen_random_uuid(),
  grade_type text not null unique check (grade_type in ('A', 'B', 'C')),
  first_place integer not null default 0 check (first_place >= 0),
  second_place integer not null default 0 check (second_place >= 0),
  third_place integer not null default 0 check (third_place >= 0)
);

create table if not exists public.section_limits (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section = 'Senior'),
  category text not null check (category in ('ON STAGE', 'OFF STAGE')),
  limit_count integer not null default 100 check (limit_count >= 0),
  unique (section, category)
);

create table if not exists public.app_config (
  id integer primary key default 1 check (id = 1),
  registration_open boolean not null default false
);

create table if not exists public.site_assets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  type text not null check (type in ('image', 'link', 'file')),
  value text not null,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_transactions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('CREDIT', 'DEBIT')),
  method text not null check (method in ('LIQUID', 'UPI', 'BANK_TRANSFER')),
  details text,
  amount numeric not null default 0 check (amount >= 0),
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.keep_alive_status (
  id integer primary key,
  last_ping timestamptz not null default now()
);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.registration_is_open_for_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(t.access_override, c.registration_open, false)
  from public.teams t
  cross join public.app_config c
  where t.id = target_team_id and c.id = 1
$$;

create or replace function public.enforce_participation_team()
returns trigger
language plpgsql
as $$
declare
  owner_team_id uuid;
begin
  if new.student_id is not null then
    select team_id into owner_team_id from public.students where id = new.student_id;
    if owner_team_id is null or owner_team_id <> new.team_id then
      raise exception 'Participation team_id must match the selected student team_id.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_participation_team on public.participations;
create trigger trg_enforce_participation_team
before insert or update of student_id, team_id on public.participations
for each row execute function public.enforce_participation_team();

create or replace function public.touch_site_assets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_site_assets_updated_at on public.site_assets;
create trigger trg_touch_site_assets_updated_at
before update on public.site_assets
for each row execute function public.touch_site_assets_updated_at();

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.events enable row level security;
alter table public.participations enable row level security;
alter table public.grade_settings enable row level security;
alter table public.section_limits enable row level security;
alter table public.app_config enable row level security;
alter table public.site_assets enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.keep_alive_status enable row level security;

drop policy if exists "Authenticated users can read teams" on public.teams;
create policy "Authenticated users can read teams"
on public.teams for select to authenticated
using (true);

drop policy if exists "Admins manage teams" on public.teams;
create policy "Admins manage teams"
on public.teams for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users read own profile and admins read all" on public.profiles;
create policy "Users read own profile and admins read all"
on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read all students and captains read own team" on public.students;
create policy "Admins read all students and captains read own team"
on public.students for select to authenticated
using (public.is_admin() or team_id = public.current_user_team_id());

drop policy if exists "Admins manage students" on public.students;
create policy "Admins manage students"
on public.students for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read events" on public.events;
create policy "Authenticated users can read events"
on public.events for select to authenticated
using (true);

drop policy if exists "Admins manage events" on public.events;
create policy "Admins manage events"
on public.events for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read all participations and captains read own team" on public.participations;
create policy "Admins read all participations and captains read own team"
on public.participations for select to authenticated
using (public.is_admin() or team_id = public.current_user_team_id());

drop policy if exists "Admins manage participations" on public.participations;
create policy "Admins manage participations"
on public.participations for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Captains register own team while registration is open" on public.participations;
create policy "Captains register own team while registration is open"
on public.participations for insert to authenticated
with check (
  public.current_user_role() = 'captain'
  and team_id = public.current_user_team_id()
  and public.registration_is_open_for_team(team_id)
);

drop policy if exists "Captains remove own registrations while registration is open" on public.participations;
create policy "Captains remove own registrations while registration is open"
on public.participations for delete to authenticated
using (
  public.current_user_role() = 'captain'
  and team_id = public.current_user_team_id()
  and public.registration_is_open_for_team(team_id)
);

drop policy if exists "Authenticated users can read grade settings" on public.grade_settings;
create policy "Authenticated users can read grade settings"
on public.grade_settings for select to authenticated
using (true);

drop policy if exists "Admins manage grade settings" on public.grade_settings;
create policy "Admins manage grade settings"
on public.grade_settings for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read section limits" on public.section_limits;
create policy "Authenticated users can read section limits"
on public.section_limits for select to authenticated
using (true);

drop policy if exists "Admins manage section limits" on public.section_limits;
create policy "Admins manage section limits"
on public.section_limits for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read app config" on public.app_config;
create policy "Authenticated users can read app config"
on public.app_config for select to authenticated
using (true);

drop policy if exists "Admins update app config" on public.app_config;
create policy "Admins update app config"
on public.app_config for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read site assets" on public.site_assets;
create policy "Authenticated users can read site assets"
on public.site_assets for select to authenticated
using (true);

drop policy if exists "Admins manage site assets" on public.site_assets;
create policy "Admins manage site assets"
on public.site_assets for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage finance transactions" on public.finance_transactions;
create policy "Admins manage finance transactions"
on public.finance_transactions for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anon can ping keep alive row" on public.keep_alive_status;
create policy "Anon can ping keep alive row"
on public.keep_alive_status for update to anon
using (id = 1)
with check (id = 1);

drop policy if exists "Admins manage keep alive status" on public.keep_alive_status;
create policy "Admins manage keep alive status"
on public.keep_alive_status for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant update (last_ping) on public.keep_alive_status to anon;

insert into public.app_config (id, registration_open)
values (1, false)
on conflict (id) do nothing;

insert into public.keep_alive_status (id, last_ping)
values (1, now())
on conflict (id) do nothing;

insert into public.grade_settings (grade_type, first_place, second_place, third_place)
values
  ('A', 0, 0, 0),
  ('B', 0, 0, 0),
  ('C', 0, 0, 0)
on conflict (grade_type) do nothing;

insert into public.section_limits (section, category, limit_count)
values
  ('Senior', 'ON STAGE', 100),
  ('Senior', 'OFF STAGE', 100)
on conflict (section, category) do nothing;

insert into public.site_assets (key, label, type, value, description)
values
  ('rulebook_link', 'Rulebook Link', 'link', '', 'Shown to captains on the dashboard.'),
  ('event_call_sheet_logo', 'Event Call Sheet Logo', 'image', '', 'Logo used in generated call sheet PDFs.'),
  ('participation_card_logo', 'Participation Card Logo', 'image', '', 'Logo used in generated participation cards.')
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

drop policy if exists "Public can read site assets files" on storage.objects;
create policy "Public can read site assets files"
on storage.objects for select to public
using (bucket_id = 'site-assets');

drop policy if exists "Admins can upload site assets files" on storage.objects;
create policy "Admins can upload site assets files"
on storage.objects for insert to authenticated
with check (bucket_id = 'site-assets' and public.is_admin());

drop policy if exists "Admins can update site assets files" on storage.objects;
create policy "Admins can update site assets files"
on storage.objects for update to authenticated
using (bucket_id = 'site-assets' and public.is_admin())
with check (bucket_id = 'site-assets' and public.is_admin());

drop policy if exists "Admins can delete site assets files" on storage.objects;
create policy "Admins can delete site assets files"
on storage.objects for delete to authenticated
using (bucket_id = 'site-assets' and public.is_admin());
