begin;

create table if not exists public.prospector_searches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  provider text not null default 'pending',
  query_text text,
  filters jsonb not null default '{}'::jsonb,
  requested_count integer not null default 0 check (requested_count >= 0),
  reserved_count integer not null default 0 check (reserved_count >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  status text not null default 'created',
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.prospector_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  search_id uuid references public.prospector_searches(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  fingerprint text not null,
  provider text not null,
  provider_lead_id text,
  company_name text not null,
  cnpj text,
  category text,
  cnae text,
  phone text,
  whatsapp text,
  email text,
  website text,
  address text,
  city text,
  state text,
  country text,
  latitude double precision,
  longitude double precision,
  status text not null default 'new',
  source_url text,
  source_payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stage_updated_at timestamptz not null default now(),
  whatsapp_at timestamptz,
  contacted_at timestamptz,
  interested_at timestamptz,
  meeting_at timestamptz,
  proposal_at timestamptz,
  client_at timestamptz,
  unique (tenant_id, fingerprint)
);

alter table public.prospector_leads
  add column if not exists stage_updated_at timestamptz not null default now(),
  add column if not exists whatsapp_at timestamptz,
  add column if not exists contacted_at timestamptz,
  add column if not exists interested_at timestamptz,
  add column if not exists meeting_at timestamptz,
  add column if not exists proposal_at timestamptz,
  add column if not exists client_at timestamptz;

alter table public.prospector_leads drop constraint if exists prospector_leads_status_check;
alter table public.prospector_leads add constraint prospector_leads_status_check
check (status in ('new','whatsapp','contacted','interested','meeting','proposal','client'));

create table if not exists public.prospector_lead_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.prospector_leads(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_stage text,
  to_stage text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_prospector_searches_tenant_created on public.prospector_searches (tenant_id, created_at desc);
create index if not exists idx_prospector_leads_tenant_created on public.prospector_leads (tenant_id, created_at desc);
create index if not exists idx_prospector_leads_tenant_stage_updated on public.prospector_leads (tenant_id, status, stage_updated_at desc);
create index if not exists idx_prospector_lead_events_lead_created on public.prospector_lead_events (lead_id, created_at desc);

alter table public.prospector_searches enable row level security;
alter table public.prospector_leads enable row level security;
alter table public.prospector_lead_events enable row level security;

revoke all on table public.prospector_searches from anon, authenticated;
revoke all on table public.prospector_leads from anon, authenticated;
revoke all on table public.prospector_lead_events from anon, authenticated;
grant select on table public.prospector_searches to authenticated;
grant select on table public.prospector_leads to authenticated;
grant select on table public.prospector_lead_events to authenticated;

drop policy if exists prospector_searches_select_authorized on public.prospector_searches;
create policy prospector_searches_select_authorized on public.prospector_searches for select to authenticated
using ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)));

drop policy if exists prospector_leads_select_authorized on public.prospector_leads;
create policy prospector_leads_select_authorized on public.prospector_leads for select to authenticated
using ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)));

drop policy if exists prospector_lead_events_select_authorized on public.prospector_lead_events;
create policy prospector_lead_events_select_authorized on public.prospector_lead_events for select to authenticated
using ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)));

create or replace function private.prospector_fingerprint(
  p_provider text,p_provider_lead_id text,p_company_name text,p_phone text,p_website text,p_address text
)
returns text language plpgsql immutable set search_path = ''
as $$
declare v_phone text; v_domain text; v_name text; v_address text;
begin
  v_phone := regexp_replace(coalesce(p_phone, ''), '\\D', '', 'g');
  if length(v_phone) >= 7 then return 'phone:' || v_phone; end if;
  v_domain := lower(regexp_replace(coalesce(p_website, ''), '^https?://(www\\.)?', '', 'i'));
  v_domain := split_part(v_domain, '/', 1);
  if length(v_domain) >= 4 then return 'web:' || v_domain; end if;
  v_name := regexp_replace(lower(public.unaccent(coalesce(p_company_name, ''))), '[^a-z0-9]+', '', 'g');
  v_address := regexp_replace(lower(public.unaccent(coalesce(p_address, ''))), '[^a-z0-9]+', '', 'g');
  if length(v_name) > 0 then return 'business:' || v_name || ':' || v_address; end if;
  return 'source:' || lower(coalesce(p_provider, 'unknown')) || ':' || coalesce(p_provider_lead_id, md5(coalesce(p_company_name,'') || '|' || coalesce(p_address,'')));
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
  v_delivered integer := 0; v_release integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_reserved_count is null or p_reserved_count < 1 or p_reserved_count > 20 then raise exception 'invalid_reserved_count'; end if;
  if p_candidates is null or jsonb_typeof(p_candidates) <> 'array' then raise exception 'invalid_candidates'; end if;
  v_tenant_id := private.current_prospector_tenant_id();
  v_user_id := auth.uid();

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
  if v_release > 0 then
    update public.tenant_lead_daily_usage u set leads_used=greatest(u.leads_used-v_release,0),updated_at=now()
    where u.tenant_id=v_tenant_id and u.usage_date=v_usage_date;
  end if;
  update public.prospector_searches s set delivered_count=v_delivered,status='completed',completed_at=now() where s.id=v_search_id;
  insert into public.prospector_lead_events (tenant_id,lead_id,actor_user_id,event_type,from_stage,to_stage,metadata)
  select v_tenant_id,l.id,v_user_id,'lead_created',null,'new',jsonb_build_object('search_id',v_search_id,'provider',l.provider)
  from public.prospector_leads l where l.search_id=v_search_id;
