alter table public.study_sessions
  add column completed_at timestamptz,
  add column confidence_after smallint,
  add constraint study_session_confidence_valid check (
    confidence_after is null or (
      confidence_after between 1 and 5 and topic_position is not null and completed_at is not null
    )
  );

create function jarvis_private.complete_study_session(p_session_id uuid, p_confidence smallint)
returns timestamptz language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  session public.study_sessions%rowtype;
begin
  perform 1 from public.memberships
  where user_id = caller and role = 'student' and status = 'active' for share;
  if not found then raise insufficient_privilege using message = 'Active student membership required'; end if;

  -- Share the student-level lock with other study schedule mutations.
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 14));
  select * into session from public.study_sessions
  where id = p_session_id and student_id = caller for update;
  if not found then raise no_data_found using message = 'Study session not found'; end if;
  if session.completed_at is not null then return session.completed_at; end if;

  if p_confidence is not null and (p_confidence not between 1 and 5 or session.topic_position is null) then
    raise invalid_parameter_value using message = 'Choose a confidence rating between 1 and 5 for a topic session';
  end if;

  update public.study_sessions set completed_at = clock_timestamp(), confidence_after = p_confidence
  where id = session.id and student_id = caller returning completed_at into session.completed_at;

  if p_confidence is not null then
    update public.study_plan_topics t set confidence = p_confidence
    where t.plan_id = session.plan_id and t.position = session.topic_position
      and exists (select 1 from public.study_plans p where p.id = t.plan_id and p.student_id = caller);
  end if;

  return session.completed_at;
end;
$$;

revoke execute on function jarvis_private.complete_study_session(uuid, smallint) from public, anon, authenticated;
grant execute on function jarvis_private.complete_study_session(uuid, smallint) to authenticated;

create function public.complete_study_session(p_session_id uuid, p_confidence smallint default null)
returns timestamptz language sql security invoker set search_path = ''
as $$ select jarvis_private.complete_study_session(p_session_id, p_confidence); $$;

revoke execute on function public.complete_study_session(uuid, smallint) from public, anon, authenticated;
grant execute on function public.complete_study_session(uuid, smallint) to authenticated;

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

