begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000051', 'day5-admin@example.test'),
  ('00000000-0000-4000-8000-000000000052', 'day5-student@example.test'),
  ('00000000-0000-4000-8000-000000000053', 'day5-lecturer@example.test');
insert into public.profiles (id, display_name) values
  ('00000000-0000-4000-8000-000000000051', 'Test Admin'),
  ('00000000-0000-4000-8000-000000000052', 'Test Student'),
  ('00000000-0000-4000-8000-000000000053', 'Test Lecturer');
insert into public.memberships (user_id, role, status, student_group_id) values
  ('00000000-0000-4000-8000-000000000051', 'admin', 'active', null),
  ('00000000-0000-4000-8000-000000000052', 'student', 'active', (select id from public.student_groups where code = 'DEMO-IMA-Y2')),
  ('00000000-0000-4000-8000-000000000053', 'lecturer', 'active', null);

set local role authenticated;
do $$
declare
  workspace jsonb;
  offering_id text;
  course_id text;
  group_id text;
  semester_id text;
  program_id text;
  student_id text := '00000000-0000-4000-8000-000000000052';
  lecturer_id text := '00000000-0000-4000-8000-000000000053';
begin
  perform set_config('request.jwt.claim.sub', student_id, true);
  begin
    perform public.admin_workspace('list');
    raise exception 'Student read the admin workspace';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000051', true);
  workspace := public.admin_workspace('list');
  select item->>'id' into program_id from jsonb_array_elements(workspace->'programs') item where item->>'code' = 'DEMO-IMA';
  group_id := public.admin_workspace('group', jsonb_build_object(
    'name','Test Group','code','TEST-DAY5-GROUP','programId',program_id,'year',2))->>'id';
  semester_id := public.admin_workspace('semester', '{"name":"Test Term","code":"TEST-DAY5-TERM","start":"2026-09-01","end":"2027-01-31"}')->>'id';
  course_id := public.admin_workspace('course', '{"name":"Test Course","code":"TEST-DAY5-COURSE"}')->>'id';
  perform public.admin_workspace('course', jsonb_build_object('id',course_id,'name','Updated Course','code','TEST-DAY5-COURSE'));
  offering_id := public.admin_workspace('offering', jsonb_build_object(
    'courseId',course_id,'semesterId',semester_id,'groupId',group_id))->>'id';
  perform public.admin_workspace('user_group', jsonb_build_object('id',student_id,'groupId',group_id));
  perform public.admin_workspace('assign', jsonb_build_object('id',student_id,'offeringId',offering_id));
  perform public.admin_workspace('assign', jsonb_build_object('id',lecturer_id,'offeringId',offering_id));
  perform public.admin_workspace('user_status', jsonb_build_object('id',student_id,'status','disabled'));

  perform set_config('request.jwt.claim.sub', student_id, true);
  if exists (select 1 from public.course_offerings where id = offering_id::uuid) then
    raise exception 'Disabled user still sees course offering';
  end if;

  perform set_config('request.jwt.claim.sub', lecturer_id, true);
  if not exists (select 1 from public.course_offerings where id = offering_id::uuid) then
    raise exception 'Assigned lecturer cannot see offering';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000051', true);
  perform public.admin_workspace('user_status', jsonb_build_object('id',student_id,'status','active'));
  perform public.admin_workspace('unassign', jsonb_build_object('id',lecturer_id,'offeringId',offering_id));
  workspace := public.admin_workspace('list');
  if (select count(*) from jsonb_array_elements(workspace->'audit') item
    where item->>'actor_id' = '00000000-0000-4000-8000-000000000051') <> 11 then
    raise exception 'Admin changes were not all audited';
  end if;
end
$$;

rollback;