end;
$$;

create or replace function private.set_prospector_lead_stage_impl(p_lead_id uuid,p_stage text,p_note text default null)
returns table (
  id uuid,status text,stage_updated_at timestamptz,whatsapp_at timestamptz,contacted_at timestamptz,
  interested_at timestamptz,meeting_at timestamptz,proposal_at timestamptz,client_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare v_tenant_id uuid; v_user_id uuid; v_old_stage text; v_now timestamptz := now();
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_stage not in ('new','whatsapp','contacted','interested','meeting','proposal','client') then raise exception 'invalid_stage'; end if;
  v_tenant_id := private.current_prospector_tenant_id(); v_user_id := auth.uid();
  select l.status into v_old_stage from public.prospector_leads l where l.id=p_lead_id and l.tenant_id=v_tenant_id for update;
  if v_old_stage is null then raise exception 'lead_not_found'; end if;
  update public.prospector_leads l set status=p_stage,stage_updated_at=v_now,updated_at=v_now,
    whatsapp_at=case when p_stage='whatsapp' and l.whatsapp_at is null then v_now else l.whatsapp_at end,
    contacted_at=case when p_stage='contacted' and l.contacted_at is null then v_now else l.contacted_at end,
    interested_at=case when p_stage='interested' and l.interested_at is null then v_now else l.interested_at end,
    meeting_at=case when p_stage='meeting' and l.meeting_at is null then v_now else l.meeting_at end,
    proposal_at=case when p_stage='proposal' and l.proposal_at is null then v_now else l.proposal_at end,
    client_at=case when p_stage='client' and l.client_at is null then v_now else l.client_at end
  where l.id=p_lead_id and l.tenant_id=v_tenant_id;
  insert into public.prospector_lead_events (tenant_id,lead_id,actor_user_id,event_type,from_stage,to_stage,note)
  values (v_tenant_id,p_lead_id,v_user_id,case when p_stage='whatsapp' then 'whatsapp_opened' else 'stage_changed' end,v_old_stage,p_stage,nullif(trim(coalesce(p_note,'')),''));
  return query select l.id,l.status,l.stage_updated_at,l.whatsapp_at,l.contacted_at,l.interested_at,l.meeting_at,l.proposal_at,l.client_at
  from public.prospector_leads l where l.id=p_lead_id and l.tenant_id=v_tenant_id;
end;
$$;

create or replace function public.save_prospector_candidates(p_provider text,p_query_text text,p_filters jsonb,p_candidates jsonb,p_reserved_count integer)
returns table (id uuid,source_id text,name text,category text,address text,phone text,website text,source_url text,provider text,latitude double precision,longitude double precision,distance_km double precision,status text,delivered_at timestamptz)
language sql set search_path = ''
as $$ select * from private.save_prospector_candidates_impl(p_provider,p_query_text,p_filters,p_candidates,p_reserved_count); $$;

create or replace function public.set_prospector_lead_stage(p_lead_id uuid,p_stage text,p_note text default null)
returns table (id uuid,status text,stage_updated_at timestamptz,whatsapp_at timestamptz,contacted_at timestamptz,interested_at timestamptz,meeting_at timestamptz,proposal_at timestamptz,client_at timestamptz)
language sql set search_path = ''
as $$ select * from private.set_prospector_lead_stage_impl(p_lead_id,p_stage,p_note); $$;

revoke all on function public.save_prospector_candidates(text,text,jsonb,jsonb,integer) from public,anon;
revoke all on function public.set_prospector_lead_stage(uuid,text,text) from public,anon;
grant execute on function public.save_prospector_candidates(text,text,jsonb,jsonb,integer) to authenticated,service_role;
grant execute on function public.set_prospector_lead_stage(uuid,text,text) to authenticated,service_role;

commit;
