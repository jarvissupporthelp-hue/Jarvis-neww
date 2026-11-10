begin;

insert into auth.users (id,email) values
  ('00000000-0000-4000-8000-000000000181','day18-lecturer@example.test'),
  ('00000000-0000-4000-8000-000000000182','day18-enrolled@example.test'),
  ('00000000-0000-4000-8000-000000000183','day18-other@example.test');
insert into public.profiles (id,display_name)
select id, 'Assignment fixture' from auth.users
where id in ('00000000-0000-4000-8000-000000000181','00000000-0000-4000-8000-000000000182','00000000-0000-4000-8000-000000000183');
insert into public.memberships (user_id,role,status,student_group_id)
select p.id,'student','active',g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000182','00000000-0000-4000-8000-000000000183')
and g.code='DEMO-IMA-Y2';
insert into public.memberships (user_id,role,status)
values ('00000000-0000-4000-8000-000000000181','lecturer','active');

select set_config('test.assigned_offering',o.id::text,true) from public.course_offerings o
join public.courses c on c.id=o.course_id join public.student_groups g on g.id=o.student_group_id
join public.semesters s on s.id=o.semester_id
where c.code='DEMO-NET' and g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL';
select set_config('test.other_offering',o.id::text,true) from public.course_offerings o
join public.courses c on c.id=o.course_id join public.student_groups g on g.id=o.student_group_id
join public.semesters s on s.id=o.semester_id
where c.code='DEMO-DB' and g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL';

insert into public.lecturer_assignments values
  ('00000000-0000-4000-8000-000000000181',current_setting('test.assigned_offering')::uuid);
insert into public.enrollments values
  ('00000000-0000-4000-8000-000000000182',current_setting('test.assigned_offering')::uuid),
  ('00000000-0000-4000-8000-000000000183',current_setting('test.other_offering')::uuid);

set local role authenticated;
do $$
declare
  publication uuid := '00000000-0000-4000-8000-000000000184';
  offering uuid := current_setting('test.assigned_offering')::uuid;
  other_offering uuid := current_setting('test.other_offering')::uuid;
  tomorrow date := (now() at time zone 'Asia/Yerevan')::date+1;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000181',true);
  begin
    perform public.publish_course_assignment(publication,other_offering,'Quiz','Submit the worksheet',tomorrow,'18:00');
    raise exception 'Unassigned lecturer published';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.publish_course_assignment(publication,offering,'Quiz','Submit the worksheet',tomorrow-2,'18:00');
    raise exception 'Accepted a past deadline';
  exception when invalid_parameter_value then null;
  end;
  if (public.publish_course_assignment(publication,offering,'Quiz','Submit the worksheet',tomorrow,'18:00')).id is distinct from publication
    or (public.publish_course_assignment(publication,offering,'Quiz','Submit the worksheet',tomorrow,'18:00')).id is distinct from publication
  then raise exception 'Publication or retry failed'; end if;
  begin
    perform public.publish_course_assignment(publication,offering,'Changed','Submit the worksheet',tomorrow,'18:00');
    raise exception 'Conflicting retry succeeded';
  exception when unique_violation then null;
  end;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000182',true);
  if not exists (select 1 from public.course_assignments where id=publication and due_on=tomorrow and due_at='18:00')
  then raise exception 'Enrolled student cannot see the assignment'; end if;
  begin
    perform public.publish_course_assignment(publication,offering,'Quiz','Submit the worksheet',tomorrow,'18:00');
    raise exception 'Student published';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000183',true);
  if exists (select 1 from public.course_assignments where id=publication)
  then raise exception 'Unenrolled student can see the assignment'; end if;
end $$;
rollback;
