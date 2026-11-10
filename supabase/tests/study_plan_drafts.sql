begin;
insert into auth.users (id,email) values
  ('00000000-0000-4000-8000-000000000121','day12-one@example.test'),
  ('00000000-0000-4000-8000-000000000122','day12-two@example.test');
insert into public.profiles (id,display_name)
select id,'Plan fixture' from auth.users
where id in ('00000000-0000-4000-8000-000000000121','00000000-0000-4000-8000-000000000122');
insert into public.memberships (user_id,role,status,student_group_id)
select p.id,'student','active',g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000121','00000000-0000-4000-8000-000000000122')
and g.code='DEMO-IMA-Y2';
insert into public.enrollments (student_id,course_offering_id)
select '00000000-0000-4000-8000-000000000121',o.id
from public.course_offerings o join public.courses c on c.id=o.course_id
join public.student_groups g on g.id=o.student_group_id
join public.semesters s on s.id=o.semester_id
where c.code='DEMO-NET' and g.code='DEMO-IMA-Y2' and s.code='DEMO-2026-FALL';

set local role authenticated;
do $$
declare
  draft_id uuid := '00000000-0000-4000-8000-000000000123';
  bad_id uuid := '00000000-0000-4000-8000-000000000124';
  offering uuid;
  draft jsonb;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000121',true);
  select course_offering_id into strict offering from public.enrollments;
  draft := jsonb_build_object('id',draft_id,'offeringId',offering,
    'examDate',(now() at time zone 'Asia/Yerevan')::date+7,'target','Explain subnetting',
    'minutes',45,'start','17:00','end','20:00','studyDays',jsonb_build_array(1,3,5),
    'topics','[{"name":"CIDR","confidence":2},{"name":"Routing","confidence":4}]'::jsonb);
  if public.save_study_plan_draft(draft) <> draft_id then raise exception 'Draft was not saved'; end if;
  if public.save_study_plan_draft(draft) <> draft_id then raise exception 'Retry changed the draft ID'; end if;
  if (select count(*) from public.study_plan_topics where plan_id=draft_id) <> 2 then
    raise exception 'Topics missing or duplicated';
  end if;
  begin
    perform public.save_study_plan_draft(draft || jsonb_build_object('id',bad_id,
      'topics','[{"name":"CIDR","confidence":8}]'::jsonb));
    raise exception 'Invalid confidence accepted';
  exception when check_violation then null;
  end;
  if exists(select 1 from public.study_plans where id=bad_id) then
    raise exception 'Invalid topic left a partially saved plan';
  end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000122',true);
  if exists(select 1 from public.study_plans where id=draft_id)
    or exists(select 1 from public.study_plan_topics where plan_id=draft_id) then
    raise exception 'Cross-student read succeeded';
  end if;
  begin
    perform public.save_study_plan_draft(draft || jsonb_build_object('id',bad_id));
    raise exception 'Unenrolled course accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
