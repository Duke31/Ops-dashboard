-- Returns only active emergency_requests assigned to the caller's drivers row.
-- Run in Supabase SQL Editor. Prefer this over relying on table SELECT + app filter.

create or replace function public.driver_my_active_requests()
returns setof public.emergency_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_driver_id uuid;
begin
  v_role := public.current_profile_role();

  if v_role is distinct from 'driver'
     and v_role is distinct from 'admin'
     and v_role is distinct from 'dispatcher'
  then
    raise exception 'driver_or_desk_only: cannot list driver jobs'
      using errcode = '42501';
  end if;

  if v_role = 'driver' then
    select d.id into v_driver_id
    from public.drivers d
    where d.user_id = auth.uid()
    limit 1;

    if v_driver_id is null then
      return;
    end if;

    return query
    select r.*
    from public.emergency_requests r
    where r.driver_id = v_driver_id
      and r.status is distinct from 'Completed'
      and r.status is distinct from 'Cancelled / failed'
    order by r.created_at desc;
  else
    -- admin/dispatcher: empty from this RPC; they use desk queues
    return;
  end if;
end;
$$;

revoke all on function public.driver_my_active_requests() from public;
grant execute on function public.driver_my_active_requests() to authenticated;
grant execute on function public.driver_my_active_requests() to service_role;
