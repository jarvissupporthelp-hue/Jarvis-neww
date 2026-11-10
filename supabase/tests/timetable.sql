begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000061','day6-admin@example.test'),
  ('00000000-0000-4000-8000-000000000062','day6-student@example.test'),
  ('00000000-0000-4000-8000-000000000063','day6-lecturer@example.test'),
  ('00000000-0000-4000-8000-000000000064','day6-other@example.test'),
  ('00000000-0000-4000-8000-000000000065','day6-other-lecturer@example.test');

insert into public.profiles (id, display_name)
select id, 'Day 6 fixture' from auth.users where email like 'day6-%@example.test';

insert into public.memberships (user_id, role, status, student_group_id)
select v.id::uuid, v.role::public.membership_role, 'active',
  case when v.role = 'student' then g.id end
from (values
  ('00000000-0000-4000-8000-000000000061','admin'),
  ('00000000-0000-4000-8000-000000000062','student'),
  ('00000000-0000-4000-8000-000000000063','lecturer'),
  ('00000000-0000-4000-8000-000000000064','student'),
  ('00000000-0000-4000-8000-000000000065','lecturer')
) v(id, role)
cross join public.student_groups g where g.code = 'DEMO-IMA-Y2';

insert into public.student_groups (program_id, academic_year, code, name)
select program_id, 2, 'TEST-DAY6-OTHER', 'Other test group' from public.student_groups where code = 'DEMO-IMA-Y2';
insert into public.course_offerings (course_id, semester_id, student_group_id)
select o.course_id, o.semester_id, g.id
from public.course_offerings o join public.courses c on c.id = o.course_id
cross join public.student_groups g where c.code = 'DEMO-NET' and g.code = 'TEST-DAY6-OTHER';

insert into public.lecturer_assignments (lecturer_id, course_offering_id)
select lecturer.id, o.id from public.course_offerings o
cross join (values ('00000000-0000-4000-8000-000000000063'::uuid), ('00000000-0000-4000-8000-000000000065'::uuid)) lecturer(id);
insert into public.enrollments (student_id, course_offering_id)
select '00000000-0000-4000-8000-000000000062', o.id
from public.course_offerings o join public.courses c on c.id = o.course_id
join public.student_groups g on g.id = o.student_group_id
where c.code = 'DEMO-NET' and g.code = 'DEMO-IMA-Y2';

set local role authenticated;
do $$
declare
  admin_id text := '00000000-0000-4000-8000-000000000061';
  student_id text := '00000000-0000-4000-8000-000000000062';
  lecturer_id text := '00000000-0000-4000-8000-000000000063';
  other_lecturer text := '00000000-0000-4000-8000-000000000065';
  primary_offering uuid;
  other_offering uuid;
  payload jsonb;
  lesson_id text;
  conflict jsonb;
begin
  perform set_config('request.jwt.claim.sub', admin_id, true);
  select o.id into strict primary_offering from public.course_offerings o
    join public.courses c on c.id = o.course_id join public.student_groups g on g.id = o.student_group_id
    where c.code = 'DEMO-NET' and g.code = 'DEMO-IMA-Y2';
  select o.id into strict other_offering from public.course_offerings o
    join public.student_groups g on g.id = o.student_group_id where g.code = 'TEST-DAY6-OTHER';
  payload := jsonb_build_object('offeringId',primary_offering,'lecturerId',lecturer_id,
    'date','2026-11-10','start','10:00','end','11:00','room','TEST-601');
  lesson_id := public.timetable('save',payload)->>'id';
  for conflict in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('offeringId',other_offering,'lecturerId',other_lecturer,'room','test-601'),
    jsonb_build_object('offeringId',other_offering,'room','TEST-602'),
    jsonb_build_object('lecturerId',other_lecturer,'room','TEST-602')
  )) loop
    begin
      perform public.timetable('save',payload || conflict || '{"start":"10:30","end":"11:30"}');
      raise exception 'Overlap was accepted';
    exception when exclusion_violation then null;
    end;
  end loop;

  perform public.timetable('save',payload || jsonb_build_object('id',lesson_id,'room','TEST-603'));
  perform public.timetable('save',payload || '{"start":"11:00","end":"12:00"}');
  perform set_config('request.jwt.claim.sub', student_id, true);
  if jsonb_array_length(public.timetable('list','{"week":"2026-11-09"}')) <> 2
    or (select count(*) from public.timetable_lessons where id = lesson_id::uuid) <> 1 then
    raise exception 'Enrolled student did not see own lessons';
  end if;
  begin
    perform public.timetable('remove',jsonb_build_object('id',lesson_id));
    raise exception 'Student could remove a lesson';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', lecturer_id, true);
  if jsonb_array_length(public.timetable('list','{"week":"2026-11-09"}')) <> 2 then
    raise exception 'Lecturer did not see assigned lessons';
  end if;
  perform set_config('request.jwt.claim.sub', other_lecturer, true);
  if jsonb_array_length(public.timetable('list','{"week":"2026-11-09"}')) <> 0 then
    raise exception 'Another lecturer saw lessons assigned to a colleague';
  end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000064', true);
  if jsonb_array_length(public.timetable('list','{"week":"2026-11-09"}')) <> 0 then
    raise exception 'Unenrolled student saw lessons';
  end if;

  perform set_config('request.jwt.claim.sub', admin_id, true);
  perform public.timetable('remove',jsonb_build_object('id',lesson_id));
  if exists (select 1 from public.timetable_lessons where id = lesson_id::uuid) then
    raise exception 'Lesson was not removed';
  end if;
end
$$;
rollback;
