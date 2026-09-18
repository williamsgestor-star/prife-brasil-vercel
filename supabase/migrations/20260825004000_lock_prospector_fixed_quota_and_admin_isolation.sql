begin;

update public.tenant_features
set prospector_daily_lead_limit = 20,
    prospector_unlimited = false,
    updated_at = now()
where prospector_daily_lead_limit is distinct from 20
   or prospector_unlimited is distinct from false;

alter table public.tenant_features
  drop constraint if exists tenant_features_prospector_daily_lead_limit_check;
alter table public.tenant_features
  add constraint tenant_features_prospector_daily_lead_limit_check
  check (prospector_daily_lead_limit = 20);

alter table public.tenant_features
  drop constraint if exists tenant_features_prospector_unlimited_check;
alter table public.tenant_features
  add constraint tenant_features_prospector_unlimited_check
  check (prospector_unlimited = false);

alter table public.tenant_features
  alter column prospector_daily_lead_limit set default 20,
  alter column prospector_unlimited set default false;

create or replace function private.get_prospector_daily_quota_impl()
returns table (tenant_id uuid,daily_limit integer,used integer,remaining integer,unlimited boolean,usage_date date)
language plpgsql stable security definer set search_path = ''
as $$
declare resolved_tenant_id uuid; resolved_used integer := 0; current_day date := (now() at time zone 'America/Asuncion')::date;
begin
  resolved_tenant_id := private.current_prospector_tenant_id();
  if private.is_platform_admin() then
    return query select resolved_tenant_id,20,0,null::integer,true,current_day;
    return;
  end if;
  select coalesce(u.leads_used,0) into resolved_used
  from public.tenant_lead_daily_usage u
  where u.tenant_id=resolved_tenant_id and u.usage_date=current_day;
  resolved_used := coalesce(resolved_used,0);
  return query select resolved_tenant_id,20,resolved_used,greatest(20-resolved_used,0),false,current_day;
end;
$$;

create or replace function private.consume_prospector_daily_leads_impl(p_requested_count integer)
returns table (tenant_id uuid,daily_limit integer,used integer,remaining integer,unlimited boolean,usage_date date,consumed integer)
language plpgsql security definer set search_path = ''
as $$
declare resolved_tenant_id uuid; resolved_used integer := 0; allowed_count integer := 0; current_day date := (now() at time zone 'America/Asuncion')::date;
begin
  if p_requested_count is null or p_requested_count < 1 or p_requested_count > 20 then raise exception 'invalid_requested_count'; end if;
  resolved_tenant_id := private.current_prospector_tenant_id();
  if private.is_platform_admin() then
    return query select resolved_tenant_id,20,0,null::integer,true,current_day,p_requested_count;
    return;
  end if;
  insert into public.tenant_lead_daily_usage (tenant_id,usage_date,leads_used,searches_used)
  values (resolved_tenant_id,current_day,0,0)
  on conflict on constraint tenant_lead_daily_usage_pkey do nothing;
  select u.leads_used into resolved_used
  from public.tenant_lead_daily_usage u
  where u.tenant_id=resolved_tenant_id and u.usage_date=current_day for update;
  allowed_count := least(p_requested_count,greatest(20-resolved_used,0));
  update public.tenant_lead_daily_usage u
  set leads_used=u.leads_used+allowed_count,searches_used=u.searches_used+1,updated_at=now()
  where u.tenant_id=resolved_tenant_id and u.usage_date=current_day
  returning u.leads_used into resolved_used;
  return query select resolved_tenant_id,20,resolved_used,greatest(20-resolved_used,0),false,current_day,allowed_count;
end;
$$;

create or replace function private.release_prospector_daily_leads_impl(p_release_count integer)
returns table (tenant_id uuid,daily_limit integer,used integer,remaining integer,unlimited boolean,usage_date date)
language plpgsql security definer set search_path = ''
as $$
declare resolved_tenant_id uuid; resolved_used integer := 0; current_day date := (now() at time zone 'America/Asuncion')::date;
begin
  if p_release_count is null or p_release_count < 0 or p_release_count > 20 then raise exception 'invalid_release_count'; end if;
  resolved_tenant_id := private.current_prospector_tenant_id();
  if private.is_platform_admin() then
    return query select resolved_tenant_id,20,0,null::integer,true,current_day;
    return;
  end if;
  update public.tenant_lead_daily_usage u
  set leads_used=greatest(u.leads_used-p_release_count,0),updated_at=now()
  where u.tenant_id=resolved_tenant_id and u.usage_date=current_day
  returning u.leads_used into resolved_used;
  resolved_used := coalesce(resolved_used,0);
  return query select resolved_tenant_id,20,resolved_used,greatest(20-resolved_used,0),false,current_day;
end;
$$;

