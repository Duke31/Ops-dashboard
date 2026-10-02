-- ==============================================================================
-- Migration: SMS Gateway Audit Log & Database Webhook Trigger
-- Standard: Zero USING (true), Zero anon access, Immutable Logs
-- ==============================================================================

-- 1. Create the immutable SMS Notifications Log table
create table if not exists public.sms_notifications_log (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.emergency_requests(id) on delete set null,
  recipient_phone text not null,
  recipient_role text not null check (recipient_role in ('caller', 'hospital', 'driver')),
  message_body text not null,
  provider text not null default 'termii',
  status text not null check (status in ('sent', 'failed', 'queued')),
  provider_message_id text,
  error_details text,
  created_at timestamptz not null default now()
);

-- Index for auditing and request timeline lookup
create index if not exists idx_sms_log_request_id on public.sms_notifications_log(request_id);
create index if not exists idx_sms_log_created_at on public.sms_notifications_log(created_at desc);

-- 2. Enable Row-Level Security
alter table public.sms_notifications_log enable row level security;

-- 3. STRICT RLS POLICIES:
-- Rule: Only authenticated dispatchers and admins can read SMS notification logs.
-- NEVER anon. NEVER USING (true).

drop policy if exists "sms_log_admin_dispatcher_select" on public.sms_notifications_log;
create policy "sms_log_admin_dispatcher_select"
on public.sms_notifications_log
for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.user_id = auth.uid()
      and profiles.role in ('admin', 'dispatcher')
  )
);

-- Rule: Authenticated callers can only read SMS logs matching their own request
drop policy if exists "sms_log_caller_select_own" on public.sms_notifications_log;
create policy "sms_log_caller_select_own"
on public.sms_notifications_log
for select
to authenticated
using (
  exists (
    select 1 from public.emergency_requests
    where emergency_requests.id = sms_notifications_log.request_id
      and emergency_requests.client_user_id = auth.uid()
  )
);

-- Rule: No user can UPDATE or DELETE logs. Logs are strictly immutable.
-- (No UPDATE or DELETE policies are granted, which enforces immutability by default).

-- Rule: Backend insert permissions
-- Webhook runs with service_role key, which bypasses RLS for INSERT.
-- Authenticated users cannot inject fake SMS logs.

-- 4. Enable pg_net extension if you wish to trigger directly from PostgreSQL (Optional direct hook)
-- create extension if not exists pg_net with schema extensions;
