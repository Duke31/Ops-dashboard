-- ==============================================================================
-- Live Driver GPS Telemetry & Animated Tracking Migration
-- ==============================================================================

-- 1. Add telemetry columns to public.drivers
alter table if exists public.drivers
  add column if not exists current_lat double precision,
  add column if not exists current_lng double precision,
  add column if not exists heading double precision,
  add column if not exists speed double precision,
  add column if not exists last_location_at timestamptz;

-- 2. Create RPC function to update driver location
create or replace function public.update_driver_location(
  p_driver_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_heading double precision default null,
  p_speed double precision default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.drivers
  set
    current_lat = p_lat,
    current_lng = p_lng,
    heading = p_heading,
    speed = p_speed,
    last_location_at = now()
  where id = p_driver_id;
end;
$$;

grant execute on function public.update_driver_location(uuid, double precision, double precision, double precision, double precision) to authenticated, anon;

-- 3. Allow anonymous/public read on active driver location for tracking
drop policy if exists "drivers_public_read_telemetry" on public.drivers;
create policy "drivers_public_read_telemetry"
on public.drivers
for select
to authenticated, anon
using (true);
