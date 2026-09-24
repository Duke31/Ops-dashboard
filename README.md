# Ops Dashboard

Operations console for an emergency healthcare dispatch platform.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- `@supabase/supabase-js` + `@supabase/ssr` (cookie session)

## Setup

1. Copy `.env.local.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Do **not** put the service role key in any `NEXT_PUBLIC_` variable.
3. Apply `supabase/migrations/20260924_ops_dashboard_addons.sql` if those columns are missing.
4. `npm install && npm run dev`

## Assumed schema

The UI reads these objects. Adjust `lib/types.ts` / queries if your names differ.

- `profiles`: `id`, `role` (`dispatcher` | `hospital` | `admin`), `hospital_id`, `full_name`, `email`
- `hospitals`: `id`, `name`, `address`, `phone`, `available_capacity`
- `emergency_requests`: `id`, `patient_location`, `emergency_type`, `status`, `created_at`, `hospital_id`, `driver_name`, `driver_phone`, `notes`, `completed_at`
- `emergency_transition_rules`: `from_status`, `to_status`, `actor_role`
- RPC `transition_emergency_state(p_request_id, p_new_status, p_actor_role)`

If your RPC uses different argument names, edit `components/RequestBoard.tsx` and `components/HospitalCards.tsx`.

## Auth routing

Middleware loads the session, reads `profiles.role`, and:

- sends anonymous users to `/login`
- sends signed-in users on `/login` to `/{role}`
- redirects role mismatches to that user’s home (`admin` may open all three areas)

## Staff creation (blocked on purpose)

Role must not be written from the browser. The Manage Staff screen lists accounts only.

Proposed privileged path (needs your confirmation before implementation):

- Next.js server action **or** Supabase Edge Function
- Service role key on the server only
- `auth.admin.createUser` then set `profiles.role` / `hospital_id`

## Out of scope

Driver app, maps, and live GPS are not in this step.
