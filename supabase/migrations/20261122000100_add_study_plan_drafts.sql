create table public.study_plans (
  id uuid primary key,
  student_id uuid not null references public.memberships(user_id) on delete cascade,
  offering_id uuid not null references public.course_offerings(id),
  course_name text not null,
  exam_date date not null,
  target_outcome text not null check (length(btrim(target_outcome)) between 1 and 240),
  session_minutes smallint not null check (session_minutes between 15 and 180),
  study_start time(0) not null,
  study_end time(0) not null,
  study_days smallint[] not null check (cardinality(study_days) between 1 and 7 and study_days <@ array[1,2,3,4,5,6,7]::smallint[]),
  created_at timestamptz not null default now(),
  check (study_end > study_start and study_end - study_start >= session_minutes * interval '1 minute')
);

create table public.study_plan_topics (
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  position smallint not null check (position between 1 and 10),
  name text not null check (length(btrim(name)) between 1 and 120),
  confidence smallint not null check (confidence between 1 and 5),
  primary key (plan_id, position)
);

create index study_plans_student_idx on public.study_plans(student_id, created_at desc);
create index study_plans_offering_idx on public.study_plans(offering_id);

alter table public.study_plans enable row level security;
alter table public.study_plan_topics enable row level security;
revoke all on public.study_plans, public.study_plan_topics from public, anon, authenticated;
grant select on public.study_plans, public.study_plan_topics to authenticated;

create policy read_own_study_plans on public.study_plans for select to authenticated
using (
  student_id = (select auth.uid())
  and exists (select 1 from public.memberships
    where user_id = (select auth.uid()) and role = 'student' and status = 'active')
);

create policy read_own_study_plan_topics on public.study_plan_topics for select to authenticated
using (exists (
  select 1 from public.study_plans p join public.memberships m on m.user_id = p.student_id
  where p.id = plan_id and p.student_id = (select auth.uid())
    and m.role = 'student' and m.status = 'active'
));

create function jarvis_private.save_study_plan_draft(p_plan jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  plan uuid := (p_plan->>'id')::uuid;
  offering uuid := (p_plan->>'offeringId')::uuid;
  exam date := (p_plan->>'examDate')::date;
  course_label text;
  topics jsonb := p_plan->'topics';
  days smallint[];
begin
  perform 1 from public.memberships
  where user_id = caller and role = 'student' and status = 'active' for share;
  if not found then raise insufficient_privilege using message = 'Active student membership required'; end if;

  if exists (select 1 from public.study_plans where id = plan and student_id = caller) then
    return plan;
  end if;

  select c.name into course_label
  from public.enrollments e
  join public.course_offerings o on o.id = e.course_offering_id
  join public.courses c on c.id = o.course_id
  where e.student_id = caller and e.course_offering_id = offering
  for share of e;
  if not found then raise insufficient_privilege using message = 'Course enrollment required'; end if;

  if exam is null or exam < (now() at time zone 'Asia/Yerevan')::date
    or jsonb_typeof(topics) is distinct from 'array' then
    raise invalid_parameter_value using message = 'Enter an upcoming exam date and at least one topic';
  end if;
  if jsonb_array_length(topics) not between 1 and 10 then
    raise invalid_parameter_value using message = 'Enter between one and ten topics';
  end if;
  if jsonb_typeof(p_plan->'studyDays') is distinct from 'array' then
    raise invalid_parameter_value using message = 'Choose available study days';
  end if;

  select array_agg(distinct d.value::smallint order by d.value::smallint) into days
  from jsonb_array_elements_text(p_plan->'studyDays') d(value);

  insert into public.study_plans (
    id, student_id, offering_id, course_name, exam_date, target_outcome,
    session_minutes, study_start, study_end, study_days
  ) values (
    plan, caller, offering, course_label, exam, btrim(p_plan->>'target'),
    (p_plan->>'minutes')::smallint, (p_plan->>'start')::time(0), (p_plan->>'end')::time(0), days
  ) on conflict (id) do nothing;
  if not found then
    if exists (select 1 from public.study_plans where id = plan and student_id = caller) then
      return plan;
    end if;
    raise insufficient_privilege using message = 'Draft identifier unavailable';
  end if;

  insert into public.study_plan_topics (plan_id, position, name, confidence)
  select plan, t.position::smallint, btrim(t.topic->>'name'), (t.topic->>'confidence')::smallint
  from jsonb_array_elements(topics) with ordinality t(topic, position);
  return plan;
end;
$$;

revoke execute on function jarvis_private.save_study_plan_draft(jsonb) from public, anon, authenticated;
grant execute on function jarvis_private.save_study_plan_draft(jsonb) to authenticated;

create function public.save_study_plan_draft(p_plan jsonb)
returns uuid language sql security invoker set search_path = ''
as $$ select jarvis_private.save_study_plan_draft(p_plan); $$;

revoke execute on function public.save_study_plan_draft(jsonb) from public, anon, authenticated;
grant execute on function public.save_study_plan_draft(jsonb) to authenticated;
