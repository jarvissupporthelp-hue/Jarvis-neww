-- Synthetic data for local development and staging only.
insert into public.faculties (code, name)
values ('DEMO-IKM', 'Demo Faculty of Informatics and Applied Mathematics')
on conflict (code) do nothing;

insert into public.programs (faculty_id, code, name)
select id, 'DEMO-IMA', 'Demo Informatics and Applied Mathematics'
from public.faculties where code = 'DEMO-IKM'
on conflict (code) do nothing;

insert into public.student_groups (program_id, academic_year, code, name)
select id, 2, 'DEMO-IMA-Y2', 'Demo UFAR IMA Year 2'
from public.programs where code = 'DEMO-IMA'
on conflict (code) do nothing;

insert into public.semesters (code, name, starts_on, ends_on)
values ('DEMO-2026-FALL', 'Demo Fall 2026', '2026-09-01', '2027-01-31')
on conflict (code) do nothing;

insert into public.courses (code, name)
values ('DEMO-NET', 'Demo Computer Networks'), ('DEMO-DB', 'Demo Databases')
on conflict (code) do nothing;

insert into public.course_offerings (course_id, semester_id, student_group_id)
select course.id, semester.id, student_group.id
from public.courses as course
cross join public.semesters as semester
cross join public.student_groups as student_group
where course.code in ('DEMO-NET', 'DEMO-DB')
  and semester.code = 'DEMO-2026-FALL'
  and student_group.code = 'DEMO-IMA-Y2'
on conflict (course_id, semester_id, student_group_id) do nothing;
