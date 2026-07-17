-- Collapse the cloned festival setup to one competition section: Senior.

update public.students
set section = 'Senior'::public.student_section
where section <> 'Senior'::public.student_section;

update public.events
set applicable_section = array['Senior']::text[]
where applicable_section is null
   or applicable_section <> array['Senior']::text[];

delete from public.section_limits
where section <> 'Senior';

insert into public.section_limits (section, category, limit_count)
values
  ('Senior', 'ON STAGE', 100),
  ('Senior', 'OFF STAGE', 100)
on conflict (section, category) do nothing;

alter table public.students
  drop constraint if exists students_senior_only;

alter table public.students
  add constraint students_senior_only
  check (section = 'Senior'::public.student_section);

alter table public.events
  drop constraint if exists events_applicable_section_values;

alter table public.events
  add constraint events_applicable_section_values
  check (applicable_section = array['Senior']::text[]);

alter table public.section_limits
  drop constraint if exists section_limits_section_check;

alter table public.section_limits
  add constraint section_limits_section_check
  check (section = 'Senior');

create or replace function public.force_senior_student_section()
returns trigger
language plpgsql
as $$
begin
  new.section := 'Senior'::public.student_section;
  return new;
end;
$$;

drop trigger if exists trg_force_senior_student_section on public.students;
create trigger trg_force_senior_student_section
before insert or update of section on public.students
for each row execute function public.force_senior_student_section();

create or replace function public.force_senior_event_section()
returns trigger
language plpgsql
as $$
begin
  new.applicable_section := array['Senior']::text[];
  return new;
end;
$$;

drop trigger if exists trg_force_senior_event_section on public.events;
create trigger trg_force_senior_event_section
before insert or update of applicable_section on public.events
for each row execute function public.force_senior_event_section();
