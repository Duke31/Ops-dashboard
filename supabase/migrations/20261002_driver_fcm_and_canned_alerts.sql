-- ==============================================================================
-- Migration: Driver FCM Token, Duty Status, and Two-Way Canned Tactical Alerts
-- ==============================================================================

-- 1. Add fcm_token and duty state to public.drivers
alter table if exists public.drivers
  add column if not exists fcm_token text,
  add column if not exists duty_status text default 'on_duty',
  add column if not exists last_active_at timestamptz;

-- 2. Add tactical canned alert fields to emergency_requests
alter table if exists public.emergency_requests
  add column if not exists tactical_alert text,
  add column if not exists tactical_alert_code text,
  add column if not exists tactical_alert_at timestamptz,
  add column if not exists tactical_alert_ack boolean default false,
  add column if not exists dispatcher_response text,
  add column if not exists dispatcher_response_at timestamptz;

-- 3. RPC: Update Driver FCM Device Token (called on app startup / refresh)
create or replace function public.update_driver_fcm_token(
  p_driver_id uuid,
  p_fcm_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.drivers
  set
    fcm_token = p_fcm_token,
    last_active_at = now()
  where id = p_driver_id;
end;
$$;

grant execute on function public.update_driver_fcm_token(uuid, text) to authenticated, anon;

-- 4. RPC: Set Driver Duty Status (On Duty / Off Duty Quick Toggle)
create or replace function public.set_driver_duty_status(
  p_driver_id uuid,
  p_is_on_duty boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated record;
begin
  update public.drivers
  set
    active = p_is_on_duty,
    duty_status = case when p_is_on_duty then 'on_duty' else 'off_duty' end,
    last_active_at = now()
  where id = p_driver_id
  returning id, display_name, active, duty_status into v_updated;

  return row_to_json(v_updated);
end;
$$;

grant execute on function public.set_driver_duty_status(uuid, boolean) to authenticated, anon;

-- 5. RPC: Driver Sends 1-Tap Tactical Radio / Canned Alert
create or replace function public.send_driver_tactical_alert(
  p_request_id uuid,
  p_alert_code text,
  p_alert_message text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated record;
  v_existing_notes text;
begin
  select notes into v_existing_notes from public.emergency_requests where id = p_request_id;

  update public.emergency_requests
  set
    tactical_alert = p_alert_message,
    tactical_alert_code = p_alert_code,
    tactical_alert_at = now(),
    tactical_alert_ack = false,
    notes = concat_ws(E'\n', coalesce(v_existing_notes, ''), format('[TACTICAL ALERT %s]: %s', to_char(now(), 'HH24:MI'), p_alert_message))
  where id = p_request_id
  returning * into v_updated;

  return row_to_json(v_updated);
end;
$$;

grant execute on function public.send_driver_tactical_alert(uuid, text, text) to authenticated, anon;

-- 6. RPC: Dispatcher Acknowledges Tactical Alert & Sends Canned Radio Response
create or replace function public.ack_driver_tactical_alert(
  p_request_id uuid,
  p_response_message text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated record;
begin
  update public.emergency_requests
  set
    tactical_alert_ack = true,
    dispatcher_response = p_response_message,
    dispatcher_response_at = case when p_response_message is not null then now() else dispatcher_response_at end
  where id = p_request_id
  returning * into v_updated;

  return row_to_json(v_updated);
end;
$$;

grant execute on function public.ack_driver_tactical_alert(uuid, text) to authenticated, anon;
