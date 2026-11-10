begin;

insert into auth.users (id,email) values
  ('00000000-0000-4000-8000-000000000191','day19-lecturer@example.test'),
  ('00000000-0000-4000-8000-000000000192','day19-enrolled@example.test'),
  ('00000000-0000-4000-8000-000000000193','day19-other@example.test');
insert into public.profiles (id,display_name)
select id, 'Assignment fixture' from auth.users
where id in ('00000000-0000-4000-8000-000000000191','00000000-0000-4000-8000-000000000192','00000000-0000-4000-8000-000000000193');
insert into public.memberships (user_id,role,status,student_group_id)
select p.id,'student','active',g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000192','00000000-0000-4000-8000-000000000193')
and g.code='DEMO-IMA-Y2';
insert into public.memberships (user_id,role,status)
values ('00000000-0000-4000-8000-000000000191','lecturer','active');

select set_config('test.assigned_offering',o.id::text,true) from public.course_offerings o
join public.courses c on c.id=o.course_id join public.student_groups g on g.id=o.student_group_id
join public.semesters s on s.id=o.semester_id
where c.code='DEMO-NET' and g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL';
select set_config('test.other_offering',o.id::text,true) from public.course_offerings o
join public.courses c on c.id=o.course_id join public.student_groups g on g.id=o.student_group_id
join public.semesters s on s.id=o.semester_id
where c.code='DEMO-DB' and g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL';

insert into public.lecturer_assignments values
  ('00000000-0000-4000-8000-000000000191',current_setting('test.assigned_offering')::uuid);
insert into public.enrollments values
  ('00000000-0000-4000-8000-000000000192',current_setting('test.assigned_offering')::uuid),
  ('00000000-0000-4000-8000-000000000193',current_setting('test.other_offering')::uuid);

set local role service_role;
do $$
declare
  resource uuid := '00000000-0000-4000-8000-000000000194';
  lecturer uuid := '00000000-0000-4000-8000-000000000191';
  offering uuid := current_setting('test.assigned_offering')::uuid;
  other_offering uuid := current_setting('test.other_offering')::uuid;
  object_key text := resource::text || '/' || repeat('a',64) || '.pdf';
begin
  begin
    perform public.publish_course_resource(resource,other_offering,lecturer,'Routing notes','notes.pdf',1024,object_key);
    raise exception 'Unassigned lecturer published';
  exception when insufficient_privilege then null;
  end;
  perform public.publish_course_resource(resource,offering,lecturer,'Routing notes','notes.pdf',1024,object_key);
  perform public.publish_course_resource(resource,offering,lecturer,'Routing notes','notes.pdf',1024,object_key);
  if (select count(*) from public.course_resources where id=resource) <> 1 then
    raise exception 'Publication retry duplicated the resource';
  end if;
end $$;
reset role;

set local role authenticated;
do $$
declare
  resource uuid := '00000000-0000-4000-8000-000000000194';
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000192',true);
  if not exists (select 1 from public.course_resources where id=resource) then
    raise exception 'Enrolled student could not read resource';
  end if;
  if has_function_privilege('public.publish_course_resource(uuid,uuid,uuid,text,text,integer,text)', 'execute') then
    raise exception 'Direct publication is available to authenticated users';
  end if;
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000193',true);
  if exists (select 1 from public.course_resources where id=resource) then
    raise exception 'Outsider could read resource by its ID';
  end if;
end $$;
reset role;

do $$ begin
  if not exists (select 1 from storage.buckets where id='course-pdfs' and not public
    and file_size_limit=4194304 and allowed_mime_types=array['application/pdf']) then
    raise exception 'Private PDF bucket is misconfigured';
  end if;
end $$;
rollback;
