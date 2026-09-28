-- Allow drivers (and desk) to persist live GPS for patient tracking.
-- Run in Supabase SQL Editor once.

create or replace function public.update_driver_location(
  p_driver_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_heading double precision default null,
  p_speed double precision default null
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
begin
  v_role := public.current_profile_role();
  v_uid := auth.uid();

  if v_role not in ('driver', 'admin', 'dispatcher') then
    raise exception 'not_allowed: only driver/desk can update location'
      using errcode = '42501';
  end if;

  if v_role = 'driver' then
    select exists(
      select 1 from public.drivers d
      where d.id = p_driver_id and d.user_id = v_uid
    ) into v_mine;
    if not v_mine then
      raise exception 'not_allowed: can only update your own unit'
        using errcode = '42501';
    end if;
  end if;

  update public.drivers
  set
    current_lat = p_lat,
    current_lng = p_lng,
    heading = p_heading,
    speed = p_speed,
    last_location_at = now()
  where id = p_driver_id;

  if not found then
    raise exception 'driver_not_found: %', p_driver_id;
  end if;

  return jsonb_build_object(
    'driver_id', p_driver_id,
    'lat', p_lat,
    'lng', p_lng
  );
end;
$$;

revoke all on function public.update_driver_location(uuid, double precision, double precision, double precision, double precision) from public;
grant execute on function public.update_driver_location(uuid, double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.update_driver_location(uuid, double precision, double precision, double precision, double precision) to service_role;
