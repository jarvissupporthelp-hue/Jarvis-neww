-- Timetable visibility follows active group membership and teaching assignments.
-- Enrollment still controls access to course files and assignments.
create function jarvis_private.can_read_timetable_lesson(p_offering uuid, p_lecturer uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.status = 'active' and (
      m.role = 'admin'
      or (m.role = 'student' and exists (
        select 1 from public.course_offerings o where o.id = p_offering and o.student_group_id = m.student_group_id
      ))
      or (m.role = 'lecturer' and m.user_id = p_lecturer and exists (
        select 1 from public.lecturer_assignments a
        where a.lecturer_id = m.user_id and a.course_offering_id = p_offering
      ))
    )
  );
$$;

revoke execute on function jarvis_private.can_read_timetable_lesson(uuid,uuid) from public,anon,authenticated;
grant execute on function jarvis_private.can_read_timetable_lesson(uuid,uuid) to authenticated;

alter policy visible_timetable_lessons on public.timetable_lessons to authenticated
using (jarvis_private.can_read_timetable_lesson(offering_id,lecturer_id));

create function jarvis_private.visible_timetable(p_from date, p_until date)
returns table (
  id uuid, lesson_date date, starts_at time, ends_at time, room text,
  offering_id uuid, lecturer_id uuid, course text, student_group text, lecturer text
)
language sql stable security definer set search_path=''
as $$
  select l.id,l.lesson_date,l.starts_at,l.ends_at,l.room,l.offering_id,l.lecturer_id,
    c.name,g.code,p.display_name
  from public.timetable_lessons l
  join public.course_offerings o on o.id = l.offering_id
  join public.courses c on c.id = o.course_id
  join public.student_groups g on g.id = o.student_group_id
  join public.profiles p on p.id = l.lecturer_id
  where l.lesson_date >= p_from and (p_until is null or l.lesson_date < p_until)
    and jarvis_private.can_read_timetable_lesson(l.offering_id,l.lecturer_id);
$$;

revoke execute on function jarvis_private.visible_timetable(date,date) from public,anon,authenticated;
grant execute on function jarvis_private.visible_timetable(date,date) to authenticated;

create function jarvis_private.pending_account_invitations()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
  if not exists (select 1 from public.memberships
      where user_id=auth.uid() and role='admin' and status='active') then
    raise insufficient_privilege;
  end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(pending) order by pending.email),'[]'::jsonb)
    from (
      select i.email,i.role,i.student_group_id,g.name as group_name
      from public.account_invitations i
      left join public.student_groups g on g.id=i.student_group_id
      where i.activated_at is null
    ) pending
  );
end;
$$;

revoke execute on function jarvis_private.pending_account_invitations() from public,anon,authenticated;
grant execute on function jarvis_private.pending_account_invitations() to authenticated;

create function public.pending_account_invitations()
returns jsonb language sql stable security invoker set search_path=''
as $$ select jarvis_private.pending_account_invitations(); $$;

revoke execute on function public.pending_account_invitations() from public,anon,authenticated;
grant execute on function public.pending_account_invitations() to authenticated;


