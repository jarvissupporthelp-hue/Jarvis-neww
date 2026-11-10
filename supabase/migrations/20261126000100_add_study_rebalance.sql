-- Deferrable uniqueness allows a single UPDATE to move a session into a slot
-- that another session in the same update is vacating.
alter table public.study_sessions
  drop constraint study_sessions_plan_id_session_date_starts_at_key,
  add constraint study_sessions_plan_id_session_date_starts_at_key
    unique (plan_id, session_date, starts_at) deferrable initially immediate;

create function public.study_rebalance_inputs(p_plan_id uuid)
returns jsonb language plpgsql stable security invoker set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  local_now timestamp := now() at time zone 'Asia/Yerevan';
  inputs jsonb := public.study_schedule_inputs(p_plan_id);
begin
  if inputs is null then return null; end if;

  return inputs || jsonb_build_object('saved', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id, 'topicPosition', s.topic_position, 'title', s.title,
      'date', s.session_date, 'start', s.starts_at, 'end', s.ends_at,
      'movable', s.completed_at is null and not (
        s.session_date + s.starts_at <= local_now and s.session_date + s.ends_at > local_now
      )
    ) order by s.session_date, s.starts_at, s.id), '[]')
    from public.study_sessions s where s.plan_id = p_plan_id and s.student_id = caller
  ));
end;
$$;
revoke execute on function public.study_rebalance_inputs(uuid) from public, anon, authenticated;
grant execute on function public.study_rebalance_inputs(uuid) to authenticated;

create function jarvis_private.apply_study_rebalance(p_plan_id uuid, p_moves jsonb)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  plan public.study_plans%rowtype;
  local_now timestamp;
  expected integer;
  updated integer;
begin
  perform 1 from public.memberships
  where user_id = caller and role = 'student' and status = 'active' for share;
  if not found then raise insufficient_privilege using message = 'Active student membership required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(caller::text, 14));
  select * into plan from public.study_plans where id = p_plan_id and student_id = caller;
  if not found then raise no_data_found using message = 'Study plan not found'; end if;

  if jsonb_typeof(p_moves) is distinct from 'array' then raise invalid_parameter_value; end if;
  if jsonb_array_length(p_moves) not between 1 and 11 then raise invalid_parameter_value; end if;

  lock table public.enrollments, public.personal_events, public.timetable_lessons in share mode;
  local_now := clock_timestamp() at time zone 'Asia/Yerevan';

  select count(*) into expected from public.study_sessions s
  where s.plan_id = plan.id and s.student_id = caller and s.completed_at is null
    and not (s.session_date + s.starts_at <= local_now and s.session_date + s.ends_at > local_now);

  if expected <> jsonb_array_length(p_moves) then
    raise exclusion_violation using message = 'The plan changed. Generate a fresh rebalance preview.';
  end if;

  if exists (
    with moves as (
      select * from jsonb_to_recordset(p_moves) as m(
        id uuid, "oldDate" date, "oldStart" time, "oldEnd" time,
        date date, start time, "end" time
      )
    ), busy as (
      select * from jsonb_to_recordset(public.study_schedule_inputs(plan.id)->'busy')
        as b(date date, start time, "end" time)
    )
    select 1 from moves m
    left join public.study_sessions s on s.id = m.id and s.plan_id = plan.id and s.student_id = caller
    where s.id is null or s.completed_at is not null
      or (s.session_date + s.starts_at <= local_now and s.session_date + s.ends_at > local_now)
      or (s.session_date, s.starts_at, s.ends_at) is distinct from (m."oldDate", m."oldStart", m."oldEnd")
      or m.date is null or m.start is null or m."end" is null
      or m.date >= plan.exam_date or m.date + m.start <= local_now
      or not (extract(isodow from m.date)::smallint = any(plan.study_days))
      or m.start < plan.study_start or m."end" > plan.study_end
      or m."end" - m.start <> plan.session_minutes * interval '1 minute'
      or exists (select 1 from busy b where b.date = m.date and b.start < m."end" and b."end" > m.start)
      or exists (
        select 1 from public.study_sessions fixed
        where fixed.plan_id = plan.id and fixed.student_id = caller and fixed.session_date = m.date
          and not exists (select 1 from moves replacement where replacement.id = fixed.id)
          and fixed.session_date + fixed.starts_at < m.date + m."end" + interval '10 minutes'
          and fixed.session_date + fixed.ends_at > m.date + m.start - interval '10 minutes'
      )
      or exists (
        select 1 from moves other where other.id <> m.id and other.date = m.date
          and other.date + other.start < m.date + m."end" + interval '10 minutes'
          and other.date + other."end" > m.date + m.start - interval '10 minutes'
      )
  ) then raise exclusion_violation using message = 'Availability or progress changed. Generate a fresh rebalance preview.'; end if;

  update public.study_sessions s
  set session_date = m.date, starts_at = m.start, ends_at = m."end"
  from jsonb_to_recordset(p_moves) as m(id uuid, date date, start time, "end" time)
  where s.id = m.id and s.plan_id = plan.id and s.student_id = caller and s.completed_at is null;
  get diagnostics updated = row_count;
  if updated <> expected then
    raise exclusion_violation using message = 'The plan changed. Generate a fresh rebalance preview.';
  end if;
  return updated;
end;
$$;

revoke execute on function jarvis_private.apply_study_rebalance(uuid, jsonb) from public, anon, authenticated;
grant execute on function jarvis_private.apply_study_rebalance(uuid, jsonb) to authenticated;

create function public.apply_study_rebalance(p_plan_id uuid, p_moves jsonb)
returns integer language sql security invoker set search_path = ''
as $$ select jarvis_private.apply_study_rebalance(p_plan_id, p_moves); $$;

revoke execute on function public.apply_study_rebalance(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_study_rebalance(uuid, jsonb) to authenticated;
