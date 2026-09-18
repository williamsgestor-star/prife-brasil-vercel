-- Site availability is controlled manually. Dates are informational only.
create schema if not exists billing_internal;
revoke all on schema billing_internal from public;
grant usage on schema billing_internal to anon, authenticated;

create table public.tenant_site_subscriptions (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  enabled boolean not null default true,
  started_at timestamptz,
  expires_at timestamptz,
  last_paid_at timestamptz,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  check ((started_at is null and expires_at is null) or (started_at is not null and expires_at > started_at))
);
alter table public.tenant_site_subscriptions enable row level security;
revoke all on public.tenant_site_subscriptions from public, anon, authenticated;
grant select on public.tenant_site_subscriptions to authenticated;
create policy subscription_admin_read on public.tenant_site_subscriptions for select to authenticated
  using ((select auth.uid()) is not null and (select private.is_platform_admin()));

create table public.tenant_site_subscription_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid not null,
  action text not null,
  previous_expires_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.tenant_site_subscription_events enable row level security;
revoke all on public.tenant_site_subscription_events from public, anon, authenticated;
grant select on public.tenant_site_subscription_events to authenticated;
create policy subscription_events_admin_read on public.tenant_site_subscription_events for select to authenticated
  using ((select auth.uid()) is not null and (select private.is_platform_admin()));
create index subscription_events_tenant on public.tenant_site_subscription_events(tenant_id, created_at desc);

-- Deliberately public boolean only. Dates, payments and owner data stay private.
create function billing_internal.site_is_available(p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.tenants t
    left join public.tenant_site_subscriptions s on s.tenant_id=t.id
    where t.slug=lower(trim(p_slug)) and t.status='active'
      and coalesce(s.enabled,true)
  );
$$;
revoke all on function billing_internal.site_is_available(text) from public;
grant execute on function billing_internal.site_is_available(text) to anon, authenticated;
create function public.get_site_availability(p_slug text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select billing_internal.site_is_available(p_slug);
$$;
revoke all on function public.get_site_availability(text) from public;
grant execute on function public.get_site_availability(text) to anon, authenticated;

create function billing_internal.manage_site_subscription(
  p_tenant_id uuid, p_action text, p_start date, p_enabled boolean, p_expected_version bigint
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.tenant_site_subscriptions%rowtype;
  previous_expiry timestamptz;
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'admin_access_required' using errcode='42501';
  end if;
  -- Lock the tenant even before its first subscription exists.
  perform 1 from public.tenants where id=p_tenant_id for update;
  if not found then raise exception 'tenant_not_found'; end if;
  select * into s from public.tenant_site_subscriptions where tenant_id=p_tenant_id;
  if coalesce(s.version,0) is distinct from p_expected_version then
    raise exception 'subscription_changed_reload' using errcode='40001';
  end if;
  previous_expiry:=s.expires_at;
  s.tenant_id:=p_tenant_id;
  s.enabled:=coalesce(s.enabled,true);
  if p_action='start' then
    if p_start is null then raise exception 'start_date_required'; end if;
    s.started_at:=p_start::timestamp at time zone 'America/Sao_Paulo';
    s.expires_at:=s.started_at + interval '30 days';
  elsif p_action='toggle' then
    if p_enabled is null then raise exception 'enabled_required'; end if;
    s.enabled:=p_enabled;
  elsif p_action='payment' then
    s.started_at:=coalesce(s.started_at,now());
    if s.started_at > now() then s.started_at:=now(); end if;
    s.expires_at:=greatest(coalesce(s.expires_at,now()),now()) + interval '30 days';
    s.last_paid_at:=now();
  else
    raise exception 'invalid_action';
  end if;
  s.version:=coalesce(s.version,0)+1;
  s.updated_at:=now();
  insert into public.tenant_site_subscriptions values(s.*)
  on conflict(tenant_id) do update set
    enabled=excluded.enabled,started_at=excluded.started_at,expires_at=excluded.expires_at,
    last_paid_at=excluded.last_paid_at,version=excluded.version,updated_at=excluded.updated_at;
  insert into public.tenant_site_subscription_events(tenant_id,actor_id,action,previous_expires_at,expires_at)
    values(p_tenant_id,auth.uid(),p_action,previous_expiry,s.expires_at);
  return to_jsonb(s);
end;
$$;
revoke all on function billing_internal.manage_site_subscription(uuid,text,date,boolean,bigint) from public,anon;
grant execute on function billing_internal.manage_site_subscription(uuid,text,date,boolean,bigint) to authenticated;
create function public.manage_site_subscription(
  p_tenant_id uuid, p_action text, p_start date, p_enabled boolean, p_expected_version bigint
) returns jsonb language sql security invoker set search_path = '' as $$
  select billing_internal.manage_site_subscription(p_tenant_id,p_action,p_start,p_enabled,p_expected_version);
$$;
revoke all on function public.manage_site_subscription(uuid,text,date,boolean,bigint) from public,anon;
grant execute on function public.manage_site_subscription(uuid,text,date,boolean,bigint) to authenticated;
