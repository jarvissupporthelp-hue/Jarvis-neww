-- PostgREST runs this before table access and RPC calls, including security-definer RPCs.
create or replace function public.require_admin_mfa()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is not null and coalesce(auth.jwt()->>'aal', '') <> 'aal2'
    and exists (select 1 from public.memberships where user_id = auth.uid() and role = 'admin' and status = 'active')
  then
    raise sqlstate 'PT403' using message = 'JARVIS_ADMIN_MFA_REQUIRED';
  end if;
end;
$$;
revoke all on function public.require_admin_mfa() from public;
grant execute on function public.require_admin_mfa() to anon, authenticated, service_role;
alter role authenticator set pgrst.db_pre_request = 'public.require_admin_mfa';
notify pgrst, 'reload config';
