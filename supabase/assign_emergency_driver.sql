create or replace function public.assign_emergency_driver(
  p_request_id uuid,
  p_driver_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_status text;
  v_active boolean;
begin
  v_role := public.current_profile_role();
  if v_role not in ('admin', 'dispatcher') then
    raise exception 'admin_or_dispatcher_only: cannot assign driver'
      using errcode = '42501';
  end if;

  select r.status into v_status
  from public.emergency_requests r
  where r.id = p_request_id;

  if v_status is null then
    raise exception 'request_not_found: %', p_request_id
      using errcode = 'NO_DATA_FOUND';
  end if;

  if v_status not in ('Requested', 'Matching', 'Hospital confirmed') then
    raise exception 'invalid_status: driver can only be set from Requested, Matching, or Hospital confirmed (was %)',
      v_status
      using errcode = '22023';
  end if;

  select d.active into v_active
  from public.drivers d
  where d.id = p_driver_id;

  if v_active is null then
    raise exception 'driver_not_found: %', p_driver_id
      using errcode = 'NO_DATA_FOUND';
  end if;

  if v_active is not true then
    raise exception 'driver_inactive: activate the driver first'
      using errcode = '22023';
  end if;

  update public.emergency_requests
  set driver_id = p_driver_id
  where id = p_request_id;

  return jsonb_build_object(
    'request_id', p_request_id,
    'driver_id', p_driver_id
  );
end;
$$;

revoke all on function public.assign_emergency_driver(uuid, uuid) from public;
grant execute on function public.assign_emergency_driver(uuid, uuid) to authenticated;
grant execute on function public.assign_emergency_driver(uuid, uuid) to service_role;
