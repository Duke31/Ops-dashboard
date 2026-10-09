-- Migration: Ensure patient_age_band column exists and is populated
-- Run in Supabase SQL Editor if not already present.

alter table public.emergency_requests
  add column if not exists patient_age_band text;

-- Ensure create_emergency_request accepts p_patient_age_band text default 'unknown'
-- and sets patient_age_band = coalesce(nullif(p_patient_age_band, ''), 'unknown') on INSERT.

create or replace function public.create_emergency_request(
  p_patient_lat numeric,
  p_patient_lng numeric,
  p_patient_address text,
  p_emergency_type text,
  p_priority smallint default 2,
  p_notes text default null,
  p_contact_phone text default null,
  p_patient_age_band text default 'unknown',
  p_idempotency_key uuid default null
)
returns public.emergency_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_profile   public.profiles%rowtype;
  v_row       public.emergency_requests%rowtype;
  v_existing  public.emergency_requests%rowtype;
  v_client_id uuid;
  v_origin    text;
begin
  if v_uid is null then
    raise exception 'unauthenticated: auth.uid() is null' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where user_id = v_uid;
  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;
  if v_profile.role not in ('client', 'dispatcher', 'admin') then
    raise exception 'insufficient_standing: only a client (or dispatcher/admin) can open a request'
      using errcode = '42501';
  end if;
  if p_patient_address is null or btrim(p_patient_address) = '' then
    raise exception 'invalid_parameter: patient_address is required' using errcode = '22023';
  end if;

  if v_profile.role = 'client' then
    v_client_id := v_uid;
    v_origin := 'self_service';
  else
    v_client_id := null;
    v_origin := 'staff_logged';
  end if;

  if p_idempotency_key is not null then
    if v_origin = 'self_service' then
      select * into v_existing from public.emergency_requests
       where client_user_id = v_uid and idempotency_key = p_idempotency_key and origin = 'self_service';
    else
      select * into v_existing from public.emergency_requests
       where reported_by_user_id = v_uid and idempotency_key = p_idempotency_key and origin = 'staff_logged';
    end if;
    if found then
      return v_existing;
    end if;
  end if;

  begin
    insert into public.emergency_requests (
      client_user_id, reported_by_user_id, origin, idempotency_key, patient_lat, patient_lng, patient_address,
      patient_age_band, emergency_type, priority, notes, contact_phone, status, status_changed_by,
      lawful_basis, purpose_code
    ) values (
      v_client_id, v_uid, v_origin, p_idempotency_key, p_patient_lat, p_patient_lng, btrim(p_patient_address),
      coalesce(nullif(btrim(p_patient_age_band), ''), 'unknown'),
      p_emergency_type, coalesce(p_priority, 2),
      nullif(btrim(coalesce(p_notes, '')), ''),
      nullif(btrim(coalesce(p_contact_phone, '')), ''),
      'Requested', v_uid, 'vital_interests', 'emergency_medical_dispatch'
    )
    returning * into v_row;
  exception when unique_violation then
    if p_idempotency_key is not null then
      if v_origin = 'self_service' then
        select * into v_existing from public.emergency_requests
         where client_user_id = v_uid and idempotency_key = p_idempotency_key and origin = 'self_service';
      else
        select * into v_existing from public.emergency_requests
         where reported_by_user_id = v_uid and idempotency_key = p_idempotency_key and origin = 'staff_logged';
      end if;
      if found then
        return v_existing;
      end if;
    end if;
    raise;
  end;

  insert into public.emergency_status_events (request_id, from_status, to_status, actor_user_id, actor_role)
  values (v_row.id, null, 'Requested', v_uid, v_profile.role);

  insert into public.emergency_access_events (request_id, actor_user_id, actor_role, action)
  values (v_row.id, v_uid, v_profile.role, 'create');

  return v_row;
end;
$$;

revoke all on function public.create_emergency_request(numeric, numeric, text, text, smallint, text, text, text, uuid) from public;
grant execute on function public.create_emergency_request(numeric, numeric, text, text, smallint, text, text, text, uuid) to authenticated;
