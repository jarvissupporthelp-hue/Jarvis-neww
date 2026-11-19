create table public.library_profiles (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 language text not null check(language in ('hy','en','fr','ru')),
 avatar text not null check (avatar in ('🌙','🦊','🐼','🦉','🌻','🐳') or (length(avatar)<100000 and avatar ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$'))
);
create table public.library_shelf (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 book_id text not null check(length(book_id) between 1 and 100),
 status text not null default '' check(status in ('','later','reading','read')),
 liked boolean not null default false,
 primary key(user_id,book_id)
);
alter table public.library_profiles enable row level security;
alter table public.library_shelf enable row level security;
create policy own_profile on public.library_profiles for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_shelf on public.library_shelf for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
revoke all on public.library_profiles,public.library_shelf from anon,public;
grant select,insert,update on public.library_profiles,public.library_shelf to authenticated;
