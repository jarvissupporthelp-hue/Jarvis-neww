alter table jarvis_private.chat_daily_usage
  add column input_tokens integer not null default 0 check (input_tokens >= 0),
  add column output_tokens integer not null default 0 check (output_tokens >= 0),
  add column token_reported_attempts smallint not null default 0 check (token_reported_attempts between 0 and 20);

create function jarvis_private.get_chat_usage()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare caller uuid := auth.uid(); usage jarvis_private.chat_daily_usage;
begin
  perform 1 from public.memberships
    where user_id = caller and role = 'student' and status = 'active';
  if not found then raise insufficient_privilege; end if;
  select * into usage from jarvis_private.chat_daily_usage
    where student_id = caller and usage_day = (now() at time zone 'UTC')::date;
  return jsonb_build_object(
    'limit', 20, 'used', coalesce(usage.attempts, 0),
    'remaining', 20 - coalesce(usage.attempts, 0),
    'inputTokens', coalesce(usage.input_tokens, 0),
    'outputTokens', coalesce(usage.output_tokens, 0),
    'tokenReportedAttempts', coalesce(usage.token_reported_attempts, 0),
    'resetsAt', ((now() at time zone 'UTC')::date + 1)::text || 'T00:00:00Z'
  );
end;
$$;
revoke execute on function jarvis_private.get_chat_usage() from public, anon, authenticated;
grant execute on function jarvis_private.get_chat_usage() to authenticated;
create function public.get_chat_usage()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jarvis_private.get_chat_usage();
$$;
revoke execute on function public.get_chat_usage() from public, anon, authenticated;
grant execute on function public.get_chat_usage() to authenticated;

create function jarvis_private.record_chat_tokens(p_input integer, p_output integer)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if p_input is null or p_output is null or p_input < 0 or p_output < 0
    or p_input > 1000000 or p_output > 1000000 then raise invalid_parameter_value; end if;
  perform 1 from public.memberships
    where user_id = caller and role = 'student' and status = 'active';
  if not found then raise insufficient_privilege; end if;
  update jarvis_private.chat_daily_usage
    set input_tokens = input_tokens + p_input,
        output_tokens = output_tokens + p_output,
        token_reported_attempts = least(token_reported_attempts + 1, 20)
    where student_id = caller and usage_day = (now() at time zone 'UTC')::date;
end;
$$;
revoke execute on function jarvis_private.record_chat_tokens(integer, integer) from public, anon, authenticated;
grant execute on function jarvis_private.record_chat_tokens(integer, integer) to authenticated;
create function public.record_chat_tokens(p_input integer, p_output integer)
returns void language sql security invoker set search_path = '' as $$
  select jarvis_private.record_chat_tokens(p_input, p_output);
$$;
revoke execute on function public.record_chat_tokens(integer, integer) from public, anon, authenticated;
grant execute on function public.record_chat_tokens(integer, integer) to authenticated;
