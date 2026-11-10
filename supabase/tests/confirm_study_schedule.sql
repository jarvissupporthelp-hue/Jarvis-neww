begin;

insert into auth.users (id,email) values
  ('00000000-0000-4000-8000-000000000141','day14-owner@example.test'),
  ('00000000-0000-4000-8000-000000000142','day14-other@example.test');
insert into public.profiles (id,display_name)
select id,'Confirmation fixture' from auth.users
where id in ('00000000-0000-4000-8000-000000000141','00000000-0000-4000-8000-000000000142');
insert into public.memberships (user_id,role,status,student_group_id)
select p.id,'student','active',g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000141','00000000-0000-4000-8000-000000000142')
and g.code='DEMO-IMA-Y2';

insert into public.study_plans (id,student_id,offering_id,course_name,exam_date,target_outcome,session_minutes,study_start,study_end,study_days)
select p.id::uuid,'00000000-0000-4000-8000-000000000141',o.id,c.name,
  (now() at time zone 'Asia/Yerevan')::date+7,'Fixture',45,'17:00','20:00',array[1,2,3,4,5,6,7]::smallint[]
from (values ('00000000-0000-4000-8000-000000000143'),('00000000-0000-4000-8000-000000000144')) p(id)
cross join public.course_offerings o join public.courses c on c.id=o.course_id
join public.student_groups g on g.id=o.student_group_id join public.semesters s on s.id=o.semester_id
where c.code='DEMO-NET' and g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL';

insert into public.study_plan_topics (plan_id,position,name,confidence) values
  ('00000000-0000-4000-8000-000000000143',1,'Subnetting',2),
  ('00000000-0000-4000-8000-000000000144',1,'Routing',2);
insert into public.personal_events (student_id,title,event_date,starts_at,ends_at)
values ('00000000-0000-4000-8000-000000000141','New calendar conflict',
  (now() at time zone 'Asia/Yerevan')::date+1,'18:00','19:00');

set local role authenticated;
do $$
declare
  plan_id uuid := '00000000-0000-4000-8000-000000000143';
  other_plan uuid := '00000000-0000-4000-8000-000000000144';
  tomorrow date := (now() at time zone 'Asia/Yerevan')::date+1;
  proposal jsonb;
  conflicting jsonb;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000141',true);
  proposal := jsonb_build_object('topicPosition',1,'date',tomorrow,'start','17:00','end','17:45');
  conflicting := jsonb_build_object('topicPosition',null,'date',tomorrow,'start','18:00','end','18:45');
  begin
    perform public.confirm_study_schedule(plan_id,jsonb_build_array(proposal,conflicting));
    raise exception 'Stale preview accepted';
  exception when exclusion_violation then null;
  end;
  if exists (select 1 from public.study_sessions where study_sessions.plan_id='00000000-0000-4000-8000-000000000143') then
    raise exception 'Rejected confirmation left partial sessions';
  end if;
  if public.confirm_study_schedule(plan_id,jsonb_build_array(proposal)) <> 1 then
    raise exception 'Initial confirmation did not save a session';
  end if;
  if public.confirm_study_schedule(plan_id,jsonb_build_array(proposal)) <> 1 then
    raise exception 'Confirmation retry returned the wrong count';
  end if;
  if (select count(*) from public.study_sessions) <> 1 then
    raise exception 'Confirmation retry duplicated or lost a session';
  end if;
  if not (public.study_schedule_inputs(other_plan)->'busy' @> jsonb_build_array(
    jsonb_build_object('date',tomorrow,'start','17:00:00','end','17:45:00')
  )) then raise exception 'Saved session missing from other plan availability'; end if;
  begin
    perform public.confirm_study_schedule(other_plan,jsonb_build_array(proposal));
    raise exception 'Existing session did not block a different plan';
  exception when exclusion_violation then null;
  end;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000142',true);
  if exists (select 1 from public.study_sessions) then raise exception 'Cross-student read succeeded'; end if;
  begin
    perform public.confirm_study_schedule(plan_id,jsonb_build_array(proposal));
    raise exception 'Cross-student confirmation succeeded';
  exception when no_data_found then null;
  end;
end $$;
rollback;
