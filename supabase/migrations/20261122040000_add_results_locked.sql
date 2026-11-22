alter table public.app_config
  add column if not exists results_locked boolean not null default false;

-- Allow public read on app_config for lock status checking
drop policy if exists "Anyone can read app config" on public.app_config;
create policy "Anyone can read app config"
on public.app_config for select
using (true);
