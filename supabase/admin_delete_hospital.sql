create or replace function public.admin_delete_hospital(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n_req int;
  n_prof int;
  n_drv int;
begin
  if public.current_profile_role() is distinct from 'admin' then
    raise exception 'admin_only: current profile cannot delete hospitals'
      using errcode = '42501';
  end if;

  if p_id is null then
    raise exception 'hospital_required: p_id is null'
      using errcode = '22004';
  end if;

  if not exists (select 1 from public.hospitals h where h.id = p_id) then
    raise exception 'hospital_not_found: %', p_id
      using errcode = 'NO_DATA_FOUND';
  end if;

  select count(*) into n_req
  from public.emergency_requests r
  where r.hospital_id = p_id;

  select count(*) into n_prof
  from public.profiles p
  where p.hospital_id = p_id;

  select count(*) into n_drv
  from public.drivers d
  where d.hospital_id = p_id;

  if n_req > 0 or n_prof > 0 or n_drv > 0 then
    raise exception
      'hospital_in_use: % request(s), % profile(s), % driver(s) still reference this hospital',
      n_req, n_prof, n_drv
      using errcode = '23503';
  end if;

  delete from public.hospitals h where h.id = p_id;
end;
$$;

revoke all on function public.admin_delete_hospital(uuid) from public;
grant execute on function public.admin_delete_hospital(uuid) to authenticated;
grant execute on function public.admin_delete_hospital(uuid) to service_role;
