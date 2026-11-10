begin;

insert into auth.users (id,email) values
  ('00000000-0000-4000-8000-000000000161','day16-owner@example.test'),
  ('00000000-0000-4000-8000-000000000162','day16-other@example.test');
insert into public.profiles (id,display_name)
select id,'Confirmation fixture' from auth.users
where id in ('00000000-0000-4000-8000-000000000161','00000000-0000-4000-8000-000000000162');
insert into public.memberships (user_id,role,status,student_group_id)
select p.id,'student','active',g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000161','00000000-0000-4000-8000-000000000162')
and g.code='DEMO-IMA-Y2';

insert into public.study_plans (id,student_id,offering_id,course_name,exam_date,target_outcome,session_minutes,study_start,study_end,study_days)
select p.id::uuid,'00000000-0000-4000-8000-000000000161',o.id,c.name,
  (now() at time zone 'Asia/Yerevan')::date+7,'Fixture',45,'17:00','20:00',array[1,2,3,4,5,6,7]::smallint[]
from (values ('00000000-0000-4000-8000-000000000163'),('00000000-0000-4000-8000-000000000164')) p(id)
cross join public.course_offerings o join public.courses c on c.id=o.course_id
join public.student_groups g on g.id=o.student_group_id join public.semesters s on s.id=o.semester_id
where c.code='DEMO-NET' and g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL';

insert into public.study_plan_topics (plan_id,position,name,confidence) values
  ('00000000-0000-4000-8000-000000000163',1,'Subnetting',2),
  ('00000000-0000-4000-8000-000000000164',1,'Routing',2);
insert into public.study_sessions (id,plan_id,student_id,topic_position,title,session_date,starts_at,ends_at) values
  ('00000000-0000-4000-8000-000000000165','00000000-0000-4000-8000-000000000163','00000000-0000-4000-8000-000000000161',1,'Subnetting',(now() at time zone 'Asia/Yerevan')::date+1,'17:00','17:45'),
  ('00000000-0000-4000-8000-000000000166','00000000-0000-4000-8000-000000000163','00000000-0000-4000-8000-000000000161',null,'Mixed review',(now() at time zone 'Asia/Yerevan')::date+1,'18:00','18:45');

update public.study_sessions set completed_at = now(), confidence_after = 4
where id = '00000000-0000-4000-8000-000000000165';
update public.study_sessions set session_date = (now() at time zone 'Asia/Yerevan')::date - 1
where id = '00000000-0000-4000-8000-000000000166';
insert into public.personal_events (student_id,title,event_date,starts_at,ends_at)
values ('00000000-0000-4000-8000-000000000161','New calendar conflict',
  (now() at time zone 'Asia/Yerevan')::date + 1,'18:00','19:00');

set local role authenticated;
do $$
declare
  plan_id uuid := '00000000-0000-4000-8000-000000000163';
  topic_session uuid := '00000000-0000-4000-8000-000000000165';
  review_session uuid := '00000000-0000-4000-8000-000000000166';
  today date := (now() at time zone 'Asia/Yerevan')::date;
  move jsonb := jsonb_build_object('id',review_session,'oldDate',today-1,'oldStart','18:00',
    'oldEnd','18:45','date',today+1,'start','18:00','end','18:45');
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000162',true);
  if public.study_rebalance_inputs(plan_id) is not null then raise exception 'Other student saw plan'; end if;
  begin
    perform public.apply_study_rebalance(plan_id,jsonb_build_array(move));
    raise exception 'Other student moved a session';
  exception when no_data_found then null;
  end;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000161',true);
  if not (public.study_rebalance_inputs(plan_id)->'saved' @>
      jsonb_build_array(jsonb_build_object('id',topic_session,'movable',false),
                        jsonb_build_object('id',review_session,'movable',true))) then
    raise exception 'Incorrect rebalance eligibility';
  end if;
  begin
    perform public.apply_study_rebalance(plan_id,jsonb_build_array(move));
    raise exception 'Accepted a new calendar conflict';
  exception when exclusion_violation then null;
  end;
  if not exists (select 1 from public.study_sessions where id=review_session and session_date=today-1) then
    raise exception 'Rejected move changed the saved date';
  end if;

  move := move || '{"start":"19:00","end":"19:45"}'::jsonb;
  if public.apply_study_rebalance(plan_id,jsonb_build_array(move)) <> 1 then
    raise exception 'Valid move was not applied';
  end if;
  if not exists (select 1 from public.study_sessions where id=review_session and session_date=today+1 and starts_at='19:00')
    or not exists (select 1 from public.study_sessions where id=topic_session and session_date=today+1
      and starts_at='17:00' and completed_at=now() and confidence_after=4) then
    raise exception 'Move failed or changed completed work';
  end if;
  begin
    perform public.apply_study_rebalance(plan_id,jsonb_build_array(move));
    raise exception 'Accepted a stale rebalance preview';
  exception when exclusion_violation then null;
  end;
end $$;
rollback;
