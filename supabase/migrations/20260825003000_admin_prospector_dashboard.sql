begin;

-- Admin searches are unlimited and must not consume any tenant's 20-lead daily quota.
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

  if is_unlimited then
    return query select resolved_tenant_id, 20, 0, null::integer, true, current_day;
    return;
  end if;

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
         greatest(resolved_limit - resolved_used, 0),
         false,
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

  if is_unlimited then
    return query select resolved_tenant_id, 20, 0, null::integer, true, current_day, p_requested_count;
    return;
  end if;

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

  allowed_count := least(p_requested_count, greatest(resolved_limit - resolved_used, 0));

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
         greatest(resolved_limit - resolved_used, 0),
         false,
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

  if is_unlimited then
    return query select resolved_tenant_id, 20, 0, null::integer, true, current_day;
    return;
  end if;

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
         greatest(resolved_limit - resolved_used, 0),
         false,
         current_day;
end;
$$;

create or replace function private.admin_get_prospector_dashboard_impl()
returns jsonb
language plpgsql
stable security definer
set search_path = ''
as $$
declare
  current_day date := (now() at time zone 'America/Asuncion')::date;
  day_start timestamptz := (current_day::timestamp at time zone 'America/Asuncion');
  day_end timestamptz := ((current_day + 1)::timestamp at time zone 'America/Asuncion');
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not private.is_platform_admin() then
    raise exception 'admin_required';
  end if;

  with tenant_base as (
    select
      t.id,
      t.slug,
      t.display_name,
      t.status,
      coalesce(tf.prospector_enabled, true) as prospector_enabled,
      20::integer as daily_limit,
      coalesce(u.leads_used, 0)::integer as leads_used,
      coalesce(u.searches_used, 0)::integer as searches_used
    from public.tenants t
    left join public.tenant_features tf on tf.tenant_id = t.id
    left join public.tenant_lead_daily_usage u
      on u.tenant_id = t.id and u.usage_date = current_day
  ), lead_stats as (
    select
      l.tenant_id,
      count(*)::integer as total_leads,
      count(*) filter (where l.delivered_at >= day_start and l.delivered_at < day_end)::integer as leads_today,
      count(*) filter (where l.status = 'new')::integer as stage_new,
      count(*) filter (where l.status = 'whatsapp')::integer as stage_whatsapp,
      count(*) filter (where l.status = 'contacted')::integer as stage_contacted,
      count(*) filter (where l.status = 'interested')::integer as stage_interested,
      count(*) filter (where l.status = 'meeting')::integer as stage_meeting,
      count(*) filter (where l.status = 'proposal')::integer as stage_proposal,
      count(*) filter (where l.status = 'client')::integer as stage_client,
      count(*) filter (where l.whatsapp_at >= day_start and l.whatsapp_at < day_end)::integer as whatsapp_today,
      count(*) filter (where l.contacted_at >= day_start and l.contacted_at < day_end)::integer as contacted_today,
      count(*) filter (where l.interested_at >= day_start and l.interested_at < day_end)::integer as interested_today,
      count(*) filter (where l.meeting_at >= day_start and l.meeting_at < day_end)::integer as meeting_today,
      count(*) filter (where l.proposal_at >= day_start and l.proposal_at < day_end)::integer as proposal_today,
      count(*) filter (where l.client_at >= day_start and l.client_at < day_end)::integer as clients_today,
      max(l.updated_at) as last_activity
    from public.prospector_leads l
    group by l.tenant_id
  ), tenant_rows as (
    select
      tb.*,
      coalesce(ls.total_leads, 0) as total_leads,
      coalesce(ls.leads_today, 0) as leads_today,
      coalesce(ls.stage_new, 0) as stage_new,
      coalesce(ls.stage_whatsapp, 0) as stage_whatsapp,
      coalesce(ls.stage_contacted, 0) as stage_contacted,
      coalesce(ls.stage_interested, 0) as stage_interested,
      coalesce(ls.stage_meeting, 0) as stage_meeting,
      coalesce(ls.stage_proposal, 0) as stage_proposal,
      coalesce(ls.stage_client, 0) as stage_client,
      coalesce(ls.whatsapp_today, 0) as whatsapp_today,
      coalesce(ls.contacted_today, 0) as contacted_today,
      coalesce(ls.interested_today, 0) as interested_today,
      coalesce(ls.meeting_today, 0) as meeting_today,
      coalesce(ls.proposal_today, 0) as proposal_today,
      coalesce(ls.clients_today, 0) as clients_today,
      ls.last_activity,
      case when coalesce(ls.total_leads,0) > 0
        then round((coalesce(ls.stage_client,0)::numeric / ls.total_leads::numeric) * 100, 1)
        else 0 end as conversion_rate
    from tenant_base tb
    left join lead_stats ls on ls.tenant_id = tb.id
  ), summary as (
    select jsonb_build_object(
      'subdomains', count(*)::integer,
      'active_subdomains', count(*) filter (where status = 'active')::integer,
      'prospector_active', count(*) filter (where status = 'active' and prospector_enabled)::integer,
      'daily_capacity', (count(*) filter (where status = 'active' and prospector_enabled) * 20)::integer,
      'quota_used_today', coalesce(sum(leads_used),0)::integer,
      'leads_today', coalesce(sum(leads_today),0)::integer,
      'stored_leads', coalesce(sum(total_leads),0)::integer,
      'whatsapp_today', coalesce(sum(whatsapp_today),0)::integer,
      'contacted_today', coalesce(sum(contacted_today),0)::integer,
      'interested_today', coalesce(sum(interested_today),0)::integer,
      'meeting_today', coalesce(sum(meeting_today),0)::integer,
      'proposal_today', coalesce(sum(proposal_today),0)::integer,
      'clients_today', coalesce(sum(clients_today),0)::integer,
      'searches_today', coalesce((select count(*) from public.prospector_searches s where s.created_at >= day_start and s.created_at < day_end),0)::integer
    ) value
    from tenant_rows
  ), funnel as (
    select jsonb_build_object(
      'new', coalesce(sum(stage_new),0)::integer,
      'whatsapp', coalesce(sum(stage_whatsapp),0)::integer,
      'contacted', coalesce(sum(stage_contacted),0)::integer,
      'interested', coalesce(sum(stage_interested),0)::integer,
      'meeting', coalesce(sum(stage_meeting),0)::integer,
      'proposal', coalesce(sum(stage_proposal),0)::integer,
      'client', coalesce(sum(stage_client),0)::integer
    ) value
    from tenant_rows
  ), tenants_json as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'slug', slug,
        'display_name', display_name,
        'status', status,
        'prospector_enabled', prospector_enabled,
        'daily_limit', daily_limit,
        'leads_used', leads_used,
        'searches_used', searches_used,
        'leads_today', leads_today,
        'total_leads', total_leads,
        'conversion_rate', conversion_rate,
        'last_activity', last_activity,
        'today', jsonb_build_object(
          'whatsapp', whatsapp_today,
          'contacted', contacted_today,
          'interested', interested_today,
          'meeting', meeting_today,
          'proposal', proposal_today,
          'client', clients_today
        ),
        'funnel', jsonb_build_object(
          'new', stage_new,
          'whatsapp', stage_whatsapp,
          'contacted', stage_contacted,
          'interested', stage_interested,
          'meeting', stage_meeting,
          'proposal', stage_proposal,
          'client', stage_client
        )
      ) order by leads_today desc, total_leads desc, display_name
    ), '[]'::jsonb) value
    from tenant_rows
  ), recent_json as (
    select coalesce(jsonb_agg(x.item order by x.sort_at desc), '[]'::jsonb) value
    from (
      select jsonb_build_object(
        'id', l.id,
        'tenant_slug', t.slug,
        'tenant_name', t.display_name,
        'company_name', l.company_name,
        'category', l.category,
        'city', l.city,
        'state', l.state,
        'status', l.status,
        'delivered_at', l.delivered_at,
        'stage_updated_at', l.stage_updated_at
      ) item,
      greatest(l.stage_updated_at, l.delivered_at) sort_at
      from public.prospector_leads l
      join public.tenants t on t.id = l.tenant_id
      order by greatest(l.stage_updated_at, l.delivered_at) desc
      limit 10
    ) x
  )
  select jsonb_build_object(
    'date', current_day,
    'summary', summary.value,
    'funnel', funnel.value,
    'tenants', tenants_json.value,
    'recent', recent_json.value
  ) into result
  from summary, funnel, tenants_json, recent_json;

  return result;
end;
$$;

create or replace function public.admin_get_prospector_dashboard()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select private.admin_get_prospector_dashboard_impl();
$$;

revoke all on function public.admin_get_prospector_dashboard() from public, anon;
grant execute on function public.admin_get_prospector_dashboard() to authenticated, service_role;

commit;
