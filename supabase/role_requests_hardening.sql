-- Solace EMS Security & Role Requests Hardening
-- Enforces zero-leak access policies and enables pending staff applications

-- 1. Ensure RLS is active on role_requests
alter table if exists public.role_requests enable row level security;

-- 2. Drop any legacy open or misconfigured policies on role_requests
drop policy if exists "role_requests_insert_self" on public.role_requests;
drop policy if exists "role_requests_allow_applicant_insert" on public.role_requests;

-- 3. Policy: Authenticated users can insert their own request with status = 'pending' only
create policy "role_requests_insert_self" on public.role_requests
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
  );

-- 4. Policy: Users can view their own requests to monitor status
drop policy if exists "role_requests_self_select" on public.role_requests;
create policy "role_requests_self_select" on public.role_requests
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where profiles.user_id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- 5. Revoke any anonymous access from operational & PHI tables
revoke all on public.role_requests from anon;
revoke all on public.emergency_requests from anon;
revoke all on public.drivers from anon;
revoke all on public.hospitals from anon;
revoke all on public.profiles from anon;

-- Grant minimal necessary privileges to authenticated users
grant select, insert on public.role_requests to authenticated;
