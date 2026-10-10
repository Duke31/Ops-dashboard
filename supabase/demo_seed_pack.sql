-- ==============================================================================
-- SOLACE EMS — LIVE DEMO SEED PACK
-- Run this in the Supabase SQL Editor (project: aogknxtyvzpzqkgmgtsv)
-- ==============================================================================

-- 1. SEED PARTNER RECEIVING HOSPITAL
-- Creates a verified receiving hospital in the Oyo corridor with direct intake line.
INSERT INTO public.hospitals (
    id,
    name,
    address,
    intake_phone,
    created_at
)
VALUES (
    'h0000000-0000-0000-0000-000000000001'::uuid,
    'Oyo Central Emergency & Maternity Center',
    'Plot 14 Ring Road, Ibadan, Oyo State',
    '+234 802 345 6789',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    intake_phone = EXCLUDED.intake_phone;

-- 2. SEED ACTIVE DEMO DRIVER / RESPONDER UNIT
-- Set up a live responder unit with real phone for Call / WhatsApp shortcuts.
-- Note: Replace user_id with your demo driver auth.uid() when linked to Auth user.
INSERT INTO public.drivers (
    id,
    display_name,
    vehicle_label,
    phone,
    current_lat,
    current_lng,
    active,
    created_at
)
VALUES (
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'Sgt. Adebayo Ogunlesi',
    'Ambulance Unit-04 (ALS)',
    '+234 803 123 4567',
    7.3775,
    3.9470,
    TRUE,
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    vehicle_label = EXCLUDED.vehicle_label,
    phone = EXCLUDED.phone,
    active = TRUE;

-- 3. SEED COMPLETED MISSION WITH REAL PATIENT RATING & REMARKS
-- Populates /admin/reviews, /dispatcher/reviews, and /hospital/history immediately for the pitch demo.
INSERT INTO public.emergency_requests (
    id,
    patient_address,
    patient_lat,
    patient_lng,
    emergency_type,
    status,
    hospital_id,
    driver_id,
    contact_phone,
    priority,
    notes,
    created_at,
    updated_at
)
VALUES (
    'e0000000-0000-0000-0000-000000000001'::uuid,
    '24 Bodija Market Road, Ibadan',
    7.4325,
    3.9080,
    'Maternal Emergency',
    'completed',
    'h0000000-0000-0000-0000-000000000001'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    '+234 809 987 6543',
    'high',
    'Patient in active labor. Responder arrived in 9 mins. Safe transfer to maternity intake complete. [PATIENT FEEDBACK: 5★ | Tags: Fast response, Courteous paramedic, Hospital ready | Note: Paramedic Adebayo kept us calm and coordinated with the maternity intake before we arrived. Exceptional life-saving service!]',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO UPDATE SET
    status = 'completed',
    notes = EXCLUDED.notes;

-- 4. HELPER FUNCTION / INSTRUCTIONS TO LINK DEMO STAFF PROFILES
-- Run after creating accounts in Supabase Auth Dashboard -> Users:
--
-- UPDATE public.profiles
-- SET role = 'admin', display_name = 'Demo System Admin'
-- WHERE user_id = '<YOUR_ADMIN_AUTH_UID>';
--
-- UPDATE public.profiles
-- SET role = 'dispatcher', display_name = 'Demo Chief Dispatcher'
-- WHERE user_id = '<YOUR_DISPATCHER_AUTH_UID>';
--
-- UPDATE public.profiles
-- SET role = 'hospital', display_name = 'Dr. Folake (Oyo Central)', hospital_id = 'h0000000-0000-0000-0000-000000000001'::uuid
-- WHERE user_id = '<YOUR_HOSPITAL_AUTH_UID>';
--
-- UPDATE public.profiles
-- SET role = 'driver', display_name = 'Sgt. Adebayo Ogunlesi'
-- WHERE user_id = '<YOUR_DRIVER_AUTH_UID>';
--
-- UPDATE public.drivers
-- SET user_id = '<YOUR_DRIVER_AUTH_UID>'
-- WHERE id = 'd0000000-0000-0000-0000-000000000001'::uuid;
