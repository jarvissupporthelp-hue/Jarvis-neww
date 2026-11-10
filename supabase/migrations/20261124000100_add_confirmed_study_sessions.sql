create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  student_id uuid not null references public.memberships(user_id) on delete cascade,
  topic_position smallint,
  title text not null,
  session_date date not null,
  starts_at time(0) not null,
  ends_at time(0) not null,
  check (starts_at < ends_at),
  unique (plan_id, session_date, starts_at),
  foreign key (plan_id, topic_position) references public.study_plan_topics(plan_id, position)
);

create index study_sessions_student_week_idx on public.study_sessions(student_id, session_date, starts_at);
alter table public.study_sessions enable row level security;
revoke all on public.study_sessions from public, anon, authenticated;
grant select on public.study_sessions to authenticated;

create policy read_own_study_sessions on public.study_sessions for select to authenticated
using (
  student_id = (select auth.uid())
  and exists (select 1 from public.memberships
    where user_id = (select auth.uid()) and role = 'student' and status = 'active')
);

create or replace function public.study_schedule_inputs(p_plan_id uuid)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  local_now timestamp := now() at time zone 'Asia/Yerevan';
  plan public.study_plans%rowtype;
begin
  if not exists (
    select 1 from public.memberships
    where user_id = caller and role = 'student' and status = 'active'
  ) then raise insufficient_privilege using message = 'Active student membership required'; end if;

  select * into plan from public.study_plans where id = p_plan_id and student_id = caller;
  if not found then return null; end if;

  return jsonb_build_object(
    'today', local_now::date,
    'currentTime', to_char(local_now, 'HH24:MI:SS.US'),
    'examDate', plan.exam_date,
    'minutes', plan.session_minutes,
    'start', plan.study_start,
    'end', plan.study_end,
    'studyDays', plan.study_days,
    'topics', (
      select coalesce(jsonb_agg(jsonb_build_object('position', t.position, 'name', t.name, 'confidence', t.confidence)
        order by t.position), '[]')
      from public.study_plan_topics t where t.plan_id = plan.id
    ),
    'busy', (
      select coalesce(jsonb_agg(b order by b.date, b.start), '[]')
      from (
        select l.lesson_date as date, l.starts_at as start, l.ends_at as "end"
        from public.timetable_lessons l
        join public.enrollments e on e.course_offering_id = l.offering_id
        where e.student_id = caller and l.lesson_date >= local_now::date and l.lesson_date < plan.exam_date
        union all
        select e.event_date, e.starts_at, e.ends_at
        from public.personal_events e
        where e.student_id = caller and e.event_date >= local_now::date and e.event_date < plan.exam_date
        union all
        select ss.session_date, ss.starts_at, ss.ends_at
        from public.study_sessions ss
        where ss.student_id = caller and ss.plan_id <> plan.id
          and ss.session_date >= local_now::date and ss.session_date < plan.exam_date
      ) b
    )
  );
end;
$$;

create function jarvis_private.confirm_study_schedule(p_plan_id uuid, p_sessions jsonb)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  plan public.study_plans%rowtype;
  item record;
  local_now timestamp;
  busy jsonb;
  topic_title text;
  seen_topics smallint[] := '{}';
  seen_review boolean := false;
  saved_count integer;
begin
  perform 1 from public.memberships
  where user_id = caller and role = 'student' and status = 'active' for share;
  if not found then raise insufficient_privilege using message = 'Active student membership required'; end if;

  -- Serialize confirmations across this student's plans.
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 14));
  select * into plan from public.study_plans where id = p_plan_id and student_id = caller;
  if not found then raise no_data_found using message = 'Study plan not found'; end if;

  select count(*) into saved_count from public.study_sessions where plan_id = plan.id;
  if saved_count > 0 then return saved_count; end if;

  if jsonb_typeof(p_sessions) is distinct from 'array' then raise invalid_parameter_value; end if;
  if jsonb_array_length(p_sessions) not between 1 and 11 then raise invalid_parameter_value; end if;

  -- Keep availability stable until the confirmation transaction commits.
  lock table public.enrollments, public.personal_events, public.timetable_lessons in share mode;
  local_now := clock_timestamp() at time zone 'Asia/Yerevan';
  busy := public.study_schedule_inputs(plan.id)->'busy';

  for item in
    select * from jsonb_to_recordset(p_sessions)
      as x("topicPosition" smallint, date date, start time(0), "end" time(0))
  loop
    if item.date is null or item.start is null or item."end" is null
      or item.date >= plan.exam_date or item.date + item.start < local_now
      or not (extract(isodow from item.date)::smallint = any(plan.study_days))
      or item.start < plan.study_start or item."end" > plan.study_end
      or item."end" - item.start <> plan.session_minutes * interval '1 minute' then
      raise exclusion_violation using message = 'This preview is no longer available. Generate a fresh preview.';
    end if;

    if exists (
      select 1 from jsonb_to_recordset(busy) as b(date date, start time, "end" time)
      where b.date = item.date and b.start < item."end" and b."end" > item.start
    ) or exists (
      select 1 from public.study_sessions s
      where s.plan_id = plan.id and s.session_date = item.date
        and (s.session_date + s.starts_at) < (item.date + item."end") + interval '10 minutes'
        and (s.session_date + s.ends_at) > (item.date + item.start) - interval '10 minutes'
    ) then
      raise exclusion_violation using message = 'Availability changed. Generate a fresh preview before confirming.';
    end if;

    if item."topicPosition" is null then
      if seen_review then raise invalid_parameter_value; end if;
      seen_review := true;
      topic_title := 'Mixed review';
    else
      if item."topicPosition" = any(seen_topics) then raise invalid_parameter_value; end if;
      select name into topic_title from public.study_plan_topics
      where plan_id = plan.id and position = item."topicPosition";
      if not found then raise invalid_parameter_value; end if;
      seen_topics := array_append(seen_topics, item."topicPosition");
    end if;

    insert into public.study_sessions (plan_id, student_id, topic_position, title, session_date, starts_at, ends_at)
    values (plan.id, caller, item."topicPosition", topic_title, item.date, item.start, item."end");
  end loop;

  return jsonb_array_length(p_sessions);
end;
$$;

revoke execute on function jarvis_private.confirm_study_schedule(uuid, jsonb) from public, anon, authenticated;
grant execute on function jarvis_private.confirm_study_schedule(uuid, jsonb) to authenticated;

create function public.confirm_study_schedule(p_plan_id uuid, p_sessions jsonb)
returns integer language sql security invoker set search_path = ''
as $$ select jarvis_private.confirm_study_schedule(p_plan_id, p_sessions); $$;

revoke execute on function public.confirm_study_schedule(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_study_schedule(uuid, jsonb) to authenticated;
