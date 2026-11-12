create table public.lecturer_ai_notes (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  lecturer_id uuid not null default auth.uid() references public.memberships(user_id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  content text not null check (length(btrim(content)) between 1 and 12000),
  updated_at timestamptz not null default now()
);
create index lecturer_ai_notes_owner_idx on public.lecturer_ai_notes(lecturer_id, offering_id);
alter table public.lecturer_ai_notes enable row level security;
revoke all on public.lecturer_ai_notes from public, anon, authenticated;
grant select, insert (id, offering_id, title, content), update (title, content, updated_at), delete
  on public.lecturer_ai_notes to authenticated;

create policy private_lecturer_notes on public.lecturer_ai_notes for all to authenticated
using (
  lecturer_id = (select auth.uid())
  and exists (select 1 from public.memberships m
    join public.lecturer_assignments a on a.lecturer_id = m.user_id
    where m.user_id = (select auth.uid()) and m.role = 'lecturer' and m.status = 'active'
      and a.course_offering_id = offering_id)
)
with check (
  lecturer_id = (select auth.uid())
  and exists (select 1 from public.memberships m
    join public.lecturer_assignments a on a.lecturer_id = m.user_id
    where m.user_id = (select auth.uid()) and m.role = 'lecturer' and m.status = 'active'
      and a.course_offering_id = offering_id)
);

create table public.lecturer_private_files (
  id uuid primary key,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  lecturer_id uuid not null default auth.uid() references public.memberships(user_id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 120),
  filename text not null check (length(filename) between 1 and 180),
  body bytea not null check (octet_length(body) between 1 and 4194304),
  created_at timestamptz not null default now()
);
create index lecturer_private_files_owner_idx on public.lecturer_private_files(lecturer_id, offering_id);
alter table public.lecturer_private_files enable row level security;
revoke all on public.lecturer_private_files from public, anon, authenticated;
grant select, insert (id, offering_id, title, filename, body), delete on public.lecturer_private_files to authenticated;

create policy private_lecturer_files on public.lecturer_private_files for all to authenticated
using (
  lecturer_id = (select auth.uid())
  and exists (select 1 from public.memberships m
    join public.lecturer_assignments a on a.lecturer_id = m.user_id
    where m.user_id = (select auth.uid()) and m.role = 'lecturer' and m.status = 'active'
      and a.course_offering_id = offering_id)
)
with check (
  lecturer_id = (select auth.uid())
  and exists (select 1 from public.memberships m
    join public.lecturer_assignments a on a.lecturer_id = m.user_id
    where m.user_id = (select auth.uid()) and m.role = 'lecturer' and m.status = 'active'
      and a.course_offering_id = offering_id)
);

create function public.publish_private_lecturer_pdf(
  p_id uuid, p_offering_id uuid, p_title text, p_filename text, p_base64 text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare pdf bytea;
begin
  if p_base64 is null or length(p_base64) > 5592408
    or p_filename !~* '\.pdf$' or p_filename ~ '[[:cntrl:]]'
    or length(p_filename) > 180 then raise invalid_parameter_value; end if;
  pdf := decode(p_base64, 'base64');
  insert into public.lecturer_private_files(id, offering_id, title, filename, body)
    values (p_id, p_offering_id, p_title, p_filename, pdf);
  return p_id;
end;
$$;
revoke execute on function public.publish_private_lecturer_pdf(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.publish_private_lecturer_pdf(uuid, uuid, text, text, text) to authenticated;

create function public.read_private_lecturer_pdf(p_id uuid)
returns text language sql stable security invoker set search_path = '' as $$
  select encode(body, 'base64') from public.lecturer_private_files where id = p_id;
$$;
revoke execute on function public.read_private_lecturer_pdf(uuid) from public, anon, authenticated;
grant execute on function public.read_private_lecturer_pdf(uuid) to authenticated;
