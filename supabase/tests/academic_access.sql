-- Run on a disposable database or staging after seeding. All fixtures roll back.
begin;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000000031'),
  ('00000000-0000-4000-8000-000000000032'),
  ('00000000-0000-4000-8000-000000000033'),
  ('00000000-0000-4000-8000-000000000034'),
  ('00000000-0000-4000-8000-000000000035');

insert into public.profiles (id, display_name)
select id, 'Day 3 test' from auth.users
where id::text between '00000000-0000-4000-8000-000000000031' and '00000000-0000-4000-8000-000000000035';

insert into public.memberships (user_id, role, status, student_group_id)
select fixture.user_id::uuid, fixture.role::public.membership_role,
  fixture.status::public.membership_status,
  case when fixture.role = 'student' then student_group.id end
from (values
  ('00000000-0000-4000-8000-000000000031', 'student', 'active'),
  ('00000000-0000-4000-8000-000000000032', 'student', 'active'),
  ('00000000-0000-4000-8000-000000000033', 'lecturer', 'active'),
  ('00000000-0000-4000-8000-000000000034', 'student', 'disabled'),
  ('00000000-0000-4000-8000-000000000035', 'admin', 'active')
) as fixture(user_id, role, status)
cross join public.student_groups as student_group
where student_group.code = 'DEMO-IMA-Y2';

insert into public.enrollments (student_id, course_offering_id)
select assignment.user_id::uuid, offering.id
from (values
  ('00000000-0000-4000-8000-000000000031', 'DEMO-NET'),
  ('00000000-0000-4000-8000-000000000032', 'DEMO-DB'),
  ('00000000-0000-4000-8000-000000000034', 'DEMO-NET')
) as assignment(user_id, course_code)
join public.courses as course on course.code = assignment.course_code
join public.course_offerings as offering on offering.course_id = course.id
join public.student_groups as student_group on student_group.id = offering.student_group_id
where student_group.code = 'DEMO-IMA-Y2';

insert into public.lecturer_assignments (lecturer_id, course_offering_id)
select '00000000-0000-4000-8000-000000000033', id
from public.enrollments as enrollment
join public.course_offerings as offering on offering.id = enrollment.course_offering_id
where enrollment.student_id = '00000000-0000-4000-8000-000000000031';

set local role authenticated;
do $$
declare
  fixture record;
  visible_codes text[];
begin
  for fixture in
    select * from (values
      ('00000000-0000-4000-8000-000000000031', array['DEMO-NET'], 1),
      ('00000000-0000-4000-8000-000000000032', array['DEMO-DB'], 1),
      ('00000000-0000-4000-8000-000000000033', array['DEMO-NET'], 1),
      ('00000000-0000-4000-8000-000000000034', array[]::text[], 0),
      ('00000000-0000-4000-8000-000000000035', array['DEMO-DB', 'DEMO-NET'], 1)
    ) as expected(user_id, codes, self_count)
  loop
    perform set_config('request.jwt.claim.sub', fixture.user_id, true);
    select coalesce(array_agg(code order by code), array[]::text[])
    into visible_codes from public.courses where code in ('DEMO-NET', 'DEMO-DB');
    if visible_codes <> fixture.codes
      or (select count(*) from public.profiles) <> fixture.self_count
      or (select count(*) from public.memberships) <> fixture.self_count then
      raise exception 'Unexpected visibility for fixture %', fixture.user_id;
    end if;
  end loop;

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000031', true);
  begin
    update public.memberships set role = 'admin', student_group_id = null where user_id = auth.uid();
    raise exception 'Authenticated caller can write memberships';
  exception when insufficient_privilege then null;
  end;
end
$$;

set local role anon;
do $$
begin
  begin
    perform 1 from public.courses;
    raise exception 'Anonymous caller can read courses';
  exception when insufficient_privilege then null;
  end;
end
$$;

rollback;
