create function public.student_dashboard()
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
      select l.id, l.lesson_date, l.starts_at, l.ends_at, l.room, c.name as course
      from public.timetable_lessons l join my_courses c on c.id = l.offering_id
      where l.lesson_date >= yerevan_now::date
    )
    select jsonb_build_object(
      'name', (select display_name from public.profiles where id = caller),
      'date', yerevan_now::date,
      'today', (select coalesce(jsonb_agg(l order by l.starts_at, l.id), '[]')
        from lessons l where l.lesson_date = yerevan_now::date),
      'next', (select to_jsonb(l) from lessons l
        where l.lesson_date + l.starts_at >= yerevan_now
        order by l.lesson_date, l.starts_at, l.id limit 1),
      'courses', (select coalesce(jsonb_agg(c order by c.name, c.id), '[]') from my_courses c)
    )
  );
end;
$$;

revoke execute on function public.student_dashboard() from public, anon, authenticated;
grant execute on function public.student_dashboard() to authenticated;
