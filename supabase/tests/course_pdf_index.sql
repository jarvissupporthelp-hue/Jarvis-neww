begin;

insert into public.student_groups(program_id,academic_year,code,name)
select program_id,academic_year,'TEST-DAY20-PDF','PDF index fixture'
from public.student_groups where code='DEMO-IMA-Y2';

insert into public.course_offerings(course_id,semester_id,student_group_id)
select o.course_id,o.semester_id,target.id from public.course_offerings o
join public.student_groups source on source.id=o.student_group_id and source.code='DEMO-IMA-Y2'
join public.student_groups target on target.code='TEST-DAY20-PDF'
join public.semesters s on s.id=o.semester_id and s.code='DEMO-2026-FALL'
join public.courses c on c.id=o.course_id and c.code in ('DEMO-NET','DEMO-DB');

insert into auth.users (id,email) values
  ('00000000-0000-4000-8000-000000000201','day20-lecturer@example.test'),
  ('00000000-0000-4000-8000-000000000202','day20-enrolled@example.test'),
  ('00000000-0000-4000-8000-000000000203','day20-other@example.test');
insert into public.profiles (id,display_name)
select id, 'Assignment fixture' from auth.users
where id in ('00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000203');
insert into public.memberships (user_id,role,status,student_group_id)
select p.id,'student','active',g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000203')
and g.code='TEST-DAY20-PDF';
insert into public.memberships (user_id,role,status)
values ('00000000-0000-4000-8000-000000000201','lecturer','active');

select set_config('test.assigned_offering',o.id::text,true) from public.course_offerings o
join public.courses c on c.id=o.course_id join public.student_groups g on g.id=o.student_group_id
join public.semesters s on s.id=o.semester_id
where c.code='DEMO-NET' and g.code='TEST-DAY20-PDF' and s.code='DEMO-2026-FALL';
select set_config('test.other_offering',o.id::text,true) from public.course_offerings o
join public.courses c on c.id=o.course_id join public.student_groups g on g.id=o.student_group_id
join public.semesters s on s.id=o.semester_id
where c.code='DEMO-DB' and g.code='TEST-DAY20-PDF' and s.code='DEMO-2026-FALL';

insert into public.lecturer_assignments values
  ('00000000-0000-4000-8000-000000000201',current_setting('test.assigned_offering')::uuid);
insert into public.enrollments values
  ('00000000-0000-4000-8000-000000000202',current_setting('test.assigned_offering')::uuid),
  ('00000000-0000-4000-8000-000000000203',current_setting('test.other_offering')::uuid);

set local role authenticated;
do $$
declare
  resource uuid := '00000000-0000-4000-8000-000000000204';
  unreadable uuid := '00000000-0000-4000-8000-000000000205';
  offering uuid := current_setting('test.assigned_offering')::uuid;
  pdf text := encode(convert_to(E'%PDF-1.4\nDemo\n%%EOF\n','UTF8'),'base64');
  results jsonb;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000201',true);
  perform public.publish_course_pdf(resource,offering,'Routing notes','notes.pdf',pdf);
  perform public.publish_course_pdf(unreadable,offering,'Scanned notes','scan.pdf',pdf);
  if public.save_course_pdf_index(resource,'[{"page":2,"text":"Subnetting divides an IPv4 network into smaller networks."}]') <> 'indexed'
    or public.save_course_pdf_index(unreadable,'[]') <> 'unsearchable' then
    raise exception 'Incorrect indexing state';
  end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000202',true);
  results := public.search_course_pdf_pages(array['subnetting']);
  if not (results @> '{"matches":[{"title":"Routing notes","page":2}],"unavailable":1}') then
    raise exception 'Wrong page citation or unavailable count: %',results;
  end if;
  if public.read_course_pdf(unreadable) is distinct from pdf then
    raise exception 'Unsearchable PDF is no longer readable';
  end if;
  begin
    perform public.save_course_pdf_index(unreadable,'[]');
    raise exception 'Student changed index';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000203',true);
  if public.search_course_pdf_pages(array['subnetting']) <> '{"matches":[],"unavailable":0}'::jsonb
    or exists (select 1 from public.course_pdf_pages where resource_id=resource) then
    raise exception 'Outsider could discover indexed content';
  end if;
end $$;
rollback;
