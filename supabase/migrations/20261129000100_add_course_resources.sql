insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-pdfs', 'course-pdfs', false, 4194304, array['application/pdf']);

create policy server_only_course_pdf_objects on storage.objects as restrictive
for all to anon, authenticated
using (bucket_id <> 'course-pdfs') with check (bucket_id <> 'course-pdfs');

create table public.course_resources (
  id uuid primary key,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  published_by uuid references public.profiles(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 120),
  filename text not null check (length(filename) between 1 and 180),
  size_bytes integer not null check (size_bytes between 1 and 4194304),
  object_key text not null unique check (object_key ~ '^[0-9a-f-]{36}/[0-9a-f]{64}\.pdf$'),
  published_at timestamptz not null default now()
);
create index course_resources_offering_idx on public.course_resources(offering_id, published_at desc, id);

alter table public.course_resources enable row level security;
revoke all on public.course_resources from public, anon, authenticated;
grant select on public.course_resources to authenticated;
create policy enrolled_or_teaching_resource_reads on public.course_resources for select to authenticated
using (
  offering_id in (select course_offering_id from public.enrollments)
  or offering_id in (select course_offering_id from public.lecturer_assignments)
);

-- Only the server can write objects or publish metadata.
create function public.publish_course_resource(
  p_id uuid, p_offering_id uuid, p_publisher uuid, p_title text,
  p_filename text, p_size integer, p_object_key text
)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  existing public.course_resources;
begin
  perform 1 from public.memberships where user_id = p_publisher and role = 'lecturer' and status = 'active' for share;
  if not found then raise insufficient_privilege; end if;
  perform 1 from public.lecturer_assignments
  where lecturer_id = p_publisher and course_offering_id = p_offering_id for share;
  if not found then raise insufficient_privilege; end if;

  insert into public.course_resources(id, offering_id, published_by, title, filename, size_bytes, object_key)
  values (p_id, p_offering_id, p_publisher, p_title, p_filename, p_size, p_object_key)
  on conflict (id) do nothing;
  select * into existing from public.course_resources where id = p_id;
  if (existing.offering_id, existing.published_by, existing.title, existing.filename, existing.size_bytes, existing.object_key)
    is distinct from (p_offering_id, p_publisher, p_title, p_filename, p_size, p_object_key)
  then raise unique_violation; end if;
  return p_id;
end;
$$;
grant select, insert on public.course_resources to service_role;
revoke execute on function public.publish_course_resource(uuid, uuid, uuid, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.publish_course_resource(uuid, uuid, uuid, text, text, integer, text) to service_role;
