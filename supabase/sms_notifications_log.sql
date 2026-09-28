-- Tier 1 / Item 1: immutable SMS notification log
-- Strict RLS: no anon, no USING (true), no client INSERT/UPDATE/DELETE.

create table if not exists public.sms_notifications_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  request_id uuid references public.emergency_requests (id) on delete set null,
  recipient_e164 text not null,
  recipient_role text not null
    check (recipient_role in ('caller', 'hospital', 'driver', 'other')),
  trigger_status text not null,
  template_key text not null,
  body_preview text,
  provider text not null default 'termii',
  provider_message_id text,
  http_status integer,
  success boolean not null default false,
  error_message text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists sms_notifications_log_request_id_idx
  on public.sms_notifications_log (request_id);

create index if not exists sms_notifications_log_created_at_idx
  on public.sms_notifications_log (created_at desc);

alter table public.sms_notifications_log enable row level security;

revoke all on table public.sms_notifications_log from anon;
revoke all on table public.sms_notifications_log from public;

-- SELECT: admin and dispatcher only (immutable audit log — not public PHI dump)
drop policy if exists sms_log_select_desk on public.sms_notifications_log;
create policy sms_log_select_desk
  on public.sms_notifications_log
  for select
  to authenticated
  using (public.current_profile_role() in ('admin', 'dispatcher'));

-- No INSERT / UPDATE / DELETE policies for authenticated.
-- Webhook writes with SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).

grant select on table public.sms_notifications_log to authenticated;

comment on table public.sms_notifications_log is
  'Immutable outbound SMS log. Inserts only via service role (Next.js webhook).';