create or replace function private.save_prospector_candidates_impl(
  p_provider text,p_query_text text,p_filters jsonb,p_candidates jsonb,p_reserved_count integer
)
returns table (
  id uuid,source_id text,name text,category text,address text,phone text,website text,source_url text,
  provider text,latitude double precision,longitude double precision,distance_km double precision,status text,delivered_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare
  v_tenant_id uuid; v_user_id uuid; v_search_id uuid;
  v_usage_date date := (now() at time zone 'America/Asuncion')::date;
  v_delivered integer := 0; v_release integer := 0; v_is_admin boolean := false;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_reserved_count is null or p_reserved_count < 1 or p_reserved_count > 20 then raise exception 'invalid_reserved_count'; end if;
  if p_candidates is null or jsonb_typeof(p_candidates) <> 'array' then raise exception 'invalid_candidates'; end if;
  v_tenant_id := private.current_prospector_tenant_id();
  v_user_id := auth.uid();
  v_is_admin := private.is_platform_admin();

  insert into public.prospector_searches (tenant_id,requested_by,provider,query_text,filters,requested_count,reserved_count,delivered_count,status)
  values (v_tenant_id,v_user_id,coalesce(nullif(p_provider,''),'unknown'),p_query_text,coalesce(p_filters,'{}'::jsonb),jsonb_array_length(p_candidates),p_reserved_count,0,'processing')
  returning prospector_searches.id into v_search_id;

  return query
  with raw as (
    select e.ord,e.value->>'source_id' source_id,e.value->>'name' name,e.value->>'category' category,
      e.value->>'address' address,e.value->>'phone' phone,e.value->>'website' website,e.value->>'source_url' source_url,
      coalesce(nullif(e.value->>'provider',''),p_provider) provider,
      nullif(e.value->>'latitude','')::double precision latitude,
      nullif(e.value->>'longitude','')::double precision longitude,
      nullif(e.value->>'distance_km','')::double precision distance_km,
      private.prospector_fingerprint(coalesce(nullif(e.value->>'provider',''),p_provider),e.value->>'source_id',e.value->>'name',e.value->>'phone',e.value->>'website',e.value->>'address') fingerprint
    from jsonb_array_elements(p_candidates) with ordinality as e(value,ord)
    where nullif(trim(e.value->>'name'),'') is not null
  ), unique_candidates as (
    select distinct on (r.fingerprint) r.* from raw r order by r.fingerprint,r.ord
  ), fresh as (
    select u.* from unique_candidates u
    where not exists (select 1 from public.prospector_leads x where x.tenant_id=v_tenant_id and x.fingerprint=u.fingerprint)
    order by u.ord limit p_reserved_count
  ), inserted as (
    insert into public.prospector_leads (
      tenant_id,search_id,created_by,fingerprint,provider,provider_lead_id,company_name,category,phone,whatsapp,website,address,
      city,state,country,latitude,longitude,status,source_url,source_payload,delivered_at,created_at,updated_at,stage_updated_at
    )
    select v_tenant_id,v_search_id,v_user_id,f.fingerprint,f.provider,f.source_id,f.name,f.category,f.phone,f.phone,f.website,f.address,
      nullif(p_filters->>'city',''),nullif(p_filters->>'region',''),nullif(p_filters->>'country',''),f.latitude,f.longitude,'new',f.source_url,
      jsonb_build_object('distanceKm',f.distance_km),now(),now(),now(),now()
    from fresh f
    on conflict on constraint prospector_leads_tenant_id_fingerprint_key do nothing
    returning public.prospector_leads.*
  )
  select i.id,i.provider_lead_id,i.company_name,i.category,i.address,i.phone,i.website,i.source_url,i.provider,i.latitude,i.longitude,
    nullif(i.source_payload->>'distanceKm','')::double precision,i.status,i.delivered_at
  from inserted i order by i.delivered_at,i.id;

  get diagnostics v_delivered = row_count;
  v_release := greatest(p_reserved_count-v_delivered,0);
  if v_release > 0 and not v_is_admin then
    update public.tenant_lead_daily_usage u
    set leads_used=greatest(u.leads_used-v_release,0),updated_at=now()
    where u.tenant_id=v_tenant_id and u.usage_date=v_usage_date;
  end if;
  update public.prospector_searches s set delivered_count=v_delivered,status='completed',completed_at=now() where s.id=v_search_id;
  insert into public.prospector_lead_events (tenant_id,lead_id,actor_user_id,event_type,from_stage,to_stage,metadata)
  select v_tenant_id,l.id,v_user_id,'lead_created',null,'new',jsonb_build_object('search_id',v_search_id,'provider',l.provider)
  from public.prospector_leads l where l.search_id=v_search_id;
end;
$$;

commit;
