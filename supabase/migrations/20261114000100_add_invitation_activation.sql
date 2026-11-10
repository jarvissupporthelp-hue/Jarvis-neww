create table public.account_invitations (
  email text primary key check (email = lower(btrim(email))),
  role public.membership_role not null,
  student_group_id uuid references public.student_groups(id),
  activated_at timestamptz,
  check ((role = 'student') = (student_group_id is not null))
);

alter table public.account_invitations enable row level security;
revoke all on public.account_invitations from public, anon, authenticated;
grant select, insert on public.account_invitations to service_role;

create function jarvis_private.activate_membership(p_display_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  invitation public.account_invitations%rowtype;
begin
  if caller_id is null or p_display_name is null
    or length(btrim(p_display_name)) not between 1 and 100 then
    return false;
  end if;

  select lower(email) into caller_email from auth.users
  where id = caller_id and email_confirmed_at is not null
    and invited_at is not null and nullif(encrypted_password, '') is not null;
  if caller_email is null then return false; end if;

  select * into invitation from public.account_invitations
  where email = caller_email and activated_at is null for update;
  if not found then
    return exists (select 1 from public.memberships where user_id = caller_id and status = 'active');
  end if;

  insert into public.profiles (id, display_name)
  values (caller_id, btrim(p_display_name)) on conflict (id) do nothing;

  insert into public.memberships (user_id, role, status, student_group_id)
  values (caller_id, invitation.role, 'active', invitation.student_group_id)
  on conflict (user_id) do nothing;
  if not found then return false; end if;

  update public.account_invitations set activated_at = now() where email = caller_email;
  return true;
end;
$$;

revoke execute on function jarvis_private.activate_membership(text) from public, anon, authenticated;
grant usage on schema jarvis_private to authenticated;
grant execute on function jarvis_private.activate_membership(text) to authenticated;

create function public.activate_membership(p_display_name text)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select jarvis_private.activate_membership(p_display_name);
$$;

revoke execute on function public.activate_membership(text) from public, anon, authenticated;
grant execute on function public.activate_membership(text) to authenticated;
