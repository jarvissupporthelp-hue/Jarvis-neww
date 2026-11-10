begin;
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000081','day8-owner@example.test'),
  ('00000000-0000-4000-8000-000000000082','day8-other@example.test');
insert into public.profiles (id, display_name) values
  ('00000000-0000-4000-8000-000000000081','Planner owner'),
  ('00000000-0000-4000-8000-000000000082','Other student');
insert into public.memberships (user_id, role, status, student_group_id)
select p.id, 'student', 'active', g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000082')
and g.code = 'DEMO-IMA-Y2';

set local role authenticated;
do $$
declare
  task_id uuid;
  event_id uuid;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
  insert into public.personal_tasks (title) values ('Review subnetting') returning id into task_id;
  insert into public.personal_events (title,event_date,starts_at,ends_at)
  values ('Study block','2026-11-12','12:00','13:00') returning id into event_id;

  update public.personal_tasks set completed = true, due_on = '2026-11-12' where id = task_id;
  if not found then raise exception 'Owner could not update task'; end if;
  update public.personal_events set title = 'Review block' where id = event_id;
  if not found then raise exception 'Owner could not update event'; end if;

  begin
    insert into public.personal_tasks (title,student_id)
    values ('Forged owner','00000000-0000-4000-8000-000000000082');
    raise exception 'Caller forged task ownership';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.timetable_lessons set room = 'Forged room';
    raise exception 'Student could edit official classes';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000082',true);
  if exists (select 1 from public.personal_tasks where id = task_id)
    or exists (select 1 from public.personal_events where id = event_id) then
    raise exception 'Student could read another student’s entries';
  end if;
  update public.personal_tasks set completed = false where id = task_id;
  if found then raise exception 'Student could edit another student’s task'; end if;
  delete from public.personal_events where id = event_id;
  if found then raise exception 'Student could delete another student’s event'; end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
  delete from public.personal_tasks where id = task_id;
  if not found then raise exception 'Owner could not delete task'; end if;
  delete from public.personal_events where id = event_id;
  if not found then raise exception 'Owner could not delete event'; end if;
end
$$;

reset role;
update public.memberships set status = 'disabled' where user_id = '00000000-0000-4000-8000-000000000081';
set local role authenticated;
do $$ begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000081',true);
  begin
    insert into public.personal_tasks (title) values ('Disabled account task');
    raise exception 'Disabled account could create a task';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
