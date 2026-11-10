create function public.study_schedule_inputs(p_plan_id uuid)
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
      ) b
    )
  );
end;
$$;

revoke execute on function public.study_schedule_inputs(uuid) from public, anon, authenticated;
grant execute on function public.study_schedule_inputs(uuid) to authenticated;
