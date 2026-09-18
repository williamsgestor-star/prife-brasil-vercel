-- Multi-source Prospector persistence and CRM follow-up improvements.

alter table public.crm_leads
  add column if not exists lead_score integer not null default 0,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists social_profiles jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.crm_leads
  drop constraint if exists crm_leads_status_check;

update public.crm_leads
set status = 'cliente'
where status = 'fechado';

alter table public.crm_leads
  add constraint crm_leads_status_check
  check (status in ('novo', 'whatsapp', 'contatado', 'interessado', 'reuniao', 'proposta', 'cliente', 'perdido')),
  add constraint crm_leads_score_check
  check (lead_score between 0 and 100);

create index if not exists crm_leads_tenant_status_updated_idx
  on public.crm_leads (tenant_id, status, updated_at desc);

create index if not exists crm_leads_tenant_follow_up_idx
  on public.crm_leads (tenant_id, next_follow_up_at)
  where next_follow_up_at is not null;

create table if not exists public.crm_lead_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.crm_leads(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crm_lead_events_tenant_lead_created_idx
  on public.crm_lead_events (tenant_id, lead_id, created_at desc);

alter table public.crm_lead_events enable row level security;

drop policy if exists crm_lead_events_select_managed on public.crm_lead_events;
create policy crm_lead_events_select_managed
  on public.crm_lead_events for select to authenticated
  using ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)));

drop policy if exists crm_lead_events_insert_managed on public.crm_lead_events;
create policy crm_lead_events_insert_managed
  on public.crm_lead_events for insert to authenticated
  with check (
    actor_user_id = (select auth.uid())
    and ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)))
  );

grant select, insert on public.crm_lead_events to authenticated;

