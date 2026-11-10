create table jarvis_private.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null,
  resource_id uuid not null,
  details jsonb not null,
  created_at timestamptz not null default now()
);

alter table jarvis_private.admin_audit enable row level security;
revoke all on jarvis_private.admin_audit from public, anon, authenticated;

create function jarvis_private.admin_workspace(p_action text, p_data jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  resource uuid := nullif(p_data->>'id', '')::uuid;
  target_role public.membership_role;
  offering uuid;
  label text := btrim(p_data->>'name');
  code_value text := upper(btrim(p_data->>'code'));
begin
  perform 1 from public.memberships
  where user_id = actor and role = 'admin' and status = 'active'
  for share;
  if not found then raise insufficient_privilege using message = 'Active admin required'; end if;

  if p_action = 'list' then
    return jsonb_build_object(
      'users', (select coalesce(jsonb_agg(to_jsonb(u) order by u.display_name), '[]') from (
        select m.user_id as id, p.display_name, a.email, m.role, m.status, m.student_group_id
        from public.memberships m join public.profiles p on p.id = m.user_id
        join auth.users a on a.id = m.user_id
      ) u),
      'groups', (select coalesce(jsonb_agg(g order by g.name), '[]') from public.student_groups g),
      'programs', (select coalesce(jsonb_agg(p order by p.name), '[]') from public.programs p),
      'semesters', (select coalesce(jsonb_agg(s order by s.starts_on desc), '[]') from public.semesters s),
      'courses', (select coalesce(jsonb_agg(c order by c.name), '[]') from public.courses c),
      'offerings', (select coalesce(jsonb_agg(o order by o.label), '[]') from (
        select o.id, c.name || ' / ' || g.code || ' / ' || s.code as label
        from public.course_offerings o join public.courses c on c.id = o.course_id
        join public.student_groups g on g.id = o.student_group_id
        join public.semesters s on s.id = o.semester_id
      ) o),
      'assignments', (select coalesce(jsonb_agg(a), '[]') from (
        select student_id as user_id, course_offering_id as offering_id from public.enrollments
        union all
        select lecturer_id, course_offering_id from public.lecturer_assignments
      ) a),
      'audit', (select coalesce(jsonb_agg(a order by a.created_at desc), '[]') from (
        select id, actor_id, action, resource_id, created_at
        from jarvis_private.admin_audit order by created_at desc limit 30
      ) a)
    );
  end if;

  if p_action in ('group', 'semester', 'course') and (
    label is null or length(label) not between 1 and 120 or
    code_value is null or code_value !~ '^[A-Z0-9][A-Z0-9_-]{0,31}$'
  ) then raise invalid_parameter_value using message = 'Invalid name or code'; end if;

  case p_action
    when 'user_status' then
      update public.memberships set status = (p_data->>'status')::public.membership_status
      where user_id = resource and role in ('student', 'lecturer')
        and status in ('active', 'disabled') and p_data->>'status' in ('active', 'disabled');
    when 'user_group' then
      update public.memberships set student_group_id = (p_data->>'groupId')::uuid
      where user_id = resource and role = 'student';
    when 'group' then
      if resource is null then
        insert into public.student_groups (name, code, program_id, academic_year)
        values (label, code_value, (p_data->>'programId')::uuid, (p_data->>'year')::smallint)
        returning id into resource;
      else
        update public.student_groups set name = label, code = code_value,
          program_id = (p_data->>'programId')::uuid, academic_year = (p_data->>'year')::smallint
        where id = resource;
      end if;
    when 'semester' then
      if resource is null then
        insert into public.semesters (name, code, starts_on, ends_on)
        values (label, code_value, (p_data->>'start')::date, (p_data->>'end')::date)
        returning id into resource;
      else
        update public.semesters set name = label, code = code_value,
          starts_on = (p_data->>'start')::date, ends_on = (p_data->>'end')::date
        where id = resource;
      end if;
    when 'course' then
      if resource is null then
        insert into public.courses (name, code) values (label, code_value) returning id into resource;
      else
        update public.courses set name = label, code = code_value where id = resource;
      end if;
    when 'offering' then
      insert into public.course_offerings (course_id, semester_id, student_group_id)
      values ((p_data->>'courseId')::uuid, (p_data->>'semesterId')::uuid, (p_data->>'groupId')::uuid)
      returning id into resource;
    when 'assign', 'unassign' then
      offering := (p_data->>'offeringId')::uuid;
      select role into target_role from public.memberships
      where user_id = resource and role in ('student', 'lecturer')
        and (status = 'active' or p_action = 'unassign') for update;
      if not found then raise invalid_parameter_value using message = 'Invalid assignment user'; end if;
      if target_role = 'student' then
        if p_action = 'assign' then
          insert into public.enrollments values (resource, offering);
        else
          delete from public.enrollments where student_id = resource and course_offering_id = offering;
        end if;
      else
        if p_action = 'assign' then
          insert into public.lecturer_assignments values (resource, offering);
        else
          delete from public.lecturer_assignments where lecturer_id = resource and course_offering_id = offering;
        end if;
      end if;
    else raise invalid_parameter_value using message = 'Unknown admin action';
  end case;

  if not found then raise no_data_found using message = 'No matching record'; end if;

  insert into jarvis_private.admin_audit (actor_id, action, resource_id, details)
  values (actor, p_action, resource, jsonb_strip_nulls(jsonb_build_object(
    'status', p_data->>'status', 'groupId', p_data->>'groupId', 'offeringId', offering
  )));
  return jsonb_build_object('id', resource);
end;
$$;

revoke execute on function jarvis_private.admin_workspace(text, jsonb) from public, anon, authenticated;
grant execute on function jarvis_private.admin_workspace(text, jsonb) to authenticated;

create function public.admin_workspace(p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = ''
as $$ select jarvis_private.admin_workspace(p_action, p_data); $$;

revoke execute on function public.admin_workspace(text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_workspace(text, jsonb) to authenticated;
