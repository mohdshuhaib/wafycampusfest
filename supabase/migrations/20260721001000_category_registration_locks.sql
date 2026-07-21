alter table public.app_config
  add column if not exists on_stage_registration_open boolean not null default false,
  add column if not exists off_stage_registration_open boolean not null default false;

update public.app_config
set
  on_stage_registration_open = registration_open,
  off_stage_registration_open = registration_open
where id = 1;

create or replace function public.registration_is_open_for_event(target_team_id uuid, target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    t.access_override,
    case
      when e.category = 'ON STAGE'::public.event_category then c.on_stage_registration_open
      when e.category = 'OFF STAGE'::public.event_category then c.off_stage_registration_open
      else c.registration_open
    end,
    false
  )
  from public.teams t
  cross join public.app_config c
  join public.events e on e.id = target_event_id
  where t.id = target_team_id and c.id = 1
$$;

drop policy if exists "Captains manage own registrations while registration is open" on public.participations;
create policy "Captains manage own registrations while registration is open"
on public.participations for insert to authenticated
with check (
  public.current_user_role() = 'captain'
  and team_id = public.current_user_team_id()
  and public.registration_is_open_for_event(team_id, event_id)
);

drop policy if exists "Captains remove own registrations while registration is open" on public.participations;
create policy "Captains remove own registrations while registration is open"
on public.participations for delete to authenticated
using (
  public.current_user_role() = 'captain'
  and team_id = public.current_user_team_id()
  and public.registration_is_open_for_event(team_id, event_id)
);
