create table public.physical_library_books (
  id text primary key,
  title text not null,
  author text not null,
  category text not null,
  language text not null check (language in ('hy', 'en', 'fr', 'ru')),
  faculties text[] not null default '{}',
  shelf text not null,
  expected_return date
);

create table public.physical_library_waitlist (
  id uuid primary key default gen_random_uuid(),
  book_id text not null references public.physical_library_books(id) on delete cascade,
  user_id uuid not null references public.memberships(user_id) on delete cascade,
  joined_at timestamptz not null default now(),
  notified_at timestamptz,
  read_at timestamptz
);

create unique index physical_library_pending_once on public.physical_library_waitlist(book_id, user_id)
  where notified_at is null;
create index physical_library_waitlist_owner on public.physical_library_waitlist(user_id, notified_at desc);

alter table public.physical_library_books enable row level security;
alter table public.physical_library_waitlist enable row level security;
revoke all on public.physical_library_books, public.physical_library_waitlist from public, anon, authenticated;
grant select on public.physical_library_books to anon, authenticated;
grant update (expected_return) on public.physical_library_books to authenticated;
grant select, update (read_at) on public.physical_library_waitlist to authenticated;

create policy physical_library_catalog on public.physical_library_books for select
  to anon, authenticated using (true);
create policy physical_library_admin_return on public.physical_library_books for update
  to authenticated
  using ((select exists (select 1 from public.memberships where user_id = auth.uid() and status = 'active' and role = 'admin')))
  with check ((select exists (select 1 from public.memberships where user_id = auth.uid() and status = 'active' and role = 'admin')));

create policy physical_library_own_waitlist on public.physical_library_waitlist for select
  to authenticated using (
    user_id = (select auth.uid())
    and (select exists (select 1 from public.memberships where user_id = auth.uid() and status = 'active'))
  );
create policy physical_library_own_alert_read on public.physical_library_waitlist for update
  to authenticated
  using (user_id = (select auth.uid()) and notified_at is not null
    and (select exists (select 1 from public.memberships where user_id = auth.uid() and status = 'active')))
  with check (user_id = (select auth.uid()) and notified_at is not null
    and (select exists (select 1 from public.memberships where user_id = auth.uid() and status = 'active')));

