-- Migration to add access_code column to programme_timers
alter table public.programme_timers 
  add column if not exists access_code text not null default lpad(floor(random() * 900000 + 100000)::text, 6, '0');
