create or replace function public.admin_finish_staff_role(
  p_user_id uuid,
  p_role text,
  p_hospital_id uuid default null,
  p_display_name text default null,
  p_vehicle_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() is distinct from 'admin'
     and coalesce(current_setting('request.jwt.claim.role', true), '')
         is distinct from 'service_role'
     and current_user is distinct from 'service_role'
  then
    raise exception 'admin_only: cannot assign roles'
      using errcode = '42501';
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);

  perform public.assign_profile_role(
    p_user_id := p_user_id,
    p_role := p_role,
    p_hospital_id := p_hospital_id,
    p_display_name := p_display_name,
    p_vehicle_label := p_vehicle_label
  );

  return jsonb_build_object('user_id', p_user_id, 'role', p_role);
end;
$$;

revoke all on function public.admin_finish_staff_role(uuid, text, uuid, text, text) from public;
grant execute on function public.admin_finish_staff_role(uuid, text, uuid, text, text) to authenticated;
grant execute on function public.admin_finish_staff_role(uuid, text, uuid, text, text) to service_role;
