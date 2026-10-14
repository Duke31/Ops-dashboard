-- ==============================================================================
-- Migration: Multi-Region Partner Hospitals & Regional Grid Accreditation
-- Date: 2026-10-12
-- Compatible with all existing RLS policies, schemas, and state machine triggers
-- ==============================================================================

-- 1. Ensure columns exist with safe ALTER TABLE IF EXISTS
alter table if exists public.hospitals
  add column if not exists available_capacity integer default 10;

alter table if exists public.hospitals
  add column if not exists intake_phone text;

alter table if exists public.emergency_requests
  add column if not exists patient_age_band text default 'unknown';

alter table if exists public.emergency_requests
  add column if not exists completed_at timestamptz;

-- 2. Seed / Upsert Vetted Partner Facilities for Ibadan Private Network & Osun State Pilot
-- Note: Uses ON CONFLICT or conditional INSERT to avoid duplicates and preserve primary keys

-- A. Ibadan Private Hospital Network (Oyo State Corridor)
insert into public.hospitals (id, name, address, lat, lng, intake_phone, available_capacity)
select 
  'fd6d8cc0-25fa-46dc-a3f5-b15515b4b981'::uuid,
  'UCH Private Wing & Emergency Centre',
  'Queen Elizabeth II Road, Oritamefa, Ibadan, Oyo State',
  7.4042,
  3.9036,
  '08023344551',
  14
where not exists (
  select 1 from public.hospitals where name = 'UCH Private Wing & Emergency Centre'
);

insert into public.hospitals (id, name, address, lat, lng, intake_phone, available_capacity)
select 
  '2309e09b-079d-4e04-998b-c9a02a725d81'::uuid,
  'LifeCare Hospital & Surgical Centre',
  'Plot 4, Ring Road, Challenge, Ibadan, Oyo State',
  7.3621,
  3.8642,
  '08034455662',
  8
where not exists (
  select 1 from public.hospitals where name = 'LifeCare Hospital & Surgical Centre'
);

insert into public.hospitals (id, name, address, lat, lng, intake_phone, available_capacity)
select 
  'ee5ff53b-834c-4833-90e3-8a8995e38f14'::uuid,
  'Jid-Mek Specialist Hospital (Bodija)',
  'Awolowo Avenue, Old Bodija, Ibadan, Oyo State',
  7.4320,
  3.9100,
  '08056677883',
  6
where not exists (
  select 1 from public.hospitals where name = 'Jid-Mek Specialist Hospital (Bodija)'
);

-- B. Osun State / OSEMSAS Collaborative Pilot Cluster
insert into public.hospitals (id, name, address, lat, lng, intake_phone, available_capacity)
select 
  '36021a2b-a6ce-468f-95e3-396e5cf5285c'::uuid,
  'State Specialist Hospital Asubiaro (OSEMSAS Pilot)',
  'Hospital Road, Asubiaro, Osogbo, Osun State',
  7.7681,
  4.5512,
  '08078899004',
  12
where not exists (
  select 1 from public.hospitals where name = 'State Specialist Hospital Asubiaro (OSEMSAS Pilot)'
);

insert into public.hospitals (id, name, address, lat, lng, intake_phone, available_capacity)
select 
  '7a2ecfb0-96cf-4f70-b58a-5e578c31db97'::uuid,
  'UNIOSUN Teaching Hospital',
  'Idi-Seke, Osogbo, Osun State',
  7.7820,
  4.5630,
  '08089900115',
  10
where not exists (
  select 1 from public.hospitals where name = 'UNIOSUN Teaching Hospital'
);

insert into public.hospitals (id, name, address, lat, lng, intake_phone, available_capacity)
select 
  '35ede879-06cb-4004-88df-17707865053e'::uuid,
  'OAUTHC Emergency & Trauma Complex',
  'Ife-Ilesha Road, Ile-Ife, Osun State',
  7.5020,
  4.5310,
  '08090011226',
  15
where not exists (
  select 1 from public.hospitals where name = 'OAUTHC Emergency & Trauma Complex'
);

-- 3. Confirm RLS read permissions for all accredited facilities
grant select on public.hospitals to anon, authenticated, service_role;

-- 4. Verification Check: List all active facilities
-- select id, name, address, available_capacity, intake_phone from public.hospitals order by name;
