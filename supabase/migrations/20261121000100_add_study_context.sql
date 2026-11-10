create function public.study_context()
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
        select c.name as course, l.lesson_date as date, l.starts_at as start, l.ends_at as "end"
        from public.enrollments e
        join public.timetable_lessons l on l.offering_id = e.course_offering_id
        join public.course_offerings o on o.id = l.offering_id
        join public.courses c on c.id = o.course_id
        where e.student_id = caller and l.lesson_date between today and through_date
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

revoke execute on function public.study_context() from public, anon, authenticated;
grant execute on function public.study_context() to authenticated;
