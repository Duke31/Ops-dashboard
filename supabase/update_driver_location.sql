-- Tier 2 / Item 6: battery + network telemetry on drivers
-- No open policies; uses existing drivers RLS / update_driver_location SECURITY DEFINER.

alter table public.drivers
  add column if not exists battery_level integer
    check (battery_level is null or (battery_level >= 0 and battery_level <= 100));

alter table public.drivers
  add column if not exists is_charging boolean;

alter table public.drivers
  add column if not exists network_type text;

comment on column public.drivers.battery_level is '0-100 from device Battery API when available';
comment on column public.drivers.is_charging is 'Device charging state when Battery API available';
comment on column public.drivers.network_type is 'effectiveType e.g. 4g/3g/2g/wifi or offline';

-- Replace location RPC with optional device vitals (backwards-compatible defaults)
drop function if exists public.update_driver_location(uuid, double precision, double precision, double precision, double precision);
drop function if exists public.update_driver_location(uuid, double precision, double precision, double precision, double precision, integer, boolean, text);

create function public.update_driver_location(
  p_driver_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_heading double precision default null,
  p_speed double precision default null,
  p_battery_level integer default null,
  p_is_charging boolean default null,
  p_network_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_uid uuid;
  v_mine boolean;
  v_battery integer;
begin
  v_role := public.current_profile_role();
  v_uid := auth.uid();

  if v_role != 'driver' then
    raise exception 'not_allowed: only assigned ambulance drivers can publish GPS telemetry'
      using errcode = '42501';
  end if;

  select exists(
    select 1 from public.drivers d
    where d.id = p_driver_id and d.user_id = v_uid
  ) into v_mine;
  if not v_mine then
    raise exception 'not_allowed: can only update your own unit'
      using errcode = '42501';
  end if;

  v_battery := p_battery_level;
  if v_battery is not null then
    if v_battery < 0 then v_battery := 0; end if;
    if v_battery > 100 then v_battery := 100; end if;
  end if;

  update public.drivers
  set
    current_lat = p_lat,
    current_lng = p_lng,
    heading = p_heading,
    speed = p_speed,
    last_location_at = now(),
    battery_level = coalesce(v_battery, battery_level),
    is_charging = coalesce(p_is_charging, is_charging),
    network_type = coalesce(nullif(trim(p_network_type), ''), network_type)
  where id = p_driver_id;

  if not found then
    raise exception 'driver_not_found: %', p_driver_id;
  end if;

  return jsonb_build_object(
    'driver_id', p_driver_id,
    'lat', p_lat,
    'lng', p_lng,
    'battery_level', v_battery,
    'is_charging', p_is_charging,
    'network_type', p_network_type
  );
end;
$$;

revoke all on function public.update_driver_location(uuid, double precision, double precision, double precision, double precision, integer, boolean, text) from public;
grant execute on function public.update_driver_location(uuid, double precision, double precision, double precision, double precision, integer, boolean, text) to authenticated;
grant execute on function public.update_driver_location(uuid, double precision, double precision, double precision, double precision, integer, boolean, text) to service_role;
