create table public.professor_ai_profiles (
  offering_id uuid primary key references public.course_offerings(id) on delete cascade,
  teaching_style text not null default '' check (length(teaching_style) <= 2000),
  explanation_preferences text not null default '' check (length(explanation_preferences) <= 2000),
  assessment_style text not null default '' check (length(assessment_style) <= 2000),
  course_rules text not null default '' check (length(course_rules) <= 2000),
  updated_by uuid not null references public.memberships(user_id),
  updated_at timestamptz not null default now()
);

alter table public.professor_ai_profiles enable row level security;
revoke all on public.professor_ai_profiles from public, anon, authenticated;
grant select, insert, update on public.professor_ai_profiles to authenticated;

create policy enrolled_students_read_professor_ai_profiles
on public.professor_ai_profiles for select to authenticated
using (offering_id in (select course_offering_id from public.enrollments));

create policy assigned_lecturers_read_professor_ai_profiles
on public.professor_ai_profiles for select to authenticated
using (offering_id in (select course_offering_id from public.lecturer_assignments));

create policy assigned_lecturers_insert_professor_ai_profiles
on public.professor_ai_profiles for insert to authenticated
with check (
  updated_by = (select auth.uid())
  and exists (
    select 1 from public.lecturer_assignments a
    join public.memberships m on m.user_id = a.lecturer_id
    where a.lecturer_id = (select auth.uid())
      and a.course_offering_id = offering_id
      and m.role = 'lecturer' and m.status = 'active'
  )
);

create policy assigned_lecturers_update_professor_ai_profiles
on public.professor_ai_profiles for update to authenticated
using (exists (
  select 1 from public.lecturer_assignments a
  join public.memberships m on m.user_id = a.lecturer_id
  where a.lecturer_id = (select auth.uid())
    and a.course_offering_id = offering_id
    and m.role = 'lecturer' and m.status = 'active'
))
with check (
  updated_by = (select auth.uid())
  and exists (
    select 1 from public.lecturer_assignments a
    join public.memberships m on m.user_id = a.lecturer_id
    where a.lecturer_id = (select auth.uid())
      and a.course_offering_id = offering_id
      and m.role = 'lecturer' and m.status = 'active'
  )
);
