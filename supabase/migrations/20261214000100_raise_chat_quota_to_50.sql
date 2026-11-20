alter table jarvis_private.chat_daily_usage
  drop constraint chat_daily_usage_attempts_check,
  drop constraint chat_daily_usage_token_reported_attempts_check,
  add constraint chat_daily_usage_attempts_check check (attempts between 1 and 50),
  add constraint chat_daily_usage_token_reported_attempts_check check (token_reported_attempts between 0 and 50);

create or replace function jarvis_private.reserve_chat_attempt()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  today date := (now() at time zone 'UTC')::date;
begin
  perform 1 from public.memberships
  where user_id = caller and role = 'student' and status = 'active'
  for share;
  if not found then raise insufficient_privilege using message = 'Active student membership required'; end if;

  insert into jarvis_private.chat_daily_usage as usage (student_id, usage_day, attempts)
  values (caller, today, 1)
  on conflict (student_id, usage_day) do update
    set attempts = usage.attempts + 1
    where usage.attempts < 50;
  return found;
end;
$$;

create or replace function jarvis_private.get_chat_usage()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare caller uuid := auth.uid(); usage jarvis_private.chat_daily_usage;
begin
  perform 1 from public.memberships
    where user_id = caller and role = 'student' and status = 'active';
  if not found then raise insufficient_privilege; end if;
  select * into usage from jarvis_private.chat_daily_usage
    where student_id = caller and usage_day = (now() at time zone 'UTC')::date;
  return jsonb_build_object(
    'limit', 50, 'used', coalesce(usage.attempts, 0),
    'remaining', 50 - coalesce(usage.attempts, 0),
    'inputTokens', coalesce(usage.input_tokens, 0),
    'outputTokens', coalesce(usage.output_tokens, 0),
    'tokenReportedAttempts', coalesce(usage.token_reported_attempts, 0),
    'resetsAt', ((now() at time zone 'UTC')::date + 1)::text || 'T00:00:00Z'
  );
end;
$$;
create or replace function jarvis_private.record_chat_tokens(p_input integer, p_output integer)
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
        token_reported_attempts = least(token_reported_attempts + 1, 50)
    where student_id = caller and usage_day = (now() at time zone 'UTC')::date;
end;
$$;
