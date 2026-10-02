-- Migration: Robust Driver Emergency Trigger & Tactical Alert Functions
-- Ensures 100% database compatibility even if tactical columns do not exist yet

-- 1. Helper function: trigger_driver_emergency_alert
create or replace function public.trigger_driver_emergency_alert(
  p_request_id uuid,
  p_alert_code text,
  p_alert_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notes text;
  v_time_str text;
  v_formatted text;
  v_res jsonb;
begin
  select notes into v_notes from public.emergency_requests where id = p_request_id;
  v_time_str := to_char(now() at time zone 'UTC', 'HH24:MI');
  v_formatted := format('[TACTICAL ALERT %s]: %s', v_time_str, p_alert_message);

  -- 1. Safe update to notes (guaranteed to succeed in 100% of schemas)
  update public.emergency_requests
  set notes = case 
    when notes is null or notes = '' then v_formatted 
    else notes || E'\n' || v_formatted 
  end
  where id = p_request_id;

  -- 2. Safe update to tactical columns if they exist
  begin
    update public.emergency_requests
    set
      tactical_alert = p_alert_message,
      tactical_alert_code = p_alert_code,
      tactical_alert_at = now(),
      tactical_alert_ack = false
    where id = p_request_id;
  exception when undefined_column then
    -- Table does not have tactical_alert column; notes update succeeded
    null;
  end;

  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'alert_code', p_alert_code,
    'alert_message', p_alert_message
  );
end;
$$;

revoke all on function public.trigger_driver_emergency_alert(uuid, text, text) from public;
grant execute on function public.trigger_driver_emergency_alert(uuid, text, text) to authenticated, anon;
grant execute on function public.trigger_driver_emergency_alert(uuid, text, text) to service_role;

-- 2. Helper function: ack_driver_tactical_alert
create or replace function public.ack_driver_tactical_alert(
  p_request_id uuid,
  p_response_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notes text;
  v_time_str text;
  v_formatted text;
begin
  select notes into v_notes from public.emergency_requests where id = p_request_id;
  v_time_str := to_char(now() at time zone 'UTC', 'HH24:MI');
  v_formatted := case
    when p_response_message is not null and p_response_message <> '' 
      then format('[DISPATCH ACK %s]: "%s"', v_time_str, p_response_message)
    else format('[DISPATCH ACK %s]: Acknowledged by Dispatch Desk', v_time_str)
  end;

  -- 1. Safe update to notes
  update public.emergency_requests
  set notes = case 
    when notes is null or notes = '' then v_formatted 
    else notes || E'\n' || v_formatted 
  end
  where id = p_request_id;

  -- 2. Safe update to tactical columns if they exist
  begin
    update public.emergency_requests
    set
      tactical_alert_ack = true,
      dispatcher_response = p_response_message,
      dispatcher_response_at = now()
    where id = p_request_id;
  exception when undefined_column then
    null;
  end;

  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'response', p_response_message
  );
end;
$$;

revoke all on function public.ack_driver_tactical_alert(uuid, text) from public;
grant execute on function public.ack_driver_tactical_alert(uuid, text) to authenticated, anon;
grant execute on function public.ack_driver_tactical_alert(uuid, text) to service_role;
