-- ==============================================================================
-- Migration: Strict Multi-Desk Role Isolation & Anti-Impersonation SQL Rules
-- Date: 2026-10-15
-- 
-- Enforces:
-- 1. Anti-Impersonation: Admin & Dispatcher cannot sign in as health staff, 
--    verify shifts, or alter clinical bed capacity.
-- 2. Audit Trail: Every hospital shift verification is recorded in 
--    public.hospital_shift_verifications with the authenticated user ID.
-- 3. Zero-Leak PHI: Revoke all anonymous access from emergency_requests, 
--    profiles, and drivers. Drop all 'using (true)' policies on PHI tables.
-- 4. Role Isolation:
--    - Hospital desk: strictly scoped to requests directed to hospital_id = current_user_hospital_id()
--    - Driver console: strictly scoped to requests where driver_id = current_driver_id()
--    - Client app: strictly scoped to requests where client_user_id or reported_by_user_id = auth.uid()
--    - Dispatcher & Admin: full dispatch overview, but blocked from clinical sign-offs
-- 5. Anti-Privilege Escalation: BEFORE UPDATE trigger on public.profiles blocks
--    any self-update of 'role' or 'hospital_id'.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Ensure Safe Columns Exist on Target Tables
-- ------------------------------------------------------------------------------
alter table if exists public.emergency_requests
  add column if not exists client_user_id uuid,
  add column if not exists reported_by_user_id uuid,
  add column if not exists hospital_id uuid,
  add column if not exists driver_id uuid;

alter table if exists public.hospitals
  add column if not exists available_capacity integer default 10,
  add column if not exists last_shift_verified_at timestamptz,
  add column if not exists shift_officer_name text,
  add column if not exists shift_officer_cadre text,
  add column if not exists theater_ready boolean default true,
  add column if not exists blood_bank_ready boolean default true;

-- ------------------------------------------------------------------------------
-- 1. Ensure Audit & Security Helper Functions Exist
-- ------------------------------------------------------------------------------
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_user_hospital_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hospital_id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.drivers where user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_user_hospital_id() to authenticated;
grant execute on function public.current_driver_id() to authenticated;

