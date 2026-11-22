create table public.professional_links (
  user_id uuid primary key references public.memberships(user_id) on delete cascade,
  github text check (github ~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?$'),
  linkedin text check (char_length(linkedin) between 1 and 100 and linkedin ~ '^[[:alnum:]_-]+$')
);
alter table public.professional_links enable row level security;
revoke all on public.professional_links from public, anon, authenticated;
grant select, insert, update on public.professional_links to authenticated;
create policy own_active_links on public.professional_links for all to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.memberships where user_id=auth.uid() and status='active'))
with check (user_id = (select auth.uid()) and exists (select 1 from public.memberships where user_id=auth.uid() and status='active'));
