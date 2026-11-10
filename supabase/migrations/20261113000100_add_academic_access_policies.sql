grant select on public.memberships, public.profiles, public.enrollments,
  public.lecturer_assignments, public.course_offerings, public.courses,
  public.semesters, public.student_groups, public.programs, public.faculties
to authenticated;

-- Only active memberships are visible, even when an old access token is valid.
create policy own_active_membership on public.memberships for select to authenticated
using (user_id = (select auth.uid()) and status = 'active');

create policy own_active_profile on public.profiles for select to authenticated
using (id in (select user_id from public.memberships));

create policy own_student_enrollments on public.enrollments for select to authenticated
using (student_id in (select user_id from public.memberships where role = 'student'));

create policy own_lecturer_assignments on public.lecturer_assignments for select to authenticated
using (lecturer_id in (select user_id from public.memberships where role = 'lecturer'));

create policy visible_course_offerings on public.course_offerings for select to authenticated
using (
  (select exists (select 1 from public.memberships where role = 'admin'))
  or id in (select course_offering_id from public.enrollments)
  or id in (select course_offering_id from public.lecturer_assignments)
);

create policy visible_courses on public.courses for select to authenticated
using (
  (select exists (select 1 from public.memberships where role = 'admin'))
  or id in (select course_id from public.course_offerings)
);

create policy visible_semesters on public.semesters for select to authenticated
using (
  (select exists (select 1 from public.memberships where role = 'admin'))
  or id in (select semester_id from public.course_offerings)
);

create policy visible_student_groups on public.student_groups for select to authenticated
using (
  (select exists (select 1 from public.memberships where role = 'admin'))
  or id in (select student_group_id from public.memberships)
  or id in (select student_group_id from public.course_offerings)
);

create policy visible_programs on public.programs for select to authenticated
using (
  (select exists (select 1 from public.memberships where role = 'admin'))
  or id in (select program_id from public.student_groups)
);

create policy visible_faculties on public.faculties for select to authenticated
using (
  (select exists (select 1 from public.memberships where role = 'admin'))
  or id in (select faculty_id from public.programs)
);
