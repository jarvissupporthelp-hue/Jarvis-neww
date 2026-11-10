-- The original bucket was introduced in this release and contains no resources.
-- Remove its configuration through Storage separately if it was provisioned.
drop function public.publish_course_resource(uuid, uuid, uuid, text, text, integer, text);
alter table public.course_resources drop column object_key;

create table public.course_resource_files (
  resource_id uuid primary key references public.course_resources(id) on delete cascade,
  body bytea not null check (octet_length(body) between 1 and 4194304)
);
alter table public.course_resource_files enable row level security;
revoke all on public.course_resource_files from public, anon, authenticated;
grant select on public.course_resource_files to authenticated;
create policy visible_course_resource_files on public.course_resource_files for select to authenticated
using (resource_id in (select id from public.course_resources));

create function jarvis_private.publish_course_pdf(
  p_id uuid, p_offering_id uuid, p_title text, p_filename text, p_base64 text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  pdf bytea;
  existing public.course_resources;
begin
  perform 1 from public.memberships where user_id = caller and role = 'lecturer' and status = 'active' for share;
  if not found then raise insufficient_privilege; end if;
  perform 1 from public.lecturer_assignments
  where lecturer_id = caller and course_offering_id = p_offering_id for share;
  if not found then raise insufficient_privilege; end if;

  if p_base64 is null or length(p_base64) > 5592408
    or p_filename is null or p_filename !~* '\.pdf$' or p_filename ~ '[[:cntrl:]]'
  then raise invalid_parameter_value; end if;
  pdf := decode(p_base64, 'base64');
  if octet_length(pdf) not between 1 and 4194304
    or encode(substring(pdf from 1 for 16), 'escape') !~ ('^%PDF-[12]\.[0-9]' || '[[:space:]]')
    or encode(substring(pdf from greatest(octet_length(pdf)-1023,1)), 'escape') !~ '%%EOF[[:space:]]*$'
  then raise invalid_parameter_value; end if;

  insert into public.course_resources(id, offering_id, published_by, title, filename, size_bytes)
  values (p_id, p_offering_id, caller, btrim(p_title), p_filename, octet_length(pdf))
  on conflict (id) do nothing;
  if found then
    insert into public.course_resource_files(resource_id,body) values (p_id,pdf);
  else
    select * into existing from public.course_resources where id = p_id;
    if (existing.offering_id, existing.published_by, existing.title, existing.filename)
      is distinct from (p_offering_id, caller, btrim(p_title), p_filename)
      or not exists (select 1 from public.course_resource_files where resource_id=p_id and body=pdf)
    then raise unique_violation; end if;
  end if;
  return p_id;
end;
$$;

revoke execute on function jarvis_private.publish_course_pdf(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function jarvis_private.publish_course_pdf(uuid, uuid, text, text, text) to authenticated;

create function public.publish_course_pdf(p_id uuid, p_offering_id uuid, p_title text, p_filename text, p_base64 text)
returns uuid language sql security invoker set search_path = ''
as $$ select jarvis_private.publish_course_pdf(p_id, p_offering_id, p_title, p_filename, p_base64); $$;

revoke execute on function public.publish_course_pdf(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.publish_course_pdf(uuid, uuid, text, text, text) to authenticated;

create function public.read_course_pdf(p_id uuid)
returns text language sql stable security invoker set search_path = ''
as $$ select encode(body,'base64') from public.course_resource_files where resource_id=p_id; $$;

revoke execute on function public.read_course_pdf(uuid) from public, anon, authenticated;
grant execute on function public.read_course_pdf(uuid) to authenticated;
