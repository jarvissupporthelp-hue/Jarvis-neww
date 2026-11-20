create table public.physical_library_loans (
  id uuid primary key default gen_random_uuid(),
  book_id text not null references public.physical_library_books(id),
  borrower uuid not null references public.memberships(user_id),
  borrowed_at timestamptz not null default now(),
  due_on date not null,
  returned_at timestamptz
);
create unique index physical_library_one_checkout on public.physical_library_loans(book_id) where returned_at is null;
create index physical_library_reader on public.physical_library_loans(borrower, borrowed_at desc);
alter table public.physical_library_loans enable row level security;
revoke all on public.physical_library_loans from public, anon, authenticated;
grant select on public.physical_library_loans to authenticated;
create policy reader_loans on public.physical_library_loans for select to authenticated using (
 borrower = (select auth.uid()) and exists(select 1 from public.memberships where user_id=auth.uid() and status='active')
);

create function jarvis_private.checkout_library_book(book text, reader uuid, due_date date)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.memberships where user_id=auth.uid() and status='active' and role='admin') then raise insufficient_privilege; end if;
 if not exists(select 1 from public.memberships where user_id=reader and status='active') then raise exception 'Inactive borrower'; end if;
 if due_date is null or due_date < (now() at time zone 'Asia/Yerevan')::date then raise exception 'Invalid due date'; end if;
 update public.physical_library_books set expected_return=due_date where id=book and expected_return is null;
 if not found then raise exception 'Book unavailable'; end if;
 insert into public.physical_library_loans(book_id,borrower,due_on) values(book,reader,due_date);
end $$;
create function public.checkout_library_book(book text, reader uuid, due_date date) returns void language sql security invoker set search_path='' as $$
 select jarvis_private.checkout_library_book(book, reader, due_date)
$$;
revoke all on function public.checkout_library_book(text,uuid,date),jarvis_private.checkout_library_book(text,uuid,date) from public,anon;
grant execute on function public.checkout_library_book(text,uuid,date),jarvis_private.checkout_library_book(text,uuid,date) to authenticated;
create function jarvis_private.sync_library_loan() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.physical_library_loans set due_on=coalesce(new.expected_return,due_on),
 returned_at=case when new.expected_return is null then now() end where book_id=new.id and returned_at is null;
 return new;
end $$;
create trigger sync_library_loan after update of expected_return on public.physical_library_books for each row
 when(old.expected_return is distinct from new.expected_return) execute function jarvis_private.sync_library_loan();

-- Some installations use only the Supabase catalogue.
do $$ begin
 if to_regclass('foundation."CampusLoan"') is not null then
   alter table foundation."CampusLoan" add column if not exists "borrowedAt" timestamptz;
   alter table foundation."CampusLoan" alter column "borrowedAt" set default now();
 end if;
end $$;

create function jarvis_private.reader_loan_history() returns table
(id uuid,title text, borrowed_at timestamptz,due_on date,returned_at timestamptz,renewable boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.memberships where user_id=auth.uid() and status='active') then raise insufficient_privilege; end if;
 return query select l.id,b.title,l.borrowed_at,l.due_on,l.returned_at,false
 from public.physical_library_loans l join public.physical_library_books b on b.id=l.book_id
 where l.borrower=auth.uid();
 if to_regclass('foundation."CampusLoan"') is not null then
 return query select l.id,b.title,(to_jsonb(l)->>'borrowedAt')::timestamptz,
 (l."dueAt" at time zone 'Asia/Yerevan')::date,l."returnedAt",l."returnedAt" is null and l.renewals<2
 from foundation."CampusLoan" l join foundation."CampusResource" b on b.id=l."resourceId"
 where l."ownerId"=auth.uid() and b.kind='book';
 end if;
end $$;
create function public.reader_loan_history() returns table
(id uuid,title text, borrowed_at timestamptz,due_on date,returned_at timestamptz,renewable boolean)
language sql stable security invoker set search_path='' as $$ select * from jarvis_private.reader_loan_history() $$;
revoke all on function public.reader_loan_history(),jarvis_private.reader_loan_history() from public,anon;
grant execute on function public.reader_loan_history(),jarvis_private.reader_loan_history() to authenticated;