create function jarvis_private.physical_library_waitlist_change(p_book text, p_join boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  member uuid := auth.uid();
  due date;
begin
  if not exists (select 1 from public.memberships where user_id = member and status = 'active') then
    raise insufficient_privilege using message = 'Active membership required';
  end if;
  -- Serialize waitlist changes against a concurrent checkout or return.
  select expected_return into due from public.physical_library_books where id = p_book for update;
  if not found then return false; end if;
  if p_join then
    if due is null then return false; end if;
    insert into public.physical_library_waitlist(book_id, user_id) values (p_book, member)
      on conflict (book_id, user_id) where notified_at is null do nothing;
  else
    delete from public.physical_library_waitlist where book_id = p_book and user_id = member and notified_at is null;
  end if;
  return true;
end;
$$;

create function public.change_physical_library_waitlist(p_book text, p_join boolean)
returns boolean language sql security invoker set search_path = '' as $$
  select jarvis_private.physical_library_waitlist_change(p_book, p_join)
$$;
revoke all on function jarvis_private.physical_library_waitlist_change(text, boolean) from public, anon, authenticated;
revoke all on function public.change_physical_library_waitlist(text, boolean) from public, anon, authenticated;
grant execute on function jarvis_private.physical_library_waitlist_change(text, boolean) to authenticated;
grant execute on function public.change_physical_library_waitlist(text, boolean) to authenticated;

create function jarvis_private.notify_physical_library_return()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.physical_library_waitlist
  set notified_at = statement_timestamp()
  where book_id = new.id and notified_at is null;
  return new;
end;
$$;
revoke all on function jarvis_private.notify_physical_library_return() from public, anon, authenticated;
create trigger notify_physical_library_return
  after update of expected_return on public.physical_library_books for each row
  when (old.expected_return is not null and new.expected_return is null)
  execute function jarvis_private.notify_physical_library_return();

-- Sample inventory. Each row represents one circulating copy.
insert into public.physical_library_books (id, title, author, category, language, faculties, shelf, expected_return) values
  ('openstax-business-law-i-essentials', 'Business Law I Essentials', 'OpenStax', 'law', 'en', array['law', 'management']::text[], 'A-1', (now() at time zone 'Asia/Yerevan')::date + 5),
  ('openstax-business-ethics', 'Business Ethics', 'OpenStax', 'business', 'en', array['law', 'management', 'marketing']::text[], 'A-2', null),
  ('openstax-introduction-intellectual-property', 'Introduction to Intellectual Property', 'OpenStax', 'law', 'en', array['law', 'marketing']::text[], 'A-3', null),
  ('openstax-principles-management', 'Principles of Management', 'OpenStax', 'business', 'en', array['management']::text[], 'A-4', (now() at time zone 'Asia/Yerevan')::date + 23),
  ('openstax-organizational-behavior', 'Organizational Behavior', 'OpenStax', 'business', 'en', array['management']::text[], 'A-5', null),
  ('openstax-entrepreneurship', 'Entrepreneurship', 'OpenStax', 'business', 'en', array['management', 'marketing', 'finance']::text[], 'A-6', null),
  ('openstax-principles-marketing', 'Principles of Marketing', 'OpenStax', 'business', 'en', array['marketing']::text[], 'A-7', (now() at time zone 'Asia/Yerevan')::date + 20),
  ('openstax-principles-finance', 'Principles of Finance', 'OpenStax', 'economics', 'en', array['finance']::text[], 'A-8', null),
  ('openstax-principles-financial-accounting', 'Principles of Accounting, Volume 1: Financial Accounting', 'OpenStax', 'economics', 'en', array['finance', 'management']::text[], 'A-9', (now() at time zone 'Asia/Yerevan')::date + 25),
  ('openstax-principles-economics-3e', 'Principles of Economics 3e', 'OpenStax', 'economics', 'en', array['finance', 'management', 'marketing']::text[], 'A-10', (now() at time zone 'Asia/Yerevan')::date + 17),
  ('openstax-introductory-business-statistics-2e', 'Introductory Business Statistics 2e', 'OpenStax', 'mathematics', 'en', array['finance', 'marketing', 'informatics']::text[], 'B-1', null),
  ('openstax-introduction-computer-science', 'Introduction to Computer Science', 'OpenStax', 'computing', 'en', array['informatics']::text[], 'B-2', (now() at time zone 'Asia/Yerevan')::date + 22),
  ('openstax-introduction-python-programming', 'Introduction to Python Programming', 'OpenStax', 'computing', 'en', array['informatics']::text[], 'B-3', null),
  ('openstax-calculus-volume-1', 'Calculus Volume 1', 'OpenStax', 'mathematics', 'en', array['informatics']::text[], 'B-4', null),
  ('1342', 'Pride and Prejudice', 'Jane Austen', 'romance', 'en', array[]::text[], 'B-5', (now() at time zone 'Asia/Yerevan')::date + 19),
  ('158', 'Emma', 'Jane Austen', 'romance', 'en', array[]::text[], 'B-6', null),
  ('1260', 'Jane Eyre', 'Charlotte Brontë', 'romance', 'en', array[]::text[], 'B-7', null),
  ('161', 'Sense and Sensibility', 'Jane Austen', 'romance', 'en', array[]::text[], 'B-8', (now() at time zone 'Asia/Yerevan')::date + 16),
  ('935', 'Self Help', 'Samuel Smiles', 'motivation', 'en', array[]::text[], 'B-9', null),
  ('2274', 'How to Live on 24 Hours a Day', 'Arnold Bennett', 'motivation', 'en', array[]::text[], 'B-10', (now() at time zone 'Asia/Yerevan')::date + 21),
  ('hy-verq', 'Վերք Հայաստանի', 'Խաչատուր Աբովյան', 'literature', 'hy', array[]::text[], 'C-1', (now() at time zone 'Asia/Yerevan')::date + 13),
  ('hy-samvel', 'Սամվել', 'Րաֆֆի', 'literature', 'hy', array[]::text[], 'C-2', null),
  ('hy-khente', 'Խենթը', 'Րաֆֆի', 'literature', 'hy', array[]::text[], 'C-3', (now() at time zone 'Asia/Yerevan')::date + 18),
  ('hy-khamsa', 'Խամսայի մելիքությունները', 'Րաֆֆի', 'history', 'hy', array[]::text[], 'C-4', null),
  ('hy-kaytser', 'Կայծեր', 'Րաֆֆի', 'literature', 'hy', array[]::text[], 'C-5', null),
  ('hy-gevorg', 'Գևորգ Մարզպետունի', 'Մուրացան', 'literature', 'hy', array[]::text[], 'C-6', (now() at time zone 'Asia/Yerevan')::date + 15),
  ('hy-nairi', 'Երկիր Նաիրի', 'Եղիշե Չարենց', 'literature', 'hy', array[]::text[], 'C-7', null),
  ('hy-khatabala', 'Խաթաբալա', 'Գաբրիել Սունդուկյան', 'literature', 'hy', array[]::text[], 'C-8', null),
  ('hy-sako', 'Լոռեցի Սաքոն', 'Հովհաննես Թումանյան', 'literature', 'hy', array[]::text[], 'C-9', (now() at time zone 'Asia/Yerevan')::date + 12),
  ('hy-giqor', 'Գիքորը', 'Հովհաննես Թումանյան', 'literature', 'hy', array[]::text[], 'C-10', null),
  ('fr-bastiat-loi', 'La Loi', 'Frédéric Bastiat', 'law', 'fr', array['law', 'finance']::text[], 'D-1', (now() at time zone 'Asia/Yerevan')::date + 17),
  ('exo7-algebre', 'Algèbre — Cours de première année', 'Exo7', 'mathematics', 'fr', array['informatics']::text[], 'D-2', (now() at time zone 'Asia/Yerevan')::date + 9),
  ('exo7-analyse', 'Analyse — Cours de première année', 'Exo7', 'mathematics', 'fr', array['informatics']::text[], 'D-3', null),
  ('exo7-logique', 'Logique', 'Exo7', 'mathematics', 'fr', array['informatics']::text[], 'D-4', (now() at time zone 'Asia/Yerevan')::date + 14),
  ('exo7-geometrie', 'Géométrie', 'Exo7', 'mathematics', 'fr', array['informatics']::text[], 'D-5', null),
  ('exo7-algorithmes', 'Algorithmes', 'Exo7', 'computing', 'fr', array['informatics']::text[], 'D-6', null),
  ('exo7-quantum', 'Quantum — Mathématiques pour l’informatique quantique', 'Exo7', 'computing', 'fr', array['informatics']::text[], 'D-7', (now() at time zone 'Asia/Yerevan')::date + 11),
  ('exo7-formules', 'Formules de mathématiques', 'Exo7', 'mathematics', 'fr', array['informatics']::text[], 'D-8', null),
  ('exo7-python', 'Python au lycée — Tome 1', 'Exo7', 'computing', 'fr', array['informatics']::text[], 'D-9', null),
  ('fr-contrat-social', 'Du contrat social', 'Jean-Jacques Rousseau', 'law', 'fr', array['law']::text[], 'D-10', (now() at time zone 'Asia/Yerevan')::date + 8),
  ('ru-war-and-peace', 'Война и мир', 'Лев Толстой', 'literature', 'ru', array[]::text[], 'E-1', null),
  ('ru-onegin', 'Евгений Онегин', 'Александр Пушкин', 'literature', 'ru', array[]::text[], 'E-2', (now() at time zone 'Asia/Yerevan')::date + 13),
  ('ru-crime-and-punishment', 'Преступление и наказание', 'Фёдор Достоевский', 'literature', 'ru', array[]::text[], 'E-3', (now() at time zone 'Asia/Yerevan')::date + 5),
  ('ru-idiot', 'Идиот', 'Фёдор Достоевский', 'literature', 'ru', array[]::text[], 'E-4', null),
  ('ru-hero', 'Герой нашего времени', 'Михаил Лермонтов', 'literature', 'ru', array[]::text[], 'E-5', (now() at time zone 'Asia/Yerevan')::date + 10),
  ('ru-woe-from-wit', 'Горе от ума', 'Александр Грибоедов', 'literature', 'ru', array[]::text[], 'E-6', null),
  ('ru-dead-souls', 'Мёртвые души', 'Николай Гоголь', 'literature', 'ru', array[]::text[], 'E-7', null),
  ('ru-inspector', 'Ревизор', 'Николай Гоголь', 'literature', 'ru', array[]::text[], 'E-8', (now() at time zone 'Asia/Yerevan')::date + 7),
  ('ru-mumu', 'Муму', 'Иван Тургенев', 'literature', 'ru', array[]::text[], 'E-9', null),
  ('ru-overcoat', 'Шинель', 'Николай Гоголь', 'literature', 'ru', array[]::text[], 'E-10', null);
