-- ==============================================================================
-- Migration: Fix Patient Review Persistence & Realtime Hospital Allocation RLS
-- ==============================================================================

-- 1. Grant base SELECT privileges on core tables to anon and authenticated roles
grant select on public.hospitals to anon, authenticated;
grant select on public.drivers to anon, authenticated;
grant select on public.emergency_requests to anon, authenticated;

-- 2. Open read policy for public hospitals directory during live emergencies
drop policy if exists "hospitals_public_read" on public.hospitals;
create policy "hospitals_public_read"
on public.hospitals
for select
to authenticated, anon
using (true);

-- 3. Ensure emergency_requests has replica identity full so hospital_id & status stream to clients
alter table if exists public.emergency_requests replica identity full;

-- 4. Enable public read policy on emergency requests for live tracking by ID
drop policy if exists "emergency_requests_read_all" on public.emergency_requests;
create policy "emergency_requests_read_all"
on public.emergency_requests
for select
to authenticated, anon
using (true);

-- 5. Dedicated SECURITY DEFINER RPC to permanently save Patient Reviews and Remarks
-- This guarantees that patients can write ratings and remarks without being blocked by RLS,
-- formatting notes with standard [PATIENT REVIEW ...] block readable by Admin & Dispatcher.
create or replace function public.client_submit_patient_review(
  p_request_id uuid,
  p_rating integer,
  p_remark text default '',
  p_tags text[] default array[]::text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_notes text;
  v_clean_notes text;
  v_new_notes text;
  v_review_block text;
  v_date_str text;
  v_rating_clamped integer;
begin
  select notes into v_old_notes
  from public.emergency_requests
  where id = p_request_id;

  if not found then
    raise exception 'request_not_found: %', p_request_id;
  end if;

  v_rating_clamped := least(greatest(coalesce(p_rating, 5), 1), 5);
  v_date_str := to_char(now(), 'YYYY-MM-DD HH24:MI:SS');
  v_review_block := format(
    '[PATIENT REVIEW %s%s (%s/5)]: %s | TAGS: %s | SUBMITTED: %s]',
    repeat('★', v_rating_clamped),
    repeat('☆', 5 - v_rating_clamped),
    v_rating_clamped,
    coalesce(nullif(trim(p_remark), ''), 'Service completed'),
    case when p_tags is not null and array_length(p_tags, 1) > 0 then array_to_string(p_tags, ', ') else 'None' end,
    v_date_str
  );

  -- Strip any previous review block to keep clean notes
  v_clean_notes := regexp_replace(coalesce(v_old_notes, ''), '\[PATIENT (?:REVIEW|FEEDBACK|RATING)[^\]]*\]', '', 'gi');
  v_clean_notes := trim(v_clean_notes);

  if length(v_clean_notes) > 0 then
    v_new_notes := v_clean_notes || E'\n' || v_review_block;
  else
    v_new_notes := v_review_block;
  end if;

  update public.emergency_requests
  set notes = v_new_notes
  where id = p_request_id;

  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'rating', v_rating_clamped,
    'remark', coalesce(p_remark, ''),
    'notes', v_new_notes
  );
end;
$$;
grant execute on function public.client_submit_patient_review(uuid, integer, text, text[]) to anon, authenticated, service_role;

-- 6. SECURITY DEFINER RPC: client_get_request_detail
-- Returns the full request, assigned hospital, and driver info even without auth session
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
  select * into r from public.emergency_requests where id = p_request_id;
  if not found then
    return null;
  end if;

  if r.hospital_id is not null then
    select id, name, address, intake_phone into h from public.hospitals where id = r.hospital_id;
  end if;

  if r.driver_id is not null then
    select id, display_name, vehicle_label, phone, current_lat, current_lng, heading, speed, last_location_at
    into d from public.drivers where id = r.driver_id;
  end if;

  return jsonb_build_object(
    'id', r.id,
    'status', r.status,
    'emergency_type', r.emergency_type,
    'patient_address', r.patient_address,
    'patient_lat', r.patient_lat,
    'patient_lng', r.patient_lng,
    'hospital_id', r.hospital_id,
    'driver_id', r.driver_id,
    'notes', r.notes,
    'priority', r.priority,
    'created_at', r.created_at,
    'contact_phone', r.contact_phone,
    'hospital', case when h.id is not null then jsonb_build_object(
      'id', h.id,
      'name', h.name,
      'address', h.address,
      'intake_phone', h.intake_phone
    ) else null end,
    'driver', case when d.id is not null then jsonb_build_object(
      'id', d.id,
      'display_name', d.display_name,
      'vehicle_label', d.vehicle_label,
      'phone', d.phone,
      'current_lat', d.current_lat,
      'current_lng', d.current_lng,
      'heading', d.heading,
      'speed', d.speed,
      'last_location_at', d.last_location_at
    ) else null end
  );
end;
$$;
grant execute on function public.client_get_request_detail(uuid) to anon, authenticated, service_role;
