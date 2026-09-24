-- Optional columns the Ops Dashboard expects.
-- Safe to run if they already exist.

alter table if exists public.hospitals
  add column if not exists available_capacity integer;

alter table if exists public.emergency_requests
  add column if not exists driver_name text;

alter table if exists public.emergency_requests
  add column if not exists driver_phone text;

alter table if exists public.emergency_requests
  add column if not exists completed_at timestamptz;

-- Keep completed_at in sync when a request is marked Completed.
create or replace function public.touch_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'Completed' and (old.status is distinct from 'Completed') then
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists emergency_requests_touch_completed_at on public.emergency_requests;
create trigger emergency_requests_touch_completed_at
before update on public.emergency_requests
for each row execute function public.touch_completed_at();
