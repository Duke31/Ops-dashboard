-- ==============================================================================
-- Function: hospital_list_history
-- Scoped SECURITY DEFINER RPC to list emergency request history for hospital users
-- Strict security: Never open RLS policies with USING (true); role check enforced.
-- ==============================================================================

create or replace function public.hospital_list_history(
  p_hospital_id uuid default null,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_uid uuid;
  v_user_hospital uuid;
  v_target_hospital uuid;
  v_result jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated: session required'
      using errcode = '42501';
  end if;

  v_role := public.current_profile_role();
  if v_role not in ('hospital', 'admin', 'dispatcher') then
    raise exception 'not_allowed: role % cannot access hospital history', v_role
      using errcode = '42501';
  end if;

  -- If caller is hospital role, enforce strictly their own profile hospital_id
  if v_role = 'hospital' then
    select p.hospital_id into v_user_hospital
    from public.profiles p
    where p.user_id = v_uid;

    if v_user_hospital is null then
      raise exception 'hospital_not_assigned: profile has no linked hospital facility'
        using errcode = '42501';
    end if;

    v_target_hospital := v_user_hospital;
  else
    -- Admin or dispatcher can specify a target hospital or fallback to first
    v_target_hospital := coalesce(p_hospital_id, (
      select id from public.hospitals order by name limit 1
    ));
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'patient_address', r.patient_address,
        'origin', r.origin,
        'patient_lat', r.patient_lat,
        'patient_lng', r.patient_lng,
        'emergency_type', r.emergency_type,
        'status', r.status,
        'created_at', r.created_at,
        'hospital_id', r.hospital_id,
        'driver_id', r.driver_id,
        'notes', r.notes,
        'contact_phone', r.contact_phone,
        'patient_age_band', r.patient_age_band,
        'completed_at', r.completed_at,
        'priority', r.priority,
        'tactical_alert', r.tactical_alert,
        'tactical_alert_code', r.tactical_alert_code,
        'tactical_alert_at', r.tactical_alert_at,
        'tactical_alert_ack', r.tactical_alert_ack,
        'dispatcher_response', r.dispatcher_response,
        'dispatcher_response_at', r.dispatcher_response_at,
        'hospital', case when h.id is not null then jsonb_build_object(
          'id', h.id,
          'name', h.name,
          'address', h.address,
          'available_capacity', h.available_capacity
        ) else null end,
        'driver', case when d.id is not null then jsonb_build_object(
          'id', d.id,
          'display_name', d.display_name,
          'vehicle_label', d.vehicle_label,
          'hospital_id', d.hospital_id,
          'active', d.active
        ) else null end
      )
      order by r.created_at desc
    ),
    '[]'::jsonb
  ) into v_result
  from public.emergency_requests r
  left join public.hospitals h on h.id = r.hospital_id
  left join public.drivers d on d.id = r.driver_id
  where r.hospital_id = v_target_hospital
  limit least(greatest(coalesce(p_limit, 100), 1), 200);

  return v_result;
end;
$$;

revoke all on function public.hospital_list_history(uuid, integer) from public;
grant execute on function public.hospital_list_history(uuid, integer) to authenticated;
grant execute on function public.hospital_list_history(uuid, integer) to service_role;
