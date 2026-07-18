alter table public.students
  add column if not exists image_link text;

alter table public.students
  drop constraint if exists students_image_link_url;

alter table public.students
  add constraint students_image_link_url
  check (
    image_link is null
    or image_link = ''
    or image_link ~* '^https?://'
  );
