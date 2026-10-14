-- ==============================================================================
-- 1. Helper Function: Get current authenticated driver ID
-- ==============================================================================
create or replace function public.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.drivers where user_id = auth.uid() limit 1;
$$;

-- Helper Function: Get current authenticated user's hospital ID
create or replace function public.current_user_hospital_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hospital_id from public.profiles where user_id = auth.uid() limit 1;
$$;

grant execute on function public.current_driver_id() to authenticated;
grant execute on function public.current_user_hospital_id() to authenticated;

-- ==============================================================================
-- 2. Row Level Security on public.emergency_requests
-- ==============================================================================
alter table public.emergency_requests enable row level security;

-- Drop any overly permissive existing select policies
drop policy if exists "emergency_requests_select_policy" on public.emergency_requests;
drop policy if exists "emergency_requests_authenticated_select" on public.emergency_requests;
drop policy if exists "emergency_requests_read_all" on public.emergency_requests;
drop policy if exists "emergency_requests_select" on public.emergency_requests;
drop policy if exists "emergency_requests_driver_select" on public.emergency_requests;
drop policy if exists "emergency_requests_hospital_select" on public.emergency_requests;
drop policy if exists "emergency_requests_admin_select" on public.emergency_requests;

-- Unified Strict SELECT Policy:
-- - Admins & Dispatchers: See ALL requests
-- - Hospitals: See requests directed to their hospital
-- - Drivers: ONLY see requests explicitly assigned to their driver ID
create policy "emergency_requests_strict_select"
on public.emergency_requests
for select
to authenticated
using (
  -- Service role bypass
  auth.role() = 'service_role'
  or
  -- Admin / Dispatcher can see everything
  public.current_profile_role() in ('admin', 'dispatcher')
  or
  -- Hospital can only see requests for their facility
  (public.current_profile_role() = 'hospital' and hospital_id = public.current_user_hospital_id())
  or
  -- Driver can STRICTLY only see requests assigned to them
  (public.current_profile_role() = 'driver' and driver_id = public.current_driver_id())
);

-- ==============================================================================
-- 3. Row Level Security on public.hospitals (Allow ER Desk to update bed capacity)
-- ==============================================================================
alter table public.hospitals enable row level security;

-- Ensure anyone authenticated can read hospital listings
drop policy if exists "hospitals_select_policy" on public.hospitals;
drop policy if exists "hospitals_strict_select" on public.hospitals;
create policy "hospitals_strict_select"
on public.hospitals
for select
to authenticated
using (true);

-- Allow Hospital users to update their own hospital capacity
drop policy if exists "hospitals_capacity_update" on public.hospitals;
create policy "hospitals_capacity_update"
on public.hospitals
for update
to authenticated
using (
  auth.role() = 'service_role'
  or public.current_profile_role() = 'admin'
  or (public.current_profile_role() = 'hospital' and id = public.current_user_hospital_id())
)
with check (
  auth.role() = 'service_role'
  or public.current_profile_role() = 'admin'
  or (public.current_profile_role() = 'hospital' and id = public.current_user_hospital_id())
);
