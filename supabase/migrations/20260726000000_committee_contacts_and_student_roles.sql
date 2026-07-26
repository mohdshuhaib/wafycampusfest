alter table public.students
  add column if not exists team_role text not null default 'member';

alter table public.students
  drop constraint if exists students_team_role_check;

alter table public.students
  add constraint students_team_role_check
  check (team_role in ('member', 'manager', 'assistant_manager'));

create table if not exists public.committee_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  whatsapp_number text not null,
  phone_number text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_committee_members_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_committee_members_updated_at on public.committee_members;
create trigger trg_touch_committee_members_updated_at
before update on public.committee_members
for each row execute function public.touch_committee_members_updated_at();

alter table public.committee_members enable row level security;

drop policy if exists "Authenticated users can read committee members" on public.committee_members;
create policy "Authenticated users can read committee members"
on public.committee_members for select to authenticated
using (true);

drop policy if exists "Admins manage committee members" on public.committee_members;
create policy "Admins manage committee members"
on public.committee_members for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.committee_members to authenticated;