create or replace function private.save_external_prospector_candidates_impl(
  p_provider text,
  p_query_text text,
  p_filters jsonb,
  p_candidates jsonb,
  p_reserved_count integer,
  p_provider_billed_count integer default 0
)
returns table (
  id uuid,
  provider_lead_id text,
  company_name text,
  category text,
  address text,
  phone text,
  email text,
  website text,
  source_url text,
  provider text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  status text,
  delivered_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_search_id uuid;
  v_filters jsonb := coalesce(p_filters, '{}'::jsonb);
  v_provider text := trim(coalesce(p_provider, ''));
  v_delivered integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if v_provider not in ('Google Places', 'Microsoft Maps') then raise exception 'invalid_provider'; end if;
  if p_reserved_count is null or p_reserved_count < 1 or p_reserved_count > 20 then raise exception 'invalid_reserved_count'; end if;
  if p_provider_billed_count is null or p_provider_billed_count < 0 or p_provider_billed_count > p_reserved_count then raise exception 'invalid_provider_billed_count'; end if;
  if p_candidates is null or jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) > 20 then raise exception 'invalid_candidates'; end if;

  v_tenant_id := private.current_prospector_tenant_id();
  v_user_id := auth.uid();

  insert into public.prospector_searches (
    tenant_id, requested_by, provider, query_text, filters,
    requested_count, reserved_count, delivered_count, status
  ) values (
    v_tenant_id, v_user_id, v_provider, left(coalesce(p_query_text, ''), 500),
    v_filters || jsonb_build_object('quota_mode', 'monthly', 'provider_billed_count', p_provider_billed_count),
    jsonb_array_length(p_candidates), p_reserved_count, 0, 'processing'
  ) returning prospector_searches.id into v_search_id;

  return query
  with raw as (
    select
      e.ord,
      left(coalesce(e.value->>'source_id', e.value->>'sourceId'), 240) as source_id,
      left(trim(e.value->>'name'), 180) as name,
      left(nullif(trim(e.value->>'category'), ''), 160) as category,
      left(nullif(trim(e.value->>'address'), ''), 500) as address,
      left(nullif(trim(e.value->>'phone'), ''), 40) as phone,
      left(nullif(trim(e.value->>'email'), ''), 180) as email,
      left(nullif(trim(e.value->>'website'), ''), 500) as website,
      left(coalesce(nullif(trim(e.value->>'source_url'), ''), nullif(trim(e.value->>'sourceUrl'), '')), 500) as source_url,
      nullif(coalesce(e.value->>'latitude', e.value#>>'{location,lat}'), '')::double precision as latitude,
      nullif(coalesce(e.value->>'longitude', e.value#>>'{location,lng}'), '')::double precision as longitude,
      nullif(coalesce(e.value->>'distance_km', e.value->>'distanceKm'), '')::double precision as distance_km,
      case when jsonb_typeof(e.value->'payload') = 'object' then e.value->'payload' else '{}'::jsonb end as payload,
      private.prospector_fingerprint(
        v_provider,
        coalesce(e.value->>'source_id', e.value->>'sourceId'),
        e.value->>'name', e.value->>'phone', e.value->>'website', e.value->>'address'
      ) as fingerprint
    from jsonb_array_elements(p_candidates) with ordinality as e(value, ord)
    where nullif(trim(e.value->>'name'), '') is not null
      and (nullif(trim(e.value->>'phone'), '') is not null or nullif(trim(e.value->>'website'), '') is not null)
  ), unique_candidates as (
    select distinct on (r.fingerprint) r.* from raw r order by r.fingerprint, r.ord
  ), fresh as (
    select u.* from unique_candidates u
    where not exists (
      select 1 from public.prospector_leads x
      where x.tenant_id = v_tenant_id and x.fingerprint = u.fingerprint
    )
    order by u.ord limit p_reserved_count
  ), inserted as (
    insert into public.prospector_leads (
      tenant_id, search_id, created_by, fingerprint, provider, provider_lead_id,
      company_name, category, phone, whatsapp, email, website, address,
      city, state, country, latitude, longitude, status, source_url,
      source_payload, delivered_at, created_at, updated_at, stage_updated_at
    )
    select
      v_tenant_id, v_search_id, v_user_id, f.fingerprint, v_provider, f.source_id,
      f.name, coalesce(f.category, nullif(v_filters->>'segment', ''), 'Empresa'),
      f.phone, f.phone, f.email, f.website, f.address,
      nullif(v_filters->>'city', ''), nullif(v_filters->>'region', ''), nullif(v_filters->>'country', ''),
      f.latitude, f.longitude, 'new', f.source_url,
      f.payload || jsonb_build_object('distanceKm', f.distance_km, 'providerBilledCount', p_provider_billed_count),
      now(), now(), now(), now()
    from fresh f
    on conflict on constraint prospector_leads_tenant_id_fingerprint_key do nothing
    returning public.prospector_leads.*
  )
  select i.id, i.provider_lead_id, i.company_name, i.category, i.address,
         i.phone, i.email, i.website, i.source_url, i.provider,
         i.latitude, i.longitude,
         nullif(i.source_payload->>'distanceKm', '')::double precision,
         i.status, i.delivered_at
  from inserted i order by i.delivered_at, i.id;

  get diagnostics v_delivered = row_count;

  perform * from private.settle_prospector_quota_impl(
    p_reserved_count,
    v_delivered,
    least(p_reserved_count, p_provider_billed_count)
  );

  update public.prospector_searches
  set delivered_count = v_delivered, status = 'completed', completed_at = now()
  where prospector_searches.id = v_search_id;

  insert into public.prospector_lead_events (
    tenant_id, lead_id, actor_user_id, event_type, from_stage, to_stage, metadata
  )
  select v_tenant_id, l.id, v_user_id, 'lead_created', null, 'new',
         jsonb_build_object('search_id', v_search_id, 'provider', v_provider, 'quota_mode', 'monthly')
  from public.prospector_leads l where l.search_id = v_search_id;
end;
$$;

create or replace function public.save_external_prospector_candidates(
  p_provider text,
  p_query_text text,
  p_filters jsonb,
  p_candidates jsonb,
  p_reserved_count integer,
  p_provider_billed_count integer default 0
)
returns table (
  id uuid,
  provider_lead_id text,
  company_name text,
  category text,
  address text,
  phone text,
  email text,
  website text,
  source_url text,
  provider text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  status text,
  delivered_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select * from private.save_external_prospector_candidates_impl(
    p_provider, p_query_text, p_filters, p_candidates, p_reserved_count, p_provider_billed_count
  );
$$;

revoke all on function public.save_external_prospector_candidates(text,text,jsonb,jsonb,integer,integer) from public, anon;
grant execute on function public.save_external_prospector_candidates(text,text,jsonb,jsonb,integer,integer) to authenticated;

