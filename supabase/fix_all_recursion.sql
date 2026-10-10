-- ==============================================================================
-- SOLACE EMS — MASTER RLS & RECURSION RESOLUTION FIX
-- Run this in Supabase SQL Editor (project: aogknxtyvzpzqkgmgtsv)
--
-- ROOT CAUSE:
-- Policies were querying public.profiles directly in their USING clauses.
-- When profiles also had an RLS policy, evaluating emergency_requests, drivers,
-- or role_requests triggered a query to profiles, which triggered RLS on profiles,
-- causing: "infinite recursion detected in policy for relation emergency_requests"
--
-- FIX:
-- Replace all subqueries on public.profiles with lightweight, fast,
-- SECURITY DEFINER helper functions that bypass RLS on profiles entirely.
-- ==============================================================================

-- ── 1. SECURITY DEFINER HELPER FUNCTIONS ──────────────────────────────────────

-- 1a. Get current user's profile record safely (bypasses RLS on profiles)
create or replace function public.get_auth_profile()
returns public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select * from public.profiles
  where user_id = auth.uid()
  limit 1;
$$;

-- 1b. Get current user's role safely
create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles
  where user_id = auth.uid()
  limit 1;
$$;

-- 1c. Get current user's linked hospital_id safely
create or replace function public.current_profile_hospital_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select hospital_id from public.profiles
  where user_id = auth.uid()
  limit 1;
$$;

-- 1d. Get current user's linked driver_id safely
create or replace function public.current_driver_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.drivers
  where user_id = auth.uid()
  limit 1;
$$;

-- 1e. Check if current user is admin safely
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.get_auth_profile() from public, anon;
grant execute on function public.get_auth_profile() to authenticated, service_role;

revoke all on function public.current_profile_role() from public, anon;
grant execute on function public.current_profile_role() to authenticated, service_role;

revoke all on function public.current_profile_hospital_id() from public, anon;
grant execute on function public.current_profile_hospital_id() to authenticated, service_role;

revoke all on function public.current_driver_id() from public, anon;
grant execute on function public.current_driver_id() to authenticated, service_role;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ── 2. PROFILES TABLE RLS ─────────────────────────────────────────────────────
drop policy if exists "profiles_admin_read" on public.profiles;
drop policy if exists "profiles_self_read"  on public.profiles;
drop policy if exists "profiles_select_policy" on public.profiles;

create policy "profiles_select_policy"
on public.profiles
for select
to authenticated
using (
  user_id = auth.uid() or public.is_admin()
);

-- ── 3. EMERGENCY_REQUESTS TABLE RLS ───────────────────────────────────────────
drop policy if exists "emergency_requests_role_read" on public.emergency_requests;
drop policy if exists "emergency_requests_read_all" on public.emergency_requests;

create policy "emergency_requests_role_read"
on public.emergency_requests
for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'dispatcher')
  or (public.current_profile_role() = 'hospital' and emergency_requests.hospital_id = public.current_profile_hospital_id())
  or (public.current_profile_role() = 'driver' and emergency_requests.driver_id = public.current_driver_id())
  or (public.current_profile_role() = 'client' and emergency_requests.client_user_id = auth.uid())
);

-- ── 4. DRIVERS TABLE RLS ──────────────────────────────────────────────────────
drop policy if exists "drivers_public_read_telemetry" on public.drivers;
drop policy if exists "drivers_authenticated_read" on public.drivers;

create policy "drivers_authenticated_read"
on public.drivers
for select
to authenticated
using (true);

-- ── 5. HOSPITALS TABLE RLS ────────────────────────────────────────────────────
drop policy if exists "hospitals_public_read" on public.hospitals;
drop policy if exists "hospitals_authenticated_read" on public.hospitals;

create policy "hospitals_authenticated_read"
on public.hospitals
for select
to authenticated
using (true);

-- ── 6. ROLE_REQUESTS TABLE RLS ────────────────────────────────────────────────
drop policy if exists "role_requests_self_select" on public.role_requests;
drop policy if exists "role_requests_insert_self" on public.role_requests;

create policy "role_requests_self_select"
on public.role_requests
for select
to authenticated
using (
  auth.uid() = user_id or public.is_admin()
);

create policy "role_requests_insert_self"
on public.role_requests
for insert
to authenticated
with check (
  auth.uid() = user_id and status = 'pending'
);

-- ── 7. SMS NOTIFICATIONS LOG RLS ──────────────────────────────────────────────
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'sms_notifications_log') then
    drop policy if exists "sms_log_admin_read" on public.sms_notifications_log;
    create policy "sms_log_admin_read" on public.sms_notifications_log
      for select to authenticated
      using (
        public.current_profile_role() in ('admin', 'dispatcher')
      );
  end if;
end;
$$;
