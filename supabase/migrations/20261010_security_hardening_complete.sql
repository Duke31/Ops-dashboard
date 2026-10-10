-- ==============================================================================
-- SOLACE EMS — SECURITY HARDENING PATCH (Corrected Order)
-- File: supabase/migrations/20261010_security_hardening_complete.sql
--
-- FIXES: Restructured so all functions are CREATE OR REPLACE'd FIRST,
--        then all REVOKE/GRANT statements follow at the end.
--        This prevents "function does not exist" errors on REVOKE.
--
-- Run once in Supabase SQL Editor (project: aogknxtyvzpzqkgmgtsv)
-- Safe to re-run (CREATE OR REPLACE / IF EXISTS guards throughout)
-- ==============================================================================

-- ── 0. PREREQUISITES ──────────────────────────────────────────────────────────
alter table public.emergency_requests  enable row level security;
alter table public.drivers             enable row level security;
alter table public.hospitals           enable row level security;
alter table public.profiles            enable row level security;

-- ── 1. STRIP ANONYMOUS TABLE GRANTS ───────────────────────────────────────────
revoke all on public.emergency_requests from anon;
revoke all on public.drivers            from anon;
revoke all on public.hospitals          from anon;
revoke all on public.profiles           from anon;
revoke all on public.role_requests      from anon;

-- ── 2. DROP OPEN USING(TRUE) POLICIES ─────────────────────────────────────────
drop policy if exists "emergency_requests_read_all"    on public.emergency_requests;
drop policy if exists "hospitals_public_read"          on public.hospitals;
drop policy if exists "drivers_public_read_telemetry"  on public.drivers;

-- ── 3. AUTHENTICATED-SCOPED TABLE POLICIES ────────────────────────────────────

-- 3a. hospitals — authenticated read (no PHI in hospitals table)
drop policy if exists "hospitals_authenticated_read" on public.hospitals;
create policy "hospitals_authenticated_read"
  on public.hospitals for select to authenticated
  using (true);

-- 3b. drivers — authenticated read
drop policy if exists "drivers_authenticated_read" on public.drivers;
create policy "drivers_authenticated_read"
  on public.drivers for select to authenticated
  using (true);

-- 3c. emergency_requests — role-scoped read
--   admin/dispatcher → all rows
--   hospital         → only their hospital's cases
--   driver           → only their assigned cases
--   client           → only their own requests
drop policy if exists "emergency_requests_role_read" on public.emergency_requests;
create policy "emergency_requests_role_read"
  on public.emergency_requests for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and (
              p.role in ('admin', 'dispatcher')
           or (p.role = 'hospital'
               and emergency_requests.hospital_id = p.hospital_id)
           or (p.role = 'driver'
               and emergency_requests.driver_id = (
                     select d.id from public.drivers d
                     where d.user_id = auth.uid()
                     limit 1
                   ))
           or (p.role = 'client'
               and emergency_requests.client_user_id = auth.uid())
        )
    )
  );

-- 3d. profiles — self-read; admin reads all
drop policy if exists "profiles_self_read"  on public.profiles;
drop policy if exists "profiles_admin_read" on public.profiles;

create policy "profiles_self_read" on public.profiles
  for select to authenticated
  using (user_id = auth.uid());

create policy "profiles_admin_read" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p2
      where p2.user_id = auth.uid() and p2.role = 'admin'
    )
  );

-- ── 4. ROLE_REQUESTS HARDENING ────────────────────────────────────────────────
alter table if exists public.role_requests enable row level security;
revoke all on public.role_requests from anon;

drop policy if exists "role_requests_insert_self" on public.role_requests;
drop policy if exists "role_requests_self_select"  on public.role_requests;

create policy "role_requests_insert_self" on public.role_requests
  for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create policy "role_requests_self_select" on public.role_requests
  for select to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

grant select, insert on public.role_requests to authenticated;

-- ── 5. CREATE/REPLACE ALL HARDENED FUNCTIONS (must happen BEFORE any REVOKE) ──

