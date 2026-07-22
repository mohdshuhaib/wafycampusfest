alter table public.events
  add column if not exists duration_minutes integer check (duration_minutes is null or duration_minutes > 0);

comment on column public.events.duration_minutes is 'Optional duration needed for the event, stored in minutes.';
