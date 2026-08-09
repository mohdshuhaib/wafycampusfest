-- Migration to add topic and topic_language columns to public.events
alter table public.events 
add column if not exists topic text,
add column if not exists topic_language text check (topic_language in ('english', 'malayalam', 'arabic'));
