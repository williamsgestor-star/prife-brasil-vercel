begin;

alter table public.tenant_features
  add column if not exists prospector_daily_lead_limit integer not null default 20,
  add column if not exists prospector_unlimited boolean not null default false;

alter table public.tenant_features
  drop constraint if exists tenant_features_prospector_daily_lead_limit_check;
alter table public.tenant_features
  add constraint tenant_features_prospector_daily_lead_limit_check
  check (prospector_daily_lead_limit >= 1 and prospector_daily_lead_limit <= 100000);

update public.tenant_features
set prospector_daily_lead_limit = 20,
    prospector_unlimited = false;

create table if not exists public.tenant_lead_daily_usage (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  usage_date date not null default ((now() at time zone 'America/Asuncion')::date),
  leads_used integer not null default 0 check (leads_used >= 0),
  searches_used integer not null default 0 check (searches_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, usage_date)
);

alter table public.tenant_lead_daily_usage enable row level security;
revoke all on table public.tenant_lead_daily_usage from anon, authenticated;
grant select on table public.tenant_lead_daily_usage to authenticated;

drop policy if exists tenant_lead_daily_usage_select_authorized on public.tenant_lead_daily_usage;
create policy tenant_lead_daily_usage_select_authorized
on public.tenant_lead_daily_usage for select
to authenticated
using ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)));

create or replace function private.get_prospector_daily_quota_impl()
returns table (
  tenant_id uuid,
  daily_limit integer,
  used integer,
  remaining integer,
  unlimited boolean,
  usage_date date
)
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  resolved_tenant_id uuid;
  resolved_limit integer := 20;
  resolved_used integer := 0;
  is_unlimited boolean := false;
  current_day date := (now() at time zone 'America/Asuncion')::date;
begin
  resolved_tenant_id := private.current_prospector_tenant_id();
  is_unlimited := private.is_platform_admin();

  select coalesce(tf.prospector_daily_lead_limit, 20)
    into resolved_limit
  from public.tenant_features tf
  where tf.tenant_id = resolved_tenant_id;
  if not found then resolved_limit := 20; end if;

  select coalesce(u.leads_used, 0)
    into resolved_used
  from public.tenant_lead_daily_usage u
  where u.tenant_id = resolved_tenant_id
    and u.usage_date = current_day;
  resolved_used := coalesce(resolved_used, 0);

  return query
  select resolved_tenant_id,
         resolved_limit,
         resolved_used,
         case when is_unlimited then null else greatest(resolved_limit - resolved_used, 0) end,
         is_unlimited,
         current_day;
end;
$$;

create or replace function private.consume_prospector_daily_leads_impl(p_requested_count integer)
returns table (
  tenant_id uuid,
  daily_limit integer,
  used integer,
  remaining integer,
  unlimited boolean,
  usage_date date,
  consumed integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_tenant_id uuid;
  resolved_limit integer := 20;
  resolved_used integer := 0;
  is_unlimited boolean := false;
  allowed_count integer := 0;
  current_day date := (now() at time zone 'America/Asuncion')::date;
begin
  if p_requested_count is null or p_requested_count < 1 or p_requested_count > 20 then
    raise exception 'invalid_requested_count';
  end if;

  resolved_tenant_id := private.current_prospector_tenant_id();
  is_unlimited := private.is_platform_admin();

  select coalesce(tf.prospector_daily_lead_limit, 20)
    into resolved_limit
  from public.tenant_features tf
  where tf.tenant_id = resolved_tenant_id;
  if not found then resolved_limit := 20; end if;

  insert into public.tenant_lead_daily_usage (tenant_id, usage_date, leads_used, searches_used)
  values (resolved_tenant_id, current_day, 0, 0)
  on conflict on constraint tenant_lead_daily_usage_pkey do nothing;

  select u.leads_used
    into resolved_used
  from public.tenant_lead_daily_usage u
  where u.tenant_id = resolved_tenant_id
    and u.usage_date = current_day
  for update;

  if is_unlimited then
    allowed_count := p_requested_count;
  else
    allowed_count := least(p_requested_count, greatest(resolved_limit - resolved_used, 0));
  end if;

  update public.tenant_lead_daily_usage u
  set leads_used = u.leads_used + allowed_count,
      searches_used = u.searches_used + 1,
      updated_at = now()
  where u.tenant_id = resolved_tenant_id
    and u.usage_date = current_day
  returning u.leads_used into resolved_used;

  return query
  select resolved_tenant_id,
         resolved_limit,
         resolved_used,
         case when is_unlimited then null else greatest(resolved_limit - resolved_used, 0) end,
         is_unlimited,
         current_day,
         allowed_count;
end;
$$;

create or replace function private.release_prospector_daily_leads_impl(p_release_count integer)
returns table (
  tenant_id uuid,
  daily_limit integer,
  used integer,
  remaining integer,
  unlimited boolean,
  usage_date date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_tenant_id uuid;
  resolved_limit integer := 20;
  resolved_used integer := 0;
  is_unlimited boolean := false;
  current_day date := (now() at time zone 'America/Asuncion')::date;
begin
  if p_release_count is null or p_release_count < 0 or p_release_count > 20 then
    raise exception 'invalid_release_count';
  end if;

  resolved_tenant_id := private.current_prospector_tenant_id();
  is_unlimited := private.is_platform_admin();

  select coalesce(tf.prospector_daily_lead_limit, 20)
    into resolved_limit
  from public.tenant_features tf
  where tf.tenant_id = resolved_tenant_id;
  if not found then resolved_limit := 20; end if;

  update public.tenant_lead_daily_usage u
  set leads_used = greatest(u.leads_used - p_release_count, 0),
      updated_at = now()
  where u.tenant_id = resolved_tenant_id
    and u.usage_date = current_day
  returning u.leads_used into resolved_used;

  resolved_used := coalesce(resolved_used, 0);

  return query
  select resolved_tenant_id,
         resolved_limit,
         resolved_used,
         case when is_unlimited then null else greatest(resolved_limit - resolved_used, 0) end,
         is_unlimited,
         current_day;
end;
$$;

create or replace function public.get_prospector_daily_quota()
returns table (tenant_id uuid,daily_limit integer,used integer,remaining integer,unlimited boolean,usage_date date)
language sql stable set search_path = ''
as $$ select * from private.get_prospector_daily_quota_impl(); $$;

create or replace function public.consume_prospector_daily_leads(p_requested_count integer)
returns table (tenant_id uuid,daily_limit integer,used integer,remaining integer,unlimited boolean,usage_date date,consumed integer)
language sql set search_path = ''
as $$ select * from private.consume_prospector_daily_leads_impl(p_requested_count); $$;

create or replace function public.release_prospector_daily_leads(p_release_count integer)
returns table (tenant_id uuid,daily_limit integer,used integer,remaining integer,unlimited boolean,usage_date date)
language sql set search_path = ''
as $$ select * from private.release_prospector_daily_leads_impl(p_release_count); $$;

revoke all on function public.get_prospector_daily_quota() from public, anon;
revoke all on function public.consume_prospector_daily_leads(integer) from public, anon;
revoke all on function public.release_prospector_daily_leads(integer) from public, anon;
grant execute on function public.get_prospector_daily_quota() to authenticated, service_role;
grant execute on function public.consume_prospector_daily_leads(integer) to authenticated, service_role;
grant execute on function public.release_prospector_daily_leads(integer) to authenticated, service_role;

commit;
