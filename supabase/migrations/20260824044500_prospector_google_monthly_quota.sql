alter table public.tenant_features
  add column if not exists prospector_monthly_lead_limit integer not null default 100;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tenant_features_prospector_monthly_lead_limit_check'
      and conrelid = 'public.tenant_features'::regclass
  ) then
    alter table public.tenant_features
      add constraint tenant_features_prospector_monthly_lead_limit_check
      check (prospector_monthly_lead_limit between 1 and 1000);
  end if;
end;
$$;

create table if not exists public.tenant_lead_monthly_usage (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_start date not null,
  leads_used integer not null default 0 check (leads_used >= 0),
  searches_used integer not null default 0 check (searches_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, period_start)
);

create table if not exists private.prospector_global_monthly_usage (
  period_start date primary key,
  leads_used integer not null default 0 check (leads_used >= 0),
  searches_used integer not null default 0 check (searches_used >= 0),
  updated_at timestamptz not null default now()
);

alter table public.tenant_lead_monthly_usage enable row level security;
alter table private.prospector_global_monthly_usage enable row level security;

revoke all on public.tenant_lead_monthly_usage from public, anon, authenticated;
revoke all on private.prospector_global_monthly_usage from public, anon, authenticated;
grant select on public.tenant_lead_monthly_usage to authenticated;

drop policy if exists tenant_lead_monthly_usage_select_managed
  on public.tenant_lead_monthly_usage;
create policy tenant_lead_monthly_usage_select_managed
  on public.tenant_lead_monthly_usage
  for select
  to authenticated
  using (
    (select private.is_platform_admin())
    or (select private.is_tenant_member(tenant_id))
  );

create or replace function private.current_prospector_tenant_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_tenant_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select p.tenant_id
    into resolved_tenant_id
    from public.profiles p
   where p.id = auth.uid()
     and p.tenant_id is not null
     and (
       p.approval_status = 'approved'
       or private.is_platform_admin()
     );

  if resolved_tenant_id is null and private.is_platform_admin() then
    select t.id
      into resolved_tenant_id
      from public.tenants t
     where t.status = 'active'
     order by (t.owner_user_id = auth.uid()) desc, t.created_at, t.id
     limit 1;
  end if;

  if resolved_tenant_id is null then
    raise exception 'tenant_required';
  end if;

  if not private.is_platform_admin()
     and not private.is_tenant_member(resolved_tenant_id) then
    raise exception 'tenant_access_denied';
  end if;

  return resolved_tenant_id;
end;
$$;

revoke all on function private.current_prospector_tenant_id()
  from public, anon, authenticated;

create or replace function public.get_prospector_quota()
returns table (
  tenant_id uuid,
  monthly_limit integer,
  used integer,
  remaining integer,
  global_limit integer,
  global_used integer,
  global_remaining integer,
  period_start date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_tenant_id uuid;
  current_period date;
  resolved_limit integer;
  resolved_used integer;
  resolved_global_used integer;
begin
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

  select coalesce(u.leads_used, 0)
    into resolved_used
    from public.tenant_lead_monthly_usage u
   where u.tenant_id = resolved_tenant_id
     and u.period_start = current_period;
  resolved_used := coalesce(resolved_used, 0);

  select coalesce(g.leads_used, 0)
    into resolved_global_used
    from private.prospector_global_monthly_usage g
   where g.period_start = current_period;
  resolved_global_used := coalesce(resolved_global_used, 0);

  return query
  select
    resolved_tenant_id,
    resolved_limit,
    resolved_used,
    greatest(0, resolved_limit - resolved_used),
    5000,
    resolved_global_used,
    greatest(0, 5000 - resolved_global_used),
    current_period;
end;
$$;

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
  on conflict (period_start) do nothing;

  select g.leads_used
    into resolved_global_used
    from private.prospector_global_monthly_usage g
   where g.period_start = current_period
   for update;

  insert into public.tenant_lead_monthly_usage (tenant_id, period_start)
  values (resolved_tenant_id, current_period)
  on conflict (tenant_id, period_start) do nothing;

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

revoke all on function public.get_prospector_quota()
  from public, anon, authenticated;
revoke all on function public.consume_prospector_leads(integer)
  from public, anon, authenticated;
grant execute on function public.get_prospector_quota() to authenticated;
grant execute on function public.consume_prospector_leads(integer) to authenticated;