create or replace function jarvis_private.timetable(p_action text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_role public.membership_role;
  resource uuid;
  offering uuid;
  lecturer uuid;
  lesson_day date;
  start_time time(0);
  end_time time(0);
  room_name text;
  group_id uuid;
  semester_start date;
  semester_end date;
  week_start date;
begin
  select role into actor_role from public.memberships
  where user_id = actor and status = 'active' for share;
  if not found then raise insufficient_privilege using message = 'Active membership required'; end if;

  if p_action = 'list' then
    week_start := (p_data->>'week')::date;
    if week_start is null then raise invalid_parameter_value; end if;
    return (select coalesce(jsonb_agg(to_jsonb(lesson) order by lesson.lesson_date, lesson.starts_at, lesson.id), '[]')
      from jarvis_private.visible_timetable(week_start,week_start+7) lesson
    );
  end if;

  if actor_role <> 'admin' then raise insufficient_privilege using message = 'Active admin required'; end if;
  resource := nullif(p_data->>'id', '')::uuid;

  -- All timetable mutations take the same transaction lock, so conflict checks
  -- also cover simultaneous requests and edits that move between dates.
  perform pg_advisory_xact_lock(781421, 6);

  if p_action = 'remove' then
    delete from public.timetable_lessons where id = resource;
    if not found then raise no_data_found; end if;
  elsif p_action = 'save' then
    offering := (p_data->>'offeringId')::uuid;
    lecturer := (p_data->>'lecturerId')::uuid;
    lesson_day := (p_data->>'date')::date;
    start_time := (p_data->>'start')::time(0);
    end_time := (p_data->>'end')::time(0);
    room_name := regexp_replace(btrim(p_data->>'room'), '[[:space:]]+', ' ', 'g');

    if lesson_day is null or start_time is null or end_time is null or start_time >= end_time
      or room_name is null or length(room_name) not between 1 and 80 then
      raise invalid_parameter_value using message = 'Invalid lesson date, time or room';
    end if;

    select o.student_group_id, s.starts_on, s.ends_on into group_id, semester_start, semester_end
    from public.course_offerings o join public.semesters s on s.id = o.semester_id
    where o.id = offering;
    if not found or lesson_day not between semester_start and semester_end then
      raise invalid_parameter_value using message = 'Lesson must be inside the offering semester';
    end if;

    perform 1 from public.lecturer_assignments a join public.memberships m on m.user_id = a.lecturer_id
    where a.course_offering_id = offering and a.lecturer_id = lecturer
      and m.role = 'lecturer' and m.status = 'active' for share of a, m;
    if not found then raise invalid_parameter_value using message = 'Select an active lecturer assigned to this offering'; end if;

    if exists (
      select 1 from public.timetable_lessons l join public.course_offerings o on o.id = l.offering_id
      where l.lesson_date = lesson_day and l.id is distinct from resource
        and l.starts_at < end_time and start_time < l.ends_at
        and (lower(l.room) = lower(room_name) or l.lecturer_id = lecturer or o.student_group_id = group_id)
    ) then raise exclusion_violation using message = 'The room, lecturer, or student group already has a lesson at that time'; end if;

    if resource is null then
      insert into public.timetable_lessons (offering_id, lecturer_id, lesson_date, starts_at, ends_at, room)
      values (offering, lecturer, lesson_day, start_time, end_time, room_name) returning id into resource;
    else
      update public.timetable_lessons set offering_id = offering, lecturer_id = lecturer,
        lesson_date = lesson_day, starts_at = start_time, ends_at = end_time, room = room_name
      where id = resource;
      if not found then raise no_data_found; end if;
    end if;
  else
    raise invalid_parameter_value using message = 'Unknown timetable action';
  end if;

  insert into jarvis_private.admin_audit (actor_id, action, resource_id, details)
  values (actor, 'timetable_' || p_action, resource, jsonb_build_object('lessonDate', lesson_day));
  return jsonb_build_object('id', resource);
end;
$$;

create or replace function public.student_dashboard()
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  yerevan_now timestamp := now() at time zone 'Asia/Yerevan';
begin
  if not exists (
    select 1 from public.memberships
    where user_id = caller and role = 'student' and status = 'active'
  ) then
    raise insufficient_privilege using message = 'Active student membership required';
  end if;

  return (
    with my_courses as (
      select o.id, c.code, c.name, s.name as semester
      from public.enrollments e
      join public.course_offerings o on o.id = e.course_offering_id
      join public.courses c on c.id = o.course_id
      join public.semesters s on s.id = o.semester_id
      where e.student_id = caller
    ),
    lessons as (
      select l.id, l.lesson_date, l.starts_at, l.ends_at, l.room, l.course
      from jarvis_private.visible_timetable(yerevan_now::date,null) l
    )
    select jsonb_build_object(
      'name', (select display_name from public.profiles where id = caller),
      'date', yerevan_now::date,
      'today', (select coalesce(jsonb_agg(l order by l.starts_at, l.id), '[]')
        from lessons l where l.lesson_date = yerevan_now::date),
      'next', (select to_jsonb(l) from lessons l
        where l.lesson_date + l.starts_at >= yerevan_now
        order by l.lesson_date, l.starts_at, l.id limit 1),
      'courses', (select coalesce(jsonb_agg(c order by c.name, c.id), '[]') from my_courses c),
      'studyProgress', (
        select coalesce(jsonb_agg(progress order by progress.exam_date, progress.id), '[]')
        from (
          select p.id, p.course_name, p.exam_date,
            count(s.id) as scheduled, count(s.completed_at) as completed
          from public.study_plans p
          join public.study_sessions s on s.plan_id = p.id and s.student_id = caller
          where p.student_id = caller and p.exam_date >= yerevan_now::date
          group by p.id, p.course_name, p.exam_date
        ) progress
      )
    )
  );
end;
$$;

create or replace function public.study_context()
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  today date := (now() at time zone 'Asia/Yerevan')::date;
  through_date date := today + 13;
begin
  if not exists (
    select 1 from public.memberships
    where user_id = caller and role = 'student' and status = 'active'
  ) then raise insufficient_privilege using message = 'Active student membership required'; end if;

  return jsonb_build_object(
    'timeZone', 'Asia/Yerevan',
    'from', today,
    'through', through_date,
    'courses', (
      select coalesce(jsonb_agg(course order by course.code), '[]')
      from (
        select distinct c.code, c.name
        from public.enrollments e
        join public.course_offerings o on o.id = e.course_offering_id
        join public.courses c on c.id = o.course_id
        join public.semesters s on s.id = o.semester_id
        where e.student_id = caller and today between s.starts_on and s.ends_on
        order by c.code limit 20
      ) course
    ),
    'classes', (
      select coalesce(jsonb_agg(lesson order by lesson.date, lesson.start, lesson.course), '[]')
      from (
        select l.course, l.lesson_date as date, l.starts_at as start, l.ends_at as "end"
        from jarvis_private.visible_timetable(today,through_date+1) l
        order by l.lesson_date, l.starts_at, l.id limit 30
      ) lesson
    ),
    'busyTimes', (
      select coalesce(jsonb_agg(busy order by busy.date, busy.start, busy."end"), '[]')
      from (
        select e.event_date as date, e.starts_at as start, e.ends_at as "end"
        from public.personal_events e
        where e.student_id = caller and e.event_date between today and through_date
        order by e.event_date, e.starts_at, e.id limit 30
      ) busy
    ),
    'taskDueDates', (
      select coalesce(jsonb_agg(due order by due.date), '[]')
      from (
        select t.due_on as date, count(*) as count
        from public.personal_tasks t
        where t.student_id = caller and not t.completed and t.due_on between today and through_date
        group by t.due_on
      ) due
    ),
    'officialDeadlinesAvailable', false,
    'officialExamDatesAvailable', false
  );
end;
$$;

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
        from jarvis_private.visible_timetable(local_now::date,plan.exam_date) l
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
