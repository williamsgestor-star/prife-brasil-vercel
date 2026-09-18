alter table private.prospector_global_monthly_usage
  add column if not exists google_requests_used integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prospector_global_google_requests_used_check'
      and conrelid = 'private.prospector_global_monthly_usage'::regclass
  ) then
    alter table private.prospector_global_monthly_usage
      add constraint prospector_global_google_requests_used_check
      check (google_requests_used >= 0);
  end if;
end;
$$;

create or replace function public.reserve_google_places_search()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_period date;
  requests_used integer;
begin
  perform private.current_prospector_tenant_id();
  current_period := date_trunc(
    'month',
    timezone('America/Sao_Paulo', now())
  )::date;

  insert into private.prospector_global_monthly_usage (period_start)
  values (current_period)
  on conflict (period_start) do nothing;

  select g.google_requests_used
    into requests_used
    from private.prospector_global_monthly_usage g
   where g.period_start = current_period
   for update;

  if requests_used >= 900 then
    return false;
  end if;

  update private.prospector_global_monthly_usage g
     set google_requests_used = g.google_requests_used + 1,
         updated_at = now()
   where g.period_start = current_period;

  return true;
end;
$$;

revoke all on function public.reserve_google_places_search()
  from public, anon, authenticated;
grant execute on function public.reserve_google_places_search() to authenticated;
