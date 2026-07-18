drop policy if exists "Authenticated users can read site assets" on public.site_assets;
create policy "Authenticated users can read site assets"
on public.site_assets for select to public
using (true);
