create table public.timetable_lessons (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.course_offerings(id),
  lecturer_id uuid not null references public.memberships(user_id),
  lesson_date date not null,
  starts_at time(0) not null,
  ends_at time(0) not null,
  room text not null check (length(btrim(room)) between 1 and 80),
  check (starts_at < ends_at)
);

create index timetable_lessons_date_idx on public.timetable_lessons(lesson_date, starts_at);
create index timetable_lessons_offering_idx on public.timetable_lessons(offering_id);
create index timetable_lessons_lecturer_idx on public.timetable_lessons(lecturer_id);

alter table public.timetable_lessons enable row level security;
revoke all on public.timetable_lessons from public, anon, authenticated;
grant select on public.timetable_lessons to authenticated;

create policy visible_timetable_lessons on public.timetable_lessons for select to authenticated
using (
  exists (
    select 1 from public.memberships m where m.role = 'admin'
      or (m.role = 'lecturer' and m.user_id = lecturer_id and exists (
        select 1 from public.lecturer_assignments a where a.course_offering_id = offering_id
      ))
      or (m.role = 'student' and exists (
        select 1 from public.enrollments e where e.course_offering_id = offering_id
      ))
  )
);

create function jarvis_private.timetable(p_action text, p_data jsonb)
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
      from (
        select l.id, l.lesson_date, l.starts_at, l.ends_at, l.room,
          l.offering_id, l.lecturer_id, c.name as course, g.code as student_group, p.display_name as lecturer
        from public.timetable_lessons l
        join public.course_offerings o on o.id = l.offering_id
        join public.courses c on c.id = o.course_id
        join public.student_groups g on g.id = o.student_group_id
        join public.profiles p on p.id = l.lecturer_id
        where l.lesson_date >= week_start and l.lesson_date < week_start + 7
          and (
            actor_role = 'admin'
            or (actor_role = 'lecturer' and l.lecturer_id = actor and exists (
              select 1 from public.lecturer_assignments a
              where a.lecturer_id = actor and a.course_offering_id = l.offering_id
            ))
            or (actor_role = 'student' and exists (
              select 1 from public.enrollments e
              where e.student_id = actor and e.course_offering_id = l.offering_id
            ))
          )
      ) lesson
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

revoke execute on function jarvis_private.timetable(text, jsonb) from public, anon, authenticated;
grant execute on function jarvis_private.timetable(text, jsonb) to authenticated;

create function public.timetable(p_action text, p_data jsonb)
returns jsonb language sql security invoker set search_path = ''
as $$ select jarvis_private.timetable(p_action, p_data); $$;
revoke execute on function public.timetable(text, jsonb) from public, anon, authenticated;
grant execute on function public.timetable(text, jsonb) to authenticated;
