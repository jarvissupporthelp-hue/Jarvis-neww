-- Promote the pilot IMA records in place so enrollments, offerings, and
-- invitations continue to reference the same IDs.
update public.faculties
set code = 'IMA', name = 'Faculty of Computer Science and Applied Mathematics (IMA)'
where code = 'DEMO-IKM';

update public.programs
set code = 'IMA', name = 'Faculty of Computer Science and Applied Mathematics (IMA)'
where code = 'DEMO-IMA'
  and faculty_id = (select id from public.faculties where code = 'IMA');

update public.student_groups
set code = 'IMA-Y2', name = 'Faculty of Computer Science and Applied Mathematics (IMA) — Year 2'
where code = 'DEMO-IMA-Y2' and academic_year = 2
  and program_id = (select id from public.programs where code = 'IMA');

insert into public.faculties (code, name) values
  ('LAW', 'Faculty of Law'),
  ('MGMT', 'Faculty of Management'),
  ('FIN', 'Faculty of Finance'),
  ('MKT', 'Faculty of Marketing'),
  ('IMA', 'Faculty of Computer Science and Applied Mathematics (IMA)')
on conflict (code) do nothing;

insert into public.programs (faculty_id, code, name)
select id, code, name from public.faculties
where code in ('LAW', 'MGMT', 'FIN', 'MKT', 'IMA')
on conflict (code) do nothing;

insert into public.student_groups (program_id, academic_year, code, name)
select p.id, y.year, p.code || '-Y' || y.year, f.name || ' — Year ' || y.year
from public.programs p
join public.faculties f on p.faculty_id = f.id and p.code = f.code
cross join generate_series(1, 4) as y(year)
where f.code in ('LAW', 'MGMT', 'FIN', 'MKT', 'IMA')
on conflict (code) do nothing;
