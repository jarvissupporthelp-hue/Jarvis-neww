create table public.course_assignments (
  id uuid primary key,
  offering_id uuid not null references public.course_offerings(id) on delete cascade,
  published_by uuid references public.profiles(id) on delete set null,
  title text not null check (length(btrim(title)) between 1 and 120),
  brief text not null check (length(btrim(brief)) between 1 and 4000),
  due_on date not null,
  due_at time(0) not null check (due_at < time '24:00'),
  published_at timestamptz not null default now()
);

create index course_assignments_offering_due_idx on public.course_assignments(offering_id, due_on, due_at, id);

alter table public.course_assignments enable row level security;
revoke all on public.course_assignments from public, anon, authenticated;
grant select on public.course_assignments to authenticated;

-- The existing enrollment and teaching-assignment policies already scope these
-- subqueries to the caller and require an active membership.
create policy assigned_course_reads on public.course_assignments for select to authenticated
using (
  offering_id in (select course_offering_id from public.enrollments)
  or offering_id in (select course_offering_id from public.lecturer_assignments)
);

create function jarvis_private.publish_course_assignment(
  p_id uuid, p_offering_id uuid, p_title text, p_brief text, p_due_on date, p_due_at time
)
returns public.course_assignments language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  result public.course_assignments;
begin
  perform 1 from public.memberships
  where user_id = caller and role = 'lecturer' and status = 'active' for share;
  if not found then raise insufficient_privilege using message = 'Active lecturer access required'; end if;

  perform 1 from public.lecturer_assignments
  where lecturer_id = caller and course_offering_id = p_offering_id for share;
  if not found then raise insufficient_privilege using message = 'Teaching assignment required'; end if;

  -- A retry with the same request ID returns the original publication.
  select * into result from public.course_assignments where id = p_id;
  if not found then
    if p_due_on is null or p_due_at is null or p_due_on + p_due_at <= (clock_timestamp() at time zone 'Asia/Yerevan') then
      raise invalid_parameter_value using message = 'Choose a future deadline in Yerevan time';
    end if;

    insert into public.course_assignments(id, offering_id, published_by, title, brief, due_on, due_at)
    values (p_id, p_offering_id, caller, btrim(p_title), btrim(p_brief), p_due_on, p_due_at)
    on conflict (id) do nothing returning * into result;

    if not found then
      select * into result from public.course_assignments where id = p_id;
    end if;
  end if;
  if result.published_by is distinct from caller or result.offering_id is distinct from p_offering_id then
    raise insufficient_privilege using message = 'Publication identifier unavailable';
  end if;
  if (result.title, result.brief, result.due_on, result.due_at)
      is distinct from (btrim(p_title), btrim(p_brief), p_due_on, p_due_at) then
    raise unique_violation using message = 'This publication was already saved with different details';
  end if;
  return result;
end;
$$;

revoke execute on function jarvis_private.publish_course_assignment(uuid, uuid, text, text, date, time) from public, anon, authenticated;
grant execute on function jarvis_private.publish_course_assignment(uuid, uuid, text, text, date, time) to authenticated;

create function public.publish_course_assignment(
  p_id uuid, p_offering_id uuid, p_title text, p_brief text, p_due_on date, p_due_at time
)
returns public.course_assignments language sql security invoker set search_path = ''
as $$ select jarvis_private.publish_course_assignment(p_id, p_offering_id, p_title, p_brief, p_due_on, p_due_at); $$;

revoke execute on function public.publish_course_assignment(uuid, uuid, text, text, date, time) from public, anon, authenticated;
grant execute on function public.publish_course_assignment(uuid, uuid, text, text, date, time) to authenticated;