-- 5a. update_driver_fcm_token — ownership guard
create or replace function public.update_driver_fcm_token(
  p_driver_id uuid,
  p_fcm_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'unauthenticated: auth session required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.drivers d
    where d.id = p_driver_id and d.user_id = v_uid
  ) then
    raise exception 'not_allowed: can only update your own FCM token'
      using errcode = '42501';
  end if;
  update public.drivers
  set fcm_token = p_fcm_token, last_active_at = now()
  where id = p_driver_id;
end;
$$;

-- 5b. set_driver_duty_status — role + ownership guard
create or replace function public.set_driver_duty_status(
  p_driver_id  uuid,
  p_is_on_duty boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_role    text := public.current_profile_role();
  v_updated record;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_role not in ('driver', 'admin') then
    raise exception 'not_allowed: driver or admin role required'
      using errcode = '42501';
  end if;
  if v_role = 'driver' and not exists (
    select 1 from public.drivers
    where id = p_driver_id and user_id = v_uid
  ) then
    raise exception 'not_allowed: can only change status of your own unit'
      using errcode = '42501';
  end if;
  update public.drivers
  set
    active         = p_is_on_duty,
    duty_status    = case when p_is_on_duty then 'on_duty' else 'off_duty' end,
    last_active_at = now()
  where id = p_driver_id
  returning id, display_name, active, duty_status into v_updated;
  if not found then
    raise exception 'driver_not_found: %', p_driver_id;
  end if;
  return row_to_json(v_updated);
end;
$$;

-- 5c. send_driver_tactical_alert — auth + ownership guard
create or replace function public.send_driver_tactical_alert(
  p_request_id    uuid,
  p_alert_code    text,
  p_alert_message text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_role           text := public.current_profile_role();
  v_updated        record;
  v_existing_notes text;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_role not in ('driver', 'dispatcher', 'admin') then
    raise exception 'not_allowed: driver, dispatcher, or admin required'
      using errcode = '42501';
  end if;
  if v_role = 'driver' and not exists (
    select 1 from public.emergency_requests er
    join public.drivers d on d.id = er.driver_id
    where er.id = p_request_id and d.user_id = v_uid
  ) then
    raise exception 'not_allowed: you are not assigned to this request'
      using errcode = '42501';
  end if;
  select notes into v_existing_notes
  from public.emergency_requests where id = p_request_id;
  update public.emergency_requests
  set
    tactical_alert      = p_alert_message,
    tactical_alert_code = p_alert_code,
    tactical_alert_at   = now(),
    tactical_alert_ack  = false,
    notes               = concat_ws(
                            E'\n',
                            coalesce(v_existing_notes, ''),
                            format('[TACTICAL ALERT %s]: %s',
                              to_char(now(), 'HH24:MI'), p_alert_message)
                          )
  where id = p_request_id
  returning * into v_updated;
  return row_to_json(v_updated);
end;
$$;

-- 5d. ack_driver_tactical_alert — dispatcher/admin only
create or replace function public.ack_driver_tactical_alert(
  p_request_id       uuid,
  p_response_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_role      text := public.current_profile_role();
  v_notes     text;
  v_time_str  text;
  v_formatted text;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_role not in ('dispatcher', 'admin') then
    raise exception 'not_allowed: dispatcher or admin role required'
      using errcode = '42501';
  end if;
  select notes into v_notes from public.emergency_requests where id = p_request_id;
  v_time_str  := to_char(now() at time zone 'UTC', 'HH24:MI');
  v_formatted := case
    when p_response_message is not null and p_response_message <> ''
      then format('[DISPATCH ACK %s]: "%s"', v_time_str, p_response_message)
    else format('[DISPATCH ACK %s]: Acknowledged by Dispatch Desk', v_time_str)
  end;
  update public.emergency_requests
  set
    notes                  = case
                               when notes is null or notes = '' then v_formatted
                               else notes || E'\n' || v_formatted
                             end,
    tactical_alert_ack     = true,
    dispatcher_response    = p_response_message,
    dispatcher_response_at = case
                               when p_response_message is not null then now()
                               else dispatcher_response_at
                             end
  where id = p_request_id;
  return jsonb_build_object(
    'success',    true,
    'request_id', p_request_id,
    'response',   p_response_message
  );
end;
$$;

-- 5e. trigger_driver_emergency_alert — auth + ownership guard
create or replace function public.trigger_driver_emergency_alert(
  p_request_id    uuid,
  p_alert_code    text,
  p_alert_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_role      text := public.current_profile_role();
  v_notes     text;
  v_time_str  text;
  v_formatted text;
begin
  if v_uid is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;
  if v_role not in ('driver', 'dispatcher', 'admin') then
    raise exception 'not_allowed: driver, dispatcher, or admin required'
      using errcode = '42501';
  end if;
  if v_role = 'driver' and not exists (
    select 1 from public.emergency_requests er
    join public.drivers d on d.id = er.driver_id
    where er.id = p_request_id and d.user_id = v_uid
  ) then
    raise exception 'not_allowed: you are not assigned to this request'
      using errcode = '42501';
  end if;
  select notes into v_notes from public.emergency_requests where id = p_request_id;
  v_time_str  := to_char(now() at time zone 'UTC', 'HH24:MI');
  v_formatted := format('[TACTICAL ALERT %s]: %s', v_time_str, p_alert_message);
  update public.emergency_requests
  set notes = case
    when notes is null or notes = '' then v_formatted
    else notes || E'\n' || v_formatted
  end
  where id = p_request_id;
  begin
    update public.emergency_requests
    set
      tactical_alert      = p_alert_message,
      tactical_alert_code = p_alert_code,
      tactical_alert_at   = now(),
      tactical_alert_ack  = false
    where id = p_request_id;
  exception when undefined_column then
    null;
  end;
  return jsonb_build_object(
    'success',       true,
    'request_id',    p_request_id,
    'alert_code',    p_alert_code,
    'alert_message', p_alert_message
  );
end;
$$;

-- 5f. client_get_request_detail — require auth + ownership check
create or replace function public.client_get_request_detail(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  h record;
  d record;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated: sign in required to view request details'
      using errcode = '42501';
  end if;
  select * into r from public.emergency_requests where id = p_request_id;
  if not found then return null; end if;
  if not exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (
            p.role in ('admin', 'dispatcher')
         or (p.role = 'client'   and r.client_user_id = auth.uid())
         or (p.role = 'hospital' and r.hospital_id    = p.hospital_id)
         or (p.role = 'driver'
             and r.driver_id = (
                   select d2.id from public.drivers d2
                   where d2.user_id = auth.uid() limit 1
                 ))
      )
  ) then
    raise exception 'not_allowed: insufficient access to this request'
      using errcode = '42501';
  end if;
  if r.hospital_id is not null then
    select id, name, address, intake_phone into h
    from public.hospitals where id = r.hospital_id;
  end if;
  if r.driver_id is not null then
    select id, display_name, vehicle_label, phone,
           current_lat, current_lng, heading, speed, last_location_at
    into d from public.drivers where id = r.driver_id;
  end if;
  return jsonb_build_object(
    'id',             r.id,
    'status',         r.status,
    'emergency_type', r.emergency_type,
    'patient_address',r.patient_address,
    'patient_lat',    r.patient_lat,
    'patient_lng',    r.patient_lng,
    'hospital_id',    r.hospital_id,
    'driver_id',      r.driver_id,
    'notes',          r.notes,
    'priority',       r.priority,
    'created_at',     r.created_at,
    'contact_phone',  r.contact_phone,
    'hospital', case when h.id is not null then jsonb_build_object(
      'id',           h.id,
      'name',         h.name,
      'address',      h.address,
      'intake_phone', h.intake_phone
    ) else null end,
    'driver', case when d.id is not null then jsonb_build_object(
      'id',              d.id,
      'display_name',    d.display_name,
      'vehicle_label',   d.vehicle_label,
      'phone',           d.phone,
      'current_lat',     d.current_lat,
      'current_lng',     d.current_lng,
      'heading',         d.heading,
      'speed',           d.speed,
      'last_location_at',d.last_location_at
    ) else null end
  );
end;
$$;

-- 5g. client_submit_patient_review — require auth + patient ownership
create or replace function public.client_submit_patient_review(
  p_request_id uuid,
  p_rating     integer,
  p_remark     text    default '',
  p_tags       text[]  default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_old_notes      text;
  v_clean_notes    text;
  v_new_notes      text;
  v_review_block   text;
  v_date_str       text;
  v_rating_clamped integer;
begin
  if v_uid is null then
    raise exception 'unauthenticated: sign in required to submit a review'
      using errcode = '42501';
  end if;
  select notes into v_old_notes
  from public.emergency_requests where id = p_request_id;
  if not found then
    raise exception 'request_not_found: %', p_request_id;
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.user_id = v_uid
      and (
            p.role in ('admin', 'dispatcher')
         or (p.role = 'client' and exists (
               select 1 from public.emergency_requests er
               where er.id = p_request_id and er.client_user_id = v_uid
             ))
      )
  ) then
    raise exception 'not_allowed: you are not the patient for this request'
      using errcode = '42501';
  end if;
  v_rating_clamped := least(greatest(coalesce(p_rating, 5), 1), 5);
  v_date_str       := to_char(now(), 'YYYY-MM-DD HH24:MI:SS');
  v_review_block   := format(
    '[PATIENT REVIEW %s%s (%s/5)]: %s | TAGS: %s | SUBMITTED: %s]',
    repeat('★', v_rating_clamped),
    repeat('☆', 5 - v_rating_clamped),
    v_rating_clamped,
    coalesce(nullif(trim(p_remark), ''), 'Service completed'),
    case when p_tags is not null and array_length(p_tags, 1) > 0
         then array_to_string(p_tags, ', ')
         else 'None'
    end,
    v_date_str
  );
  v_clean_notes := regexp_replace(
    coalesce(v_old_notes, ''),
    '\[PATIENT (?:REVIEW|FEEDBACK|RATING)[^\]]*\]', '', 'gi'
  );
  v_clean_notes := trim(v_clean_notes);
  v_new_notes   := case
    when length(v_clean_notes) > 0
      then v_clean_notes || E'\n' || v_review_block
    else v_review_block
  end;
  update public.emergency_requests set notes = v_new_notes where id = p_request_id;
  return jsonb_build_object(
    'success',    true,
    'request_id', p_request_id,
    'rating',     v_rating_clamped,
    'remark',     coalesce(p_remark, ''),
    'notes',      v_new_notes
  );
end;
$$;

-- 5h. admin_finish_staff_role — remove set_config privilege escalation (MEDIUM-4)
create or replace function public.admin_finish_staff_role(
  p_user_id       uuid,
  p_role          text,
  p_hospital_id   uuid  default null,
  p_display_name  text  default null,
  p_vehicle_label text  default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() is distinct from 'admin'
     and coalesce(current_setting('request.jwt.claim.role', true), '')
         is distinct from 'service_role'
     and current_user is distinct from 'service_role'
  then
    raise exception 'admin_only: cannot assign roles'
      using errcode = '42501';
  end if;
  -- NOTE: set_config('request.jwt.claim.role','service_role',...) intentionally
  -- removed. SECURITY DEFINER provides the necessary privilege elevation.
  perform public.assign_profile_role(
    p_user_id      := p_user_id,
    p_role         := p_role,
    p_hospital_id  := p_hospital_id,
    p_display_name := p_display_name,
    p_vehicle_label := p_vehicle_label
  );
  return jsonb_build_object('user_id', p_user_id, 'role', p_role);
end;
$$;

-- ── 6. REVOKE ANON / PUBLIC FROM ALL FUNCTIONS (now they exist) ───────────────
-- GPS telemetry
revoke all on function
  public.update_driver_location(uuid, double precision, double precision, double precision, double precision, integer, boolean, text)
  from public;
revoke execute on function
  public.update_driver_location(uuid, double precision, double precision, double precision, double precision, integer, boolean, text)
  from anon;

-- FCM token (now guaranteed to exist from step 5a)
revoke all on function public.update_driver_fcm_token(uuid, text) from public, anon;

-- Duty status (now guaranteed to exist from step 5b)
revoke all on function public.set_driver_duty_status(uuid, boolean) from public, anon;

-- Tactical alerts (now guaranteed to exist from steps 5c–5e)
revoke all on function public.send_driver_tactical_alert(uuid, text, text)     from public, anon;
revoke all on function public.ack_driver_tactical_alert(uuid, text)            from public, anon;
revoke all on function public.trigger_driver_emergency_alert(uuid, text, text) from public, anon;

-- Client RPCs (now guaranteed to exist from steps 5f–5g)
revoke all on function public.client_get_request_detail(uuid)                             from public, anon;
revoke all on function public.client_submit_patient_review(uuid, integer, text, text[])  from public, anon;

-- admin_finish_staff_role (now guaranteed to exist from step 5h)
revoke all on function public.admin_finish_staff_role(uuid, text, uuid, text, text) from public, anon;

-- ── 7. RE-GRANT TO AUTHENTICATED + SERVICE_ROLE ───────────────────────────────
grant execute on function
  public.update_driver_location(uuid, double precision, double precision, double precision, double precision, integer, boolean, text)
  to authenticated, service_role;

grant execute on function public.update_driver_fcm_token(uuid, text)              to authenticated, service_role;
grant execute on function public.set_driver_duty_status(uuid, boolean)            to authenticated, service_role;
grant execute on function public.send_driver_tactical_alert(uuid, text, text)     to authenticated, service_role;
grant execute on function public.ack_driver_tactical_alert(uuid, text)            to authenticated, service_role;
grant execute on function public.trigger_driver_emergency_alert(uuid, text, text) to authenticated, service_role;
grant execute on function public.client_get_request_detail(uuid)                  to authenticated, service_role;
grant execute on function public.client_submit_patient_review(uuid, integer, text, text[]) to authenticated, service_role;
grant execute on function public.admin_finish_staff_role(uuid, text, uuid, text, text)     to authenticated, service_role;

-- ── 8. AUDIT TRAIL TABLES ─────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'emergency_status_events') then
    execute 'alter table public.emergency_status_events enable row level security';
    execute 'revoke all on public.emergency_status_events from anon';
  end if;
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'emergency_access_events') then
    execute 'alter table public.emergency_access_events enable row level security';
    execute 'revoke all on public.emergency_access_events from anon';
  end if;
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'sms_notifications_log') then
    execute 'alter table public.sms_notifications_log enable row level security';
    execute 'revoke all on public.sms_notifications_log from anon';
    execute $pol$
      drop policy if exists "sms_log_admin_read" on public.sms_notifications_log;
      create policy "sms_log_admin_read" on public.sms_notifications_log
        for select to authenticated
        using (
          exists (
            select 1 from public.profiles p
            where p.user_id = auth.uid() and p.role in ('admin','dispatcher')
          )
        )
    $pol$;
  end if;
end;
$$;

-- ── 9. VERIFICATION QUERY (uncomment and run to confirm) ─────────────────────
-- Expected: 0 rows — no anon access to any PHI table remains.
/*
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in (
    'emergency_requests','drivers','hospitals','profiles',
    'role_requests','sms_notifications_log',
    'emergency_status_events','emergency_access_events'
  )
order by table_name, privilege_type;
*/

-- ==============================================================================
-- END — Hardening migration complete.
-- ==============================================================================
