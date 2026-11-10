begin;
insert into auth.users (id,email) values
  ('00000000-0000-4000-8000-000000000101','day10-owner@example.test'),
  ('00000000-0000-4000-8000-000000000102','day10-other@example.test');
insert into public.profiles (id,display_name) values
  ('00000000-0000-4000-8000-000000000101','Chat owner'),
  ('00000000-0000-4000-8000-000000000102','Other student');
insert into public.memberships (user_id,role,status,student_group_id)
select p.id,'student','active',g.id from public.profiles p cross join public.student_groups g
where p.id in ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102')
and g.code='DEMO-IMA-Y2';

set local role authenticated;
do $$
declare
  thread_id uuid;
  empty_id uuid;
begin
  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
  insert into public.study_conversations (title) values ('Networking') returning id into thread_id;
  insert into public.study_conversations (title) values ('Databases') returning id into empty_id;
  insert into public.study_turns (conversation_id,prompt,answer)
  values (thread_id,'What is CIDR?','Classless Inter-Domain Routing.');
  update public.study_conversations set title='CIDR notes' where id=thread_id;
  if (select count(*) from public.study_turns where conversation_id=thread_id) <> 1
    or exists (select 1 from public.study_turns where conversation_id=empty_id) then
    raise exception 'Conversation history was not isolated';
  end if;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000102',true);
  if exists (select 1 from public.study_conversations where id=thread_id)
    or exists (select 1 from public.study_turns where conversation_id=thread_id) then
    raise exception 'Cross-student read succeeded';
  end if;
  update public.study_conversations set title='Unauthorized' where id=thread_id;
  if found then raise exception 'Cross-student rename succeeded'; end if;
  delete from public.study_conversations where id=thread_id;
  if found then raise exception 'Cross-student delete succeeded'; end if;
  begin
    insert into public.study_turns (conversation_id,prompt,answer) values (thread_id,'Injected','Injected');
    raise exception 'Cross-student turn insert succeeded';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000101',true);
  if not exists (select 1 from public.study_conversations where id=thread_id and title='CIDR notes') then
    raise exception 'Rename was not saved';
  end if;
  delete from public.study_conversations where id=thread_id;
  if not found then raise exception 'Owner delete failed'; end if;
  perform set_config('jarvis.test.deleted_thread',thread_id::text,true);
  insert into public.study_turns (conversation_id,prompt,answer)
  values (empty_id,'What is SQL?','Structured Query Language.');
  perform set_config('jarvis.test.disabled_thread',empty_id::text,true);
end
$$;

reset role;
do $$ begin
  if exists (select 1 from public.study_turns
    where conversation_id=current_setting('jarvis.test.deleted_thread')::uuid) then
    raise exception 'Deleting a conversation left orphaned turns';
  end if;
end $$;
update public.memberships set status='disabled' where user_id='00000000-0000-4000-8000-000000000101';
set local role authenticated;
do $$ begin
  if exists (select 1 from public.study_turns
    where conversation_id=current_setting('jarvis.test.disabled_thread')::uuid) then
    raise exception 'Disabled student read saved turns';
  end if;
  begin
    insert into public.study_turns (conversation_id,prompt,answer)
    values (current_setting('jarvis.test.disabled_thread')::uuid,'Denied','Denied');
    raise exception 'Disabled student wrote a turn';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
