begin;

insert into auth.users (id,email) values
  ('00000000-0000-4000-8000-000000000151','day15-owner@example.test'),
  ('00000000-0000-4000-8000-000000000152','day15-other@example.test');
insert into public.profiles (id,display_name)
select id,'Confirmation fixture' from auth.users
where id in ('00000000-0000-4000-8000-000000000151','00000000-0000-4000-8000-000000000152');
insert into public.memberships (user_id,role,status,student_group_id)
select p.id,'student','active',g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000151','00000000-0000-4000-8000-000000000152')
and g.code='DEMO-IMA-Y2';

insert into public.study_plans (id,student_id,offering_id,course_name,exam_date,target_outcome,session_minutes,study_start,study_end,study_days)
select p.id::uuid,'00000000-0000-4000-8000-000000000151',o.id,c.name,
  (now() at time zone 'Asia/Yerevan')::date+7,'Fixture',45,'17:00','20:00',array[1,2,3,4,5,6,7]::smallint[]
from (values ('00000000-0000-4000-8000-000000000153'),('00000000-0000-4000-8000-000000000154')) p(id)
cross join public.course_offerings o join public.courses c on c.id=o.course_id
join public.student_groups g on g.id=o.student_group_id join public.semesters s on s.id=o.semester_id
where c.code='DEMO-NET' and g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL';

insert into public.study_plan_topics (plan_id,position,name,confidence) values
  ('00000000-0000-4000-8000-000000000153',1,'Subnetting',2),
  ('00000000-0000-4000-8000-000000000154',1,'Routing',2);
insert into public.study_sessions (id,plan_id,student_id,topic_position,title,session_date,starts_at,ends_at) values
  ('00000000-0000-4000-8000-000000000155','00000000-0000-4000-8000-000000000153','00000000-0000-4000-8000-000000000151',1,'Subnetting',(now() at time zone 'Asia/Yerevan')::date+1,'17:00','17:45'),
  ('00000000-0000-4000-8000-000000000156','00000000-0000-4000-8000-000000000153','00000000-0000-4000-8000-000000000151',null,'Mixed review',(now() at time zone 'Asia/Yerevan')::date+1,'18:00','18:45');

set local role authenticated;
do $$
declare
  topic_session uuid := '00000000-0000-4000-8000-000000000155';
  mixed_session uuid := '00000000-0000-4000-8000-000000000156';
  plan_id uuid := '00000000-0000-4000-8000-000000000153';
  completed timestamptz;
  progress jsonb;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000152',true);
  begin
    perform public.complete_study_session(topic_session,4::smallint);
    raise exception 'Cross-student completion succeeded';
  exception when no_data_found then null;
  end;
  if (public.student_dashboard()->'studyProgress') <> '[]'::jsonb then raise exception 'Other student saw progress'; end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000151',true);
  begin
    perform public.complete_study_session(mixed_session,4::smallint);
    raise exception 'Mixed review accepted a topic rating';
  exception when invalid_parameter_value then null;
  end;

  completed := public.complete_study_session(topic_session,4::smallint);
  if completed is null then raise exception 'Completion timestamp missing'; end if;
  if public.complete_study_session(topic_session,1::smallint) is distinct from completed then
    raise exception 'Retry changed the completion timestamp';
  end if;

  if not exists (select 1 from public.study_sessions where id=topic_session and completed_at=completed and confidence_after=4)
    or not exists (select 1 from public.study_plan_topics t where t.plan_id='00000000-0000-4000-8000-000000000153' and t.position=1 and t.confidence=4)
  then raise exception 'Completion or confidence was not saved atomically'; end if;

  progress := public.student_dashboard()->'studyProgress';
  if not (progress @> jsonb_build_array(jsonb_build_object('id',plan_id,'scheduled',2,'completed',1))) then
    raise exception 'Dashboard progress did not update';
  end if;
  perform public.complete_study_session(mixed_session);
  if not exists (select 1 from public.study_sessions where id=mixed_session and completed_at is not null and confidence_after is null) then
    raise exception 'Unrated review completion failed';
  end if;
end $$;

reset role;
update public.memberships set status='disabled' where user_id='00000000-0000-4000-8000-000000000151';
set local role authenticated;
do $$ begin
  begin
    perform public.complete_study_session('00000000-0000-4000-8000-000000000155');
    raise exception 'Disabled student reached completion';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
