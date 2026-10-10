# Solace EMS — Pitch Competition Live Demo Playbook

This document details the **end-to-end 3 to 5 minute live demo flow** for the Solace Emergency Medical Services platform, designed for pitch competition judges.

---

## 1. Demo Credentials & Setup

Before heading onstage, ensure the 4 staff roles and 1 client test account are ready.

| Role | Target URL | Expected View / Actions |
| :--- | :--- | :--- |
| **Dispatcher** | `/dispatcher` | Live request triage, assign hospital, assign responder unit |
| **Driver / Responder** | `/driver` | Unit navigation console, GPS live streaming, status advancement |
| **Receiving Hospital** | `/hospital` | Active incoming transfers, bed intake readiness, historical facility runs |
| **Admin** | `/admin` | Fleet overview, audit history, star rating review analytics |
| **Patient Client** | Mobile App / APK | One-tap SOS, assigned hospital view, driver Call & WhatsApp, live radar, feedback |

> **Seed Data**: Execute [`supabase/demo_seed_pack.sql`](file:///C:/Users/Hp/.gemini/antigravity/scratch/Ops-dashboard/supabase/demo_seed_pack.sql) in your Supabase SQL editor to automatically create:
> - Partner Facility: `Oyo Central Emergency & Maternity Center`
> - Responder Unit: `Sgt. Adebayo Ogunlesi` (`Ambulance Unit-04 (ALS)` with phone `+234 803 123 4567`)
> - 1 Historic Completed Case with 5-Star patient rating and review note.

---

## 2. 3–5 Minute Live Demo Script (Step-by-Step)

### Phase 1: Patient Request Trigger (0:00 – 1:00)
- **Device**: Android Phone (or Flutter emulator running `Duke31/Client-mobile-app`).
- **Action**:
  1. Open Solace app. Tap the large emergency button (e.g. **Maternal / Obstetric Emergency** or General Medical).
  2. The app captures real GPS coordinates and transmits the SOS to Supabase.
  3. Patient screen transitions to `Active Emergency Mode: Searching for responders...`.
- **Pitch Narrative**:
  > *"In an emergency, every second counts. The patient taps once. Solace captures instant GPS telemetry and registers a prioritized intake on our operations grid without requiring lengthy form-filling."*

---

### Phase 2: Dispatcher Triage & Pairing (1:00 – 2:00)
- **Device**: Laptop (Browser on `/dispatcher`).
- **Action**:
  1. Show the incoming card appearing in real-time under **Active Queue**.
  2. Select **Assign Hospital**: choose `Oyo Central Emergency & Maternity Center`.
  3. Select **Assign Driver**: choose `Ambulance Unit-04 (ALS) - Sgt. Adebayo Ogunlesi`.
- **Pitch Narrative**:
  > *"Our centralized dispatch board immediately flags the call. The dispatcher matches the closest available paramedic unit and pre-selects a verified receiving hospital equipped for this specific emergency."*

---

### Phase 3: Patient Live Transparency & Direct Responder Shortcuts (2:00 – 2:45)
- **Device**: Patient Phone.
- **Action**:
  1. Show the patient app updating automatically via Supabase Realtime:
     - **Assigned Hospital**: Displays `Oyo Central Emergency & Maternity Center`.
     - **Assigned Responder**: Displays `Sgt. Adebayo Ogunlesi` (`Ambulance Unit-04 (ALS)`).
     - **Direct Action Buttons**: Point out the **Call** and **WhatsApp** direct contact shortcuts.
  2. Show live radar / responder tracking map.
- **Pitch Narrative**:
  > *"Notice how the patient's panic is reduced instantly. They see the exact facility they are being transported to, their responder's name, and have one-tap direct WhatsApp and cellular lines to speak with the paramedic in transit."*

---

### Phase 4: Responder Progress & Desk Safety (2:45 – 3:30)
- **Device**: Mobile/Tablet or Laptop on `/driver`.
- **Action**:
  1. Update mission status: `Dispatched` $\rightarrow$ `En Route` $\rightarrow$ `On Scene` $\rightarrow$ `Completed`.
  2. *(Highlight for Judges)*: Explain that `/driver` has client-role enforcement — non-driver staff monitoring the unit cannot overwrite ambulance GPS telemetry from their desktop browser.
- **Pitch Narrative**:
  > *"The driver advances the run state. Realtime synchronization keeps dispatch, the receiving triage desk, and the patient updated simultaneously."*

---

### Phase 5: Mission Completion, Patient Star Feedback & Hospital Intake History (3:30 – 4:30)
- **Device**: Patient Phone + Admin/Hospital Dashboard.
- **Action**:
  1. Patient app transitions to mission completion. Patient submits a **5-star review with remarks** (*"Fast response, kept us updated"*).
  2. Open `/admin/reviews` or `/dispatcher/reviews`: the star rating and qualitative review appear immediately.
  3. Open `/hospital/history`: demonstrates strict multi-tenant filtering — this hospital only views cases transferred to their facility.
- **Pitch Narrative**:
  > *"Accountability doesn't stop when the patient reaches the door. Solace captures immediate patient feedback and ratings to monitor paramedic response quality. Every receiving hospital maintains a compliant, audit-ready intake record."*

---

## 3. Demo Fallback & Venue Safety Rules

1. **Weak Indoor GPS in Pitch Venue**:
   - The patient app allows manual address confirmation if GPS lock is slow indoors.
2. **Wi-Fi / Hotspot**:
   - Keep a dedicated mobile 4G/5G personal hotspot active; do not rely on crowded venue guest Wi-Fi.
3. **No Phantom Claims**:
   - Stick strictly to demonstrated software: GPS dispatch, hospital pairing, direct WhatsApp/Call links, live responder coordinates, post-mission patient reviews, and role-segregated Ops desks.
