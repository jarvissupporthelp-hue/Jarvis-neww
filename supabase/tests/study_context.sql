begin;
insert into auth.users (id,email) values
  ('00000000-0000-4000-8000-000000000111','day11-one@example.test'),
  ('00000000-0000-4000-8000-000000000112','day11-two@example.test'),
  ('00000000-0000-4000-8000-000000000113','day11-lecturer@example.test');
insert into public.profiles (id,display_name)
select id,'Context fixture' from auth.users
where id in ('00000000-0000-4000-8000-000000000111','00000000-0000-4000-8000-000000000112','00000000-0000-4000-8000-000000000113');
insert into public.memberships (user_id,role,status,student_group_id)
select v.id::uuid,v.role::public.membership_role,'active',case when v.role='student' then g.id end
from (values
  ('00000000-0000-4000-8000-000000000111','student'),
  ('00000000-0000-4000-8000-000000000112','student'),
  ('00000000-0000-4000-8000-000000000113','lecturer')
) v(id,role) cross join public.student_groups g where g.code='DEMO-IMA-Y2';

insert into public.enrollments (student_id,course_offering_id)
select v.student_id::uuid,o.id
from (values
  ('00000000-0000-4000-8000-000000000111','DEMO-NET'),
  ('00000000-0000-4000-8000-000000000112','DEMO-DB')
) v(student_id,code)
join public.courses c on c.code=v.code join public.course_offerings o on o.course_id=c.id
join public.student_groups g on g.id=o.student_group_id
join public.semesters s on s.id=o.semester_id
where g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL';

-- Use the current date for the fixture term so the test stays repeatable.
update public.semesters
set starts_on=(now() at time zone 'Asia/Yerevan')::date-1,
    ends_on=(now() at time zone 'Asia/Yerevan')::date+30
where code='DEMO-2026-FALL';

insert into public.timetable_lessons (offering_id,lecturer_id,lesson_date,starts_at,ends_at,room)
select o.id,'00000000-0000-4000-8000-000000000113',(now() at time zone 'Asia/Yerevan')::date+1,
  case when c.code='DEMO-NET' then '08:00'::time else '09:00'::time end,
  case when c.code='DEMO-NET' then '09:00'::time else '10:00'::time end,'Context test'
from public.course_offerings o join public.courses c on c.id=o.course_id
join public.student_groups g on g.id=o.student_group_id
join public.semesters s on s.id=o.semester_id
where g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL' and c.code in ('DEMO-NET','DEMO-DB');

insert into public.personal_events (student_id,title,event_date,starts_at,ends_at)
values ('00000000-0000-4000-8000-000000000111','Private event title',(now() at time zone 'Asia/Yerevan')::date+1,'15:00','16:00');
insert into public.personal_tasks (student_id,title,due_on,completed) values
  ('00000000-0000-4000-8000-000000000111','Private task title',(now() at time zone 'Asia/Yerevan')::date+1,false),
  ('00000000-0000-4000-8000-000000000111','Completed task',(now() at time zone 'Asia/Yerevan')::date+1,true);

set local role authenticated;
do $$
declare first_context jsonb; second_context jsonb;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000111',true);
  first_context := public.study_context();
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000112',true);
  second_context := public.study_context();

  if first_context->'courses'->0->>'code' is distinct from 'DEMO-NET'
    or second_context->'courses'->0->>'code' is distinct from 'DEMO-DB'
    or first_context->'classes'->0->>'start' is distinct from '08:00:00'
    or second_context->'classes'->0->>'start' is distinct from '09:00:00'
    or jsonb_array_length(first_context->'busyTimes') <> 1
    or jsonb_array_length(second_context->'busyTimes') <> 0
    or first_context->'taskDueDates'->0->>'count' is distinct from '1'
    or jsonb_array_length(second_context->'taskDueDates') <> 0
    or first_context::text like '%Private%title%'
    or first_context->>'officialExamDatesAvailable' is distinct from 'false'
  then raise exception 'Unexpected context isolation or data minimization'; end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000113',true);
  begin
    perform public.study_context();
    raise exception 'Lecturer gained access';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