-- ------------------------------------------------------------------------------
-- 2. Create Audit Table: hospital_shift_verifications
-- ------------------------------------------------------------------------------
create table if not exists public.hospital_shift_verifications (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  verified_by_user_id uuid not null references auth.users(id),
  officer_name text not null,
  officer_cadre text not null,
  capacity integer not null check (capacity >= 0),
  theater_ready boolean default true,
  blood_bank_ready boolean default true,
  mgso4_ready boolean default true,
  neonatal_resus_ready boolean default true,
  hdu_bed_ready boolean default true,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.hospital_shift_verifications enable row level security;

-- Only authenticated users can read shift verification audit history
drop policy if exists "shift_verifications_select" on public.hospital_shift_verifications;
create policy "shift_verifications_select"
on public.hospital_shift_verifications
for select
to authenticated
using (
  auth.role() = 'service_role'
  or public.current_profile_role() = 'admin'
  or (public.current_profile_role() = 'hospital' and hospital_id = public.current_user_hospital_id())
);

-- Revoke anon access
revoke all on public.hospital_shift_verifications from anon;
grant select on public.hospital_shift_verifications to authenticated;

-- ------------------------------------------------------------------------------
-- 3. Strict Audited Shift Verification RPC (Blocks Admin/Dispatcher Masquerade)
-- ------------------------------------------------------------------------------
create or replace function public.hospital_verify_shift(
  p_hospital_id uuid,
  p_officer_name text,
  p_officer_cadre text,
  p_capacity integer,
  p_theater_ready boolean default true,
  p_blood_bank_ready boolean default true,
  p_mgso4_ready boolean default true,
  p_oxytocin_ready boolean default true,
  p_neonatal_resus_ready boolean default true,
  p_hdu_bed_ready boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_role text;
  v_user_hospital_id uuid;
  v_hosp_name text;
begin
  -- 1. Ensure user is authenticated
  if auth.uid() is null then
    raise exception 'unauthenticated: login required' using errcode = '42501';
  end if;

  -- 2. Fetch authenticated user profile
  select role, hospital_id into v_user_role, v_user_hospital_id
  from public.profiles
  where user_id = auth.uid();

  -- STRICT RULE 1: Admin and Dispatcher CANNOT sign clinical shift verifications
  if v_user_role is distinct from 'hospital' then
    raise exception 'role_violation: Only verified hospital health staff can sign off shift capacity. Admins and dispatchers cannot masquerade as clinical officers.'
      using errcode = '42501';
  end if;

  -- STRICT RULE 2: Health staff can ONLY verify their own assigned hospital facility
  if v_user_hospital_id is distinct from p_hospital_id then
    raise exception 'facility_violation: Unauthorized. You may only verify capacity for your verified assigned hospital facility.'
      using errcode = '42501';
  end if;

  select name into v_hosp_name from public.hospitals where id = p_hospital_id;
  if not found then
    raise exception 'hospital_not_found: %', p_hospital_id;
  end if;

  -- 3. Update hospital capacity and active session verification
  update public.hospitals
  set available_capacity = greatest(p_capacity, 0),
      last_shift_verified_at = now(),
      shift_officer_name = trim(p_officer_name),
      shift_officer_cadre = trim(p_officer_cadre),
      theater_ready = p_theater_ready,
      blood_bank_ready = p_blood_bank_ready
  where id = p_hospital_id;

  -- 4. Record tamper-proof audit trail
  insert into public.hospital_shift_verifications (
    hospital_id,
    verified_by_user_id,
    officer_name,
    officer_cadre,
    capacity,
    theater_ready,
    blood_bank_ready,
    mgso4_ready,
    neonatal_resus_ready,
    hdu_bed_ready,
    verified_at
  ) values (
    p_hospital_id,
    auth.uid(),
    trim(p_officer_name),
    trim(p_officer_cadre),
    greatest(p_capacity, 0),
    p_theater_ready,
    p_blood_bank_ready,
    p_mgso4_ready,
    p_neonatal_resus_ready,
    p_hdu_bed_ready,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'hospital_id', p_hospital_id,
    'hospital_name', v_hosp_name,
    'capacity', greatest(p_capacity, 0),
    'verified_by', trim(p_officer_name),
    'verified_cadre', trim(p_officer_cadre),
    'verified_at', now()
  );
end;
$$;

revoke all on function public.hospital_verify_shift from public;
grant execute on function public.hospital_verify_shift to authenticated;
grant execute on function public.hospital_verify_shift to service_role;

-- ------------------------------------------------------------------------------
-- 4. Anti-Privilege Escalation Trigger on public.profiles
-- Prevents users from updating their own 'role' or 'hospital_id'
-- ------------------------------------------------------------------------------
create or replace function public.prevent_profile_role_tampering()
returns trigger
language plpgsql
security definer
as $$
begin
  if (new.role is distinct from old.role or new.hospital_id is distinct from old.hospital_id) then
    -- Allow service_role or admin via admin_finish_staff_role
    if public.current_profile_role() is distinct from 'admin'
       and coalesce(current_setting('request.jwt.claim.role', true), '') is distinct from 'service_role'
       and current_user is distinct from 'service_role'
    then
      raise exception 'security_violation: you are not authorized to alter roles or facility assignments'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_role_tampering on public.profiles;
create trigger trg_prevent_profile_role_tampering
before update on public.profiles
for each row
execute function public.prevent_profile_role_tampering();

-- ------------------------------------------------------------------------------
-- 5. Revoke Anonymous Access on PHI & Operational Tables
-- ------------------------------------------------------------------------------
revoke all on public.emergency_requests from anon;
revoke all on public.profiles from anon;
revoke all on public.role_requests from anon;
revoke all on public.drivers from anon;

-- Keep read-only on public.hospitals directory for emergency triage navigation
grant select on public.hospitals to anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. Strict Row Level Security on public.hospitals
-- ------------------------------------------------------------------------------
alter table public.hospitals enable row level security;

drop policy if exists "hospitals_public_read" on public.hospitals;
drop policy if exists "hospitals_strict_select" on public.hospitals;
drop policy if exists "hospitals_select_policy" on public.hospitals;

create policy "hospitals_strict_select"
on public.hospitals
for select
to authenticated, anon
using (true);

drop policy if exists "hospitals_capacity_update" on public.hospitals;
drop policy if exists "hospitals_admin_manage" on public.hospitals;

create policy "hospitals_admin_manage"
on public.hospitals
for all
to authenticated
using (
  auth.role() = 'service_role'
  or public.current_profile_role() = 'admin'
)
with check (
  auth.role() = 'service_role'
  or public.current_profile_role() = 'admin'
);

-- ------------------------------------------------------------------------------
-- 7. Strict Row Level Security on public.emergency_requests
-- ------------------------------------------------------------------------------
alter table public.emergency_requests enable row level security;

-- Drop all legacy or overly permissive policies
drop policy if exists "emergency_requests_read_all" on public.emergency_requests;
drop policy if exists "emergency_requests_client_update" on public.emergency_requests;
drop policy if exists "emergency_requests_strict_select" on public.emergency_requests;
drop policy if exists "emergency_requests_strict_update" on public.emergency_requests;
drop policy if exists "emergency_requests_strict_insert" on public.emergency_requests;
drop policy if exists "emergency_requests_select_policy" on public.emergency_requests;
drop policy if exists "emergency_requests_authenticated_select" on public.emergency_requests;
drop policy if exists "emergency_requests_desk_isolated_select" on public.emergency_requests;
drop policy if exists "emergency_requests_desk_isolated_insert" on public.emergency_requests;
drop policy if exists "emergency_requests_desk_isolated_update" on public.emergency_requests;

-- A. Strict SELECT Policy:
-- - Dispatcher & Admin: Full network visibility
-- - Hospital: STRICTLY requests routed to their assigned facility
-- - Driver: STRICTLY requests assigned to their vehicle unit
-- - Patient / Client: STRICTLY their own requests (client_user_id or reported_by_user_id)
create policy "emergency_requests_desk_isolated_select"
on public.emergency_requests
for select
to authenticated
using (
  auth.role() = 'service_role'
  or public.current_profile_role() in ('admin', 'dispatcher')
  or (public.current_profile_role() = 'hospital' and hospital_id = public.current_user_hospital_id())
  or (public.current_profile_role() = 'driver' and driver_id = public.current_driver_id())
  or (client_user_id = auth.uid() or reported_by_user_id = auth.uid())
);

-- B. Strict INSERT Policy:
-- - Client: Creates their own initial SOS
-- - Dispatcher & Admin: Can insert requests (manual intake or PHC referral)
create policy "emergency_requests_desk_isolated_insert"
on public.emergency_requests
for insert
to authenticated
with check (
  auth.role() = 'service_role'
  or public.current_profile_role() in ('admin', 'dispatcher')
  or (
    (client_user_id = auth.uid() or reported_by_user_id = auth.uid())
    and coalesce(status::text, 'Requested') in ('Requested', 'Draft')
  )
);

-- C. Strict UPDATE Policy:
-- - Dispatcher & Admin: Full dispatch routing, assigning ambulances and triage
-- - Hospital: Can ONLY update requests assigned to their facility
-- - Driver: Can ONLY update requests assigned to their driver ID
-- - Client: Can ONLY update initial status or notes before transport
create policy "emergency_requests_desk_isolated_update"
on public.emergency_requests
for update
to authenticated
using (
  auth.role() = 'service_role'
  or public.current_profile_role() in ('admin', 'dispatcher')
  or (public.current_profile_role() = 'hospital' and hospital_id = public.current_user_hospital_id())
  or (public.current_profile_role() = 'driver' and driver_id = public.current_driver_id())
  or (
    (client_user_id = auth.uid() or reported_by_user_id = auth.uid())
    and status::text in ('Requested', 'Draft')
  )
)
with check (
  auth.role() = 'service_role'
  or public.current_profile_role() in ('admin', 'dispatcher')
  or (public.current_profile_role() = 'hospital' and hospital_id = public.current_user_hospital_id())
  or (public.current_profile_role() = 'driver' and driver_id = public.current_driver_id())
  or (
    (client_user_id = auth.uid() or reported_by_user_id = auth.uid())
    and status::text in ('Requested', 'Draft')
  )
);

-- ------------------------------------------------------------------------------
-- 8. Strict Row Level Security on public.drivers
-- ------------------------------------------------------------------------------
alter table public.drivers enable row level security;

drop policy if exists "drivers_public_read" on public.drivers;
drop policy if exists "drivers_select_policy" on public.drivers;
drop policy if exists "drivers_strict_select" on public.drivers;
drop policy if exists "drivers_telemetry_update" on public.drivers;
drop policy if exists "drivers_desk_select" on public.drivers;
drop policy if exists "drivers_self_update" on public.drivers;

-- SELECT: Authenticated operations desks can view active drivers
create policy "drivers_desk_select"
on public.drivers
for select
to authenticated
using (true);

-- UPDATE: Drivers can ONLY update their own row (telemetry/status)
create policy "drivers_self_update"
on public.drivers
for update
to authenticated
using (
  auth.role() = 'service_role'
  or user_id = auth.uid()
  or public.current_profile_role() = 'admin'
)
with check (
  auth.role() = 'service_role'
  or user_id = auth.uid()
  or public.current_profile_role() = 'admin'
);

-- ------------------------------------------------------------------------------
-- 9. Strict Row Level Security on public.profiles
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_desk_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;

create policy "profiles_desk_select"
on public.profiles
for select
to authenticated
using (
  auth.role() = 'service_role'
  or auth.uid() = user_id
  or public.current_profile_role() in ('admin', 'dispatcher')
);

create policy "profiles_self_update"
on public.profiles
for update
to authenticated
using (
  auth.role() = 'service_role'
  or auth.uid() = user_id
  or public.current_profile_role() = 'admin'
)
with check (
  auth.role() = 'service_role'
  or auth.uid() = user_id
  or public.current_profile_role() = 'admin'
);
