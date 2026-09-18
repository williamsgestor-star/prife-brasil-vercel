create or replace function public.consume_prospector_leads(p_requested_count integer)
returns table (
  tenant_id uuid,
  monthly_limit integer,
  used integer,
  remaining integer,
  global_limit integer,
  global_used integer,
  global_remaining integer,
  period_start date,
  consumed integer
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  resolved_tenant_id uuid;
  current_period date;
  resolved_limit integer;
  resolved_used integer;
  resolved_global_used integer;
  allowed_count integer;
begin
  if p_requested_count is null or p_requested_count < 0 or p_requested_count > 20 then
    raise exception 'invalid_requested_count';
  end if;

  resolved_tenant_id := private.current_prospector_tenant_id();
  current_period := date_trunc(
    'month',
    timezone('America/Sao_Paulo', now())
  )::date;

  select coalesce(tf.prospector_monthly_lead_limit, 100)
    into resolved_limit
    from public.tenant_features tf
   where tf.tenant_id = resolved_tenant_id;
  resolved_limit := coalesce(resolved_limit, 100);

  insert into private.prospector_global_monthly_usage (period_start)
  values (current_period)
  on conflict on constraint prospector_global_monthly_usage_pkey do nothing;

  select g.leads_used
    into resolved_global_used
    from private.prospector_global_monthly_usage g
   where g.period_start = current_period
   for update;

  insert into public.tenant_lead_monthly_usage (tenant_id, period_start)
  values (resolved_tenant_id, current_period)
  on conflict on constraint tenant_lead_monthly_usage_pkey do nothing;

  select u.leads_used
    into resolved_used
    from public.tenant_lead_monthly_usage u
   where u.tenant_id = resolved_tenant_id
     and u.period_start = current_period
   for update;

  allowed_count := least(
    p_requested_count,
    greatest(0, resolved_limit - resolved_used),
    greatest(0, 5000 - resolved_global_used)
  );

  update private.prospector_global_monthly_usage g
     set leads_used = g.leads_used + allowed_count,
         searches_used = g.searches_used + 1,
         updated_at = now()
   where g.period_start = current_period;

  update public.tenant_lead_monthly_usage u
     set leads_used = u.leads_used + allowed_count,
         searches_used = u.searches_used + 1,
         updated_at = now()
   where u.tenant_id = resolved_tenant_id
     and u.period_start = current_period;

  resolved_used := resolved_used + allowed_count;
  resolved_global_used := resolved_global_used + allowed_count;

  return query
  select
    resolved_tenant_id,
    resolved_limit,
    resolved_used,
    greatest(0, resolved_limit - resolved_used),
    5000,
    resolved_global_used,
    greatest(0, 5000 - resolved_global_used),
    current_period,
    allowed_count;
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
  on conflict on constraint prospector_global_monthly_usage_pkey do nothing;

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

revoke all on function public.consume_prospector_leads(integer)
  from public, anon, authenticated;
revoke all on function public.reserve_google_places_search()
  from public, anon, authenticated;
grant execute on function public.consume_prospector_leads(integer) to authenticated;
grant execute on function public.reserve_google_places_search() to authenticated;
