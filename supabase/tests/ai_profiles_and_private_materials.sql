-- Role matrix for AI teaching profiles, private lecturer notes and student AI preferences.
-- Run on a disposable database or staging after seeding. All fixtures roll back.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000201', 'ai-lecturer@example.test'),
  ('00000000-0000-4000-8000-000000000202', 'ai-other-lecturer@example.test'),
  ('00000000-0000-4000-8000-000000000203', 'ai-enrolled@example.test'),
  ('00000000-0000-4000-8000-000000000204', 'ai-other-student@example.test'),
  ('00000000-0000-4000-8000-000000000205', 'ai-admin@example.test'),
  ('00000000-0000-4000-8000-000000000206', 'ai-disabled@example.test');
insert into public.profiles (id, display_name)
select id, 'AI fixture' from auth.users where id::text between '00000000-0000-4000-8000-000000000201' and '00000000-0000-4000-8000-000000000206';
insert into public.memberships (user_id, role, status, student_group_id)
select f.id::uuid, f.role::public.membership_role, f.status::public.membership_status,
  case when f.role = 'student' then g.id end
from (values
  ('00000000-0000-4000-8000-000000000201', 'lecturer', 'active'),
  ('00000000-0000-4000-8000-000000000202', 'lecturer', 'active'),
  ('00000000-0000-4000-8000-000000000203', 'student', 'active'),
  ('00000000-0000-4000-8000-000000000204', 'student', 'active'),
  ('00000000-0000-4000-8000-000000000205', 'admin', 'active'),
  ('00000000-0000-4000-8000-000000000206', 'student', 'disabled')
) as f(id, role, status)
cross join public.student_groups g where g.code = 'DEMO-IMA-Y2';

select set_config('test.net', o.id::text, true) from public.course_offerings o
  join public.courses c on c.id = o.course_id join public.student_groups g on g.id = o.student_group_id
  join public.semesters s on s.id = o.semester_id
  where c.code = 'DEMO-NET' and g.code = 'DEMO-IMA-Y2' and s.code = 'DEMO-2026-FALL';
select set_config('test.db', o.id::text, true) from public.course_offerings o
  join public.courses c on c.id = o.course_id join public.student_groups g on g.id = o.student_group_id
  join public.semesters s on s.id = o.semester_id
  where c.code = 'DEMO-DB' and g.code = 'DEMO-IMA-Y2' and s.code = 'DEMO-2026-FALL';

insert into public.lecturer_assignments values
  ('00000000-0000-4000-8000-000000000201', current_setting('test.net')::uuid),
  ('00000000-0000-4000-8000-000000000202', current_setting('test.db')::uuid);
insert into public.enrollments values
  ('00000000-0000-4000-8000-000000000203', current_setting('test.net')::uuid),
  ('00000000-0000-4000-8000-000000000204', current_setting('test.db')::uuid),
  ('00000000-0000-4000-8000-000000000206', current_setting('test.net')::uuid);

set local role authenticated;
do $$
declare
  net uuid := current_setting('test.net')::uuid;
  db uuid := current_setting('test.db')::uuid;
  note uuid;
  n int;
begin
  -- Assigned lecturer writes the student-visible teaching profile and a private note.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000201', true);
  insert into public.professor_ai_profiles (offering_id, teaching_style, updated_by)
    values (net, 'Intuition first', '00000000-0000-4000-8000-000000000201');
  update public.professor_ai_profiles set course_rules = 'Show every step' where offering_id = net;
  begin
    insert into public.professor_ai_profiles (offering_id, updated_by)
      values (db, '00000000-0000-4000-8000-000000000201');
    raise exception 'Lecturer wrote a profile for a course they do not teach';
  exception when insufficient_privilege then null;
  end;
  insert into public.lecturer_ai_notes (offering_id, title, content) values (net, 'Exam draft', 'Confidential question bank')
    returning id into note;
  perform set_config('test.note', note::text, true);

  -- Unassigned lecturer: no private note, no profile edits.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000202', true);
  if exists (select 1 from public.lecturer_ai_notes) then raise exception 'Other lecturer sees private notes'; end if;
  update public.professor_ai_profiles set teaching_style = 'Hijacked' where offering_id = net;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Other lecturer edited a profile'; end if;
  begin
    insert into public.lecturer_ai_notes (offering_id, title, content) values (net, 'x', 'y');
    raise exception 'Other lecturer wrote a note for a course they do not teach';
  exception when insufficient_privilege then null;
  end;

  -- Enrolled student reads the profile but never private notes, and cannot edit either.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000203', true);
  if not exists (select 1 from public.professor_ai_profiles where offering_id = net and teaching_style = 'Intuition first')
  then raise exception 'Enrolled student cannot read the teaching profile'; end if;
  if exists (select 1 from public.lecturer_ai_notes) then raise exception 'Student sees private lecturer notes'; end if;
  update public.professor_ai_profiles set teaching_style = 'Student edit' where offering_id = net;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Student edited a teaching profile'; end if;
  delete from public.lecturer_ai_notes;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Student deleted a private note'; end if;

  -- Student of another course sees neither.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000204', true);
  if exists (select 1 from public.professor_ai_profiles where offering_id = net) then raise exception 'Unenrolled student reads a teaching profile'; end if;

  -- Admin has no policy on these tables, so sees nothing.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000205', true);
  if exists (select 1 from public.lecturer_ai_notes) or exists (select 1 from public.professor_ai_profiles where offering_id = net)
  then raise exception 'Admin unexpectedly reads lecturer AI data'; end if;

  -- Student AI preferences: own row only, active students only.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000203', true);
  insert into public.student_ai_preferences (learning_preferences, current_goal) values ('Examples first', 'Pass networks');
  if (select count(*) from public.student_ai_preferences) <> 1 then raise exception 'Student cannot read own preferences'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000204', true);
  if exists (select 1 from public.student_ai_preferences) then raise exception 'Student reads another student preferences'; end if;
  begin
    insert into public.student_ai_preferences (student_id, current_goal) values ('00000000-0000-4000-8000-000000000203', 'forged');
    raise exception 'Student wrote preferences for someone else';
  exception when insufficient_privilege or check_violation then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000201', true);
  if exists (select 1 from public.student_ai_preferences) then raise exception 'Lecturer reads student preferences'; end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000205', true);
  if exists (select 1 from public.student_ai_preferences) then raise exception 'Admin reads student preferences'; end if;

  -- Disabled student loses access to everything.
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000206', true);
  begin
    insert into public.student_ai_preferences (current_goal) values ('still here');
    raise exception 'Disabled student wrote preferences';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;

-- Anonymous callers cannot touch any of these tables.
reset role;
set local role anon;
do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  begin perform 1 from public.lecturer_ai_notes; raise exception 'anon read notes';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.professor_ai_profiles; raise exception 'anon read profiles';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.student_ai_preferences; raise exception 'anon read preferences';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
