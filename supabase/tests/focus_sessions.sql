begin;

insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000000211','day21-owner@example.test'),
 ('00000000-0000-4000-8000-000000000212','day21-other@example.test');
insert into public.profiles(id,display_name)
select id,'Focus test' from auth.users where email in ('day21-owner@example.test','day21-other@example.test');
insert into public.memberships(user_id,role,status,student_group_id)
select p.id,'student','active',g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000212') and g.code='DEMO-IMA-Y2';

set local role authenticated;
do $$
declare
  timer uuid := '00000000-0000-4000-8000-000000000213';
  other_timer uuid := '00000000-0000-4000-8000-000000000214';
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000211',true);
  if public.focus_timer('start',timer,'focus',1,'Subnetting')->'active'->>'state' <> 'running'
    or public.focus_timer('start',other_timer,'break',5)->'active'->>'id' <> timer::text
    or public.focus_timer('pause',timer)->'active'->>'state' <> 'paused'
    or public.focus_timer('read')->'active'->>'state' <> 'paused'
    or public.focus_timer('resume',timer)->'active'->>'state' <> 'running'
  then raise exception 'Timer state transition failed'; end if;
end $$;
reset role;

-- Move the deadline into the past to test completion without a wall-clock wait.
update public.focus_sessions set ends_at=clock_timestamp()-interval '1 second'
where id='00000000-0000-4000-8000-000000000213';

set local role authenticated;
do $$
declare
  timer uuid := '00000000-0000-4000-8000-000000000213';
  other_timer uuid := '00000000-0000-4000-8000-000000000214';
  snapshot jsonb;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000211',true);
  snapshot := public.focus_timer('read');
  if not snapshot @> '{"active":null,"today_minutes":1,"week_minutes":1,"history":[{"label":"Subnetting","duration_minutes":1}]}'
    or jsonb_array_length(public.focus_timer('read')->'history') <> 1
  then raise exception 'Completed session did not persist exactly once'; end if;
  perform public.focus_timer('start',other_timer,'break',1);
  if public.focus_timer('reset',other_timer)->'active' <> 'null'::jsonb then
    raise exception 'Reset did not clear the timer';
  end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000212',true);
  if exists (select 1 from public.focus_sessions where id=timer)
    or public.focus_timer('read')->'history' <> '[]'::jsonb
  then raise exception 'Other student can see focus history'; end if;
end $$;
rollback;
