create or replace function public.admin_list_hospitals()
returns table (
  id uuid,
  name text,
  address text,
  lat numeric,
  lng numeric,
  intake_phone text,
  available_capacity integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() is distinct from 'admin' then
    raise exception 'admin_only: current profile cannot list hospitals'
      using errcode = '42501';
  end if;

  return query
  select
    h.id,
    h.name,
    h.address,
    h.lat,
    h.lng,
    h.intake_phone,
    h.available_capacity,
    h.created_at
  from public.hospitals h
  order by h.name;
end;
$$;

revoke all on function public.admin_list_hospitals() from public;
grant execute on function public.admin_list_hospitals() to authenticated;
grant execute on function public.admin_list_hospitals() to service_role;
