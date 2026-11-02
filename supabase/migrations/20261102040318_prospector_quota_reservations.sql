-- Franquia do Prospector com reservas registradas (etapa 1 de 2).
--
-- Por quê: hoje o cliente logado consegue chamar direto settle_prospector_quota,
-- release_prospector_daily_leads e save_external_prospector_candidates dizendo
-- "reservei 20, usei 0" e recebe os créditos de volta sem ter reservado nada.
-- Repetindo, ele passa do limite mensal de leads e gasta a franquia global.
--
-- O que muda:
-- 1. consume_prospector_leads grava cada reserva e devolve reservation_id.
-- 2. Novas versões de save_external_prospector_candidates e settle_prospector_quota
--    recebem p_reservation_id e só aceitam uma reserva do mesmo usuário/empresa,
--    ainda aberta, usando a quantidade gravada no banco (não a enviada pelo cliente).
-- 3. O limite mensal passa a respeitar tenant_features.prospector_monthly_lead_limit
--    e prospector_unlimited (antes ficava fixo em 100); admin segue ilimitado.
-- 4. Funções antigas que só serviam para devolver créditos e não são usadas pelo
--    código perdem o acesso de usuários logados.
--
-- As versões antigas de save_external_prospector_candidates e settle_prospector_quota
-- continuam existindo até o código novo ir para produção; a etapa 2 as remove.

-- 1. Reservas -----------------------------------------------------------------
create table if not exists private.prospector_quota_reservations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  period_start date not null,
  reserved_count integer not null check (reserved_count between 1 and 20),
  delivered_count integer,
  provider_billed_count integer,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists prospector_quota_reservations_open_idx
  on private.prospector_quota_reservations (tenant_id, created_at)
  where settled_at is null;

alter table private.prospector_quota_reservations enable row level security;
revoke all on private.prospector_quota_reservations from public, anon, authenticated;

-- 2. Limite por empresa (null = ilimitado) -------------------------------------
create or replace function private.prospector_tenant_monthly_limit(p_tenant_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_platform_admin() then null
    when coalesce((select tf.prospector_unlimited from public.tenant_features tf where tf.tenant_id = p_tenant_id), false) then null
    else coalesce((select tf.prospector_monthly_lead_limit from public.tenant_features tf where tf.tenant_id = p_tenant_id), 100)
  end;
$$;

revoke all on function private.prospector_tenant_monthly_limit(uuid) from public, anon, authenticated;

-- 3. consume_prospector_leads devolve reservation_id ---------------------------
drop function if exists public.consume_prospector_leads(integer);

create function public.consume_prospector_leads(p_requested_count integer)
returns table(
  tenant_id uuid, monthly_limit integer, used integer, remaining integer,
  global_limit integer, global_used integer, global_remaining integer,
  period_start date, consumed integer, reservation_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_tenant_id uuid;
  current_period date := date_trunc('month', timezone('America/Asuncion', now()))::date;
  resolved_limit integer;
  resolved_used integer := 0;
  resolved_global_limit integer := 3000;
  resolved_global_used integer := 0;
  allowed_count integer := 0;
  new_reservation_id uuid;
begin
  if p_requested_count is null or p_requested_count < 1 or p_requested_count > 20 then
    raise exception 'invalid_requested_count';
  end if;

  resolved_tenant_id := private.current_prospector_tenant_id();
  resolved_limit := private.prospector_tenant_monthly_limit(resolved_tenant_id);

  insert into private.prospector_global_monthly_usage (
    period_start, leads_used, searches_used, google_requests_used, lead_limit
  ) values (current_period, 0, 0, 0, 3000)
  on conflict on constraint prospector_global_monthly_usage_pkey do nothing;

  select g.lead_limit, g.leads_used
    into resolved_global_limit, resolved_global_used
  from private.prospector_global_monthly_usage g
  where g.period_start = current_period
  for update;

  insert into public.tenant_lead_monthly_usage (tenant_id, period_start, leads_used, searches_used)
  values (resolved_tenant_id, current_period, 0, 0)
  on conflict on constraint tenant_lead_monthly_usage_pkey do nothing;

  select u.leads_used
    into resolved_used
  from public.tenant_lead_monthly_usage u
  where u.tenant_id = resolved_tenant_id
    and u.period_start = current_period
  for update;

  allowed_count := least(
    p_requested_count,
    case when resolved_limit is null then p_requested_count else greatest(0, resolved_limit - resolved_used) end,
    greatest(0, resolved_global_limit - resolved_global_used)
  );

  if allowed_count > 0 then
    update private.prospector_global_monthly_usage g
    set leads_used = g.leads_used + allowed_count,
        searches_used = g.searches_used + 1,
        updated_at = now()
    where g.period_start = current_period
    returning g.leads_used into resolved_global_used;

    update public.tenant_lead_monthly_usage u
    set leads_used = u.leads_used + allowed_count,
        searches_used = u.searches_used + 1,
        updated_at = now()
    where u.tenant_id = resolved_tenant_id
      and u.period_start = current_period
    returning u.leads_used into resolved_used;

    insert into private.prospector_quota_reservations (tenant_id, user_id, period_start, reserved_count)
    values (resolved_tenant_id, auth.uid(), current_period, allowed_count)
    returning id into new_reservation_id;
  end if;

  return query
  select resolved_tenant_id,
         resolved_limit,
         resolved_used,
         case when resolved_limit is null then null else greatest(0, resolved_limit - resolved_used) end,
         resolved_global_limit,
         resolved_global_used,
         greatest(0, resolved_global_limit - resolved_global_used),
         current_period,
         allowed_count,
         new_reservation_id;
end;
$$;

revoke all on function public.consume_prospector_leads(integer) from public, anon;
grant execute on function public.consume_prospector_leads(integer) to authenticated, service_role;

-- 4. get_prospector_quota usa o limite da empresa ------------------------------
create or replace function public.get_prospector_quota()
returns table(
  tenant_id uuid, monthly_limit integer, used integer, remaining integer,
  global_limit integer, global_used integer, global_remaining integer, period_start date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  resolved_tenant_id uuid;
  current_period date := date_trunc('month', timezone('America/Asuncion', now()))::date;
  resolved_limit integer;
  resolved_used integer := 0;
  resolved_global_limit integer := 3000;
  resolved_global_used integer := 0;
begin
  resolved_tenant_id := private.current_prospector_tenant_id();
  resolved_limit := private.prospector_tenant_monthly_limit(resolved_tenant_id);

  select coalesce(u.leads_used, 0)
    into resolved_used
  from public.tenant_lead_monthly_usage u
  where u.tenant_id = resolved_tenant_id
    and u.period_start = current_period;
  resolved_used := coalesce(resolved_used, 0);

  select coalesce(g.lead_limit, 3000), coalesce(g.leads_used, 0)
    into resolved_global_limit, resolved_global_used
  from private.prospector_global_monthly_usage g
  where g.period_start = current_period;
  resolved_global_limit := coalesce(resolved_global_limit, 3000);
  resolved_global_used := coalesce(resolved_global_used, 0);

  return query
  select resolved_tenant_id,
         resolved_limit,
         resolved_used,
         case when resolved_limit is null then null else greatest(0, resolved_limit - resolved_used) end,
         resolved_global_limit,
         resolved_global_used,
         greatest(0, resolved_global_limit - resolved_global_used),
         current_period;
end;
$$;

-- 5. Acerto da reserva (só a reserva aberta do próprio usuário) -----------------
create or replace function private.settle_prospector_reservation_impl(
  p_reservation_id uuid,
  p_delivered_count integer,
  p_provider_billed_count integer
)
returns table(
  tenant_id uuid, monthly_limit integer, used integer, remaining integer,
  global_limit integer, global_used integer, global_remaining integer, period_start date
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r private.prospector_quota_reservations;
  resolved_tenant_id uuid;
  resolved_limit integer;
  resolved_used integer := 0;
  resolved_global_limit integer := 3000;
  resolved_global_used integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  resolved_tenant_id := private.current_prospector_tenant_id();

  select * into r
  from private.prospector_quota_reservations x
  where x.id = p_reservation_id
    and x.tenant_id = resolved_tenant_id
    and x.user_id = auth.uid()
    and x.settled_at is null
  for update;

  if r.id is null then raise exception 'reservation_not_found'; end if;
  if p_delivered_count is null or p_delivered_count < 0 or p_delivered_count > r.reserved_count then
    raise exception 'invalid_delivered_count';
  end if;
  if p_provider_billed_count is null or p_provider_billed_count < 0 or p_provider_billed_count > r.reserved_count then
    raise exception 'invalid_provider_billed_count';
  end if;

  update private.prospector_global_monthly_usage g
  set leads_used = greatest(g.leads_used - (r.reserved_count - p_provider_billed_count), 0),
      updated_at = now()
  where g.period_start = r.period_start;

  update public.tenant_lead_monthly_usage u
  set leads_used = greatest(u.leads_used - (r.reserved_count - p_delivered_count), 0),
      updated_at = now()
  where u.tenant_id = r.tenant_id
    and u.period_start = r.period_start;

  update private.prospector_quota_reservations x
  set settled_at = now(),
      delivered_count = p_delivered_count,
      provider_billed_count = p_provider_billed_count
  where x.id = r.id;

  resolved_limit := private.prospector_tenant_monthly_limit(r.tenant_id);

  select coalesce(u.leads_used, 0) into resolved_used
  from public.tenant_lead_monthly_usage u
  where u.tenant_id = r.tenant_id and u.period_start = r.period_start;
  resolved_used := coalesce(resolved_used, 0);

  select coalesce(g.lead_limit, 3000), coalesce(g.leads_used, 0)
    into resolved_global_limit, resolved_global_used
  from private.prospector_global_monthly_usage g
  where g.period_start = r.period_start;
  resolved_global_limit := coalesce(resolved_global_limit, 3000);
  resolved_global_used := coalesce(resolved_global_used, 0);

  return query
  select r.tenant_id,
         resolved_limit,
         resolved_used,
         case when resolved_limit is null then null else greatest(0, resolved_limit - resolved_used) end,
         resolved_global_limit,
         resolved_global_used,
         greatest(0, resolved_global_limit - resolved_global_used),
         r.period_start;
end;
$$;

revoke all on function private.settle_prospector_reservation_impl(uuid, integer, integer) from public, anon, authenticated;

create or replace function public.settle_prospector_quota(
  p_reservation_id uuid,
  p_delivered_count integer,
  p_provider_billed_count integer
)
returns table(
  tenant_id uuid, monthly_limit integer, used integer, remaining integer,
  global_limit integer, global_used integer, global_remaining integer, period_start date
)
language sql
security definer
set search_path = ''
as $$
  select * from private.settle_prospector_reservation_impl(p_reservation_id, p_delivered_count, p_provider_billed_count);
$$;

revoke all on function public.settle_prospector_quota(uuid, integer, integer) from public, anon;
grant execute on function public.settle_prospector_quota(uuid, integer, integer) to authenticated, service_role;

-- 6. Gravar leads usando a quantidade da reserva --------------------------------
create or replace function private.save_external_prospector_candidates_v2_impl(
  p_provider text,
  p_query_text text,
  p_filters jsonb,
  p_candidates jsonb,
  p_reservation_id uuid,
  p_provider_billed_count integer default 0
)
returns table(
  id uuid, provider_lead_id text, company_name text, category text, address text,
  phone text, email text, website text, source_url text, provider text,
  latitude double precision, longitude double precision, distance_km double precision,
  status text, delivered_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
  v_search_id uuid;
  v_reserved integer;
  v_billed integer;
  v_filters jsonb := coalesce(p_filters, '{}'::jsonb);
  v_provider text := trim(coalesce(p_provider, ''));
  v_delivered integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if v_provider not in ('Google Places', 'Microsoft Maps', 'OpenStreetMap') then raise exception 'invalid_provider'; end if;
  if p_candidates is null or jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) > 100 then raise exception 'invalid_candidates'; end if;
  if jsonb_typeof(v_filters) <> 'object' then raise exception 'invalid_filters'; end if;

  v_tenant_id := private.current_prospector_tenant_id();
  v_user_id := auth.uid();

  select x.reserved_count into v_reserved
  from private.prospector_quota_reservations x
  where x.id = p_reservation_id
    and x.tenant_id = v_tenant_id
    and x.user_id = v_user_id
    and x.settled_at is null
  for update;

  if v_reserved is null then raise exception 'reservation_not_found'; end if;
  v_billed := least(v_reserved, greatest(0, coalesce(p_provider_billed_count, 0)));

  insert into public.prospector_searches (
    tenant_id, requested_by, provider, query_text, filters,
    requested_count, reserved_count, delivered_count, status
  ) values (
    v_tenant_id, v_user_id, v_provider, left(coalesce(p_query_text, ''), 500),
    v_filters || jsonb_build_object('quota_mode', 'monthly', 'provider_billed_count', v_billed),
    jsonb_array_length(p_candidates), v_reserved, 0, 'processing'
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
    order by u.ord limit v_reserved
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
      f.payload || jsonb_build_object('distanceKm', f.distance_km, 'providerBilledCount', v_billed),
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

  perform * from private.settle_prospector_reservation_impl(p_reservation_id, v_delivered, v_billed);

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

revoke all on function private.save_external_prospector_candidates_v2_impl(text, text, jsonb, jsonb, uuid, integer) from public, anon, authenticated;

create or replace function public.save_external_prospector_candidates(
  p_provider text,
  p_query_text text,
  p_filters jsonb,
  p_candidates jsonb,
  p_reservation_id uuid,
  p_provider_billed_count integer default 0
)
returns table(
  id uuid, provider_lead_id text, company_name text, category text, address text,
  phone text, email text, website text, source_url text, provider text,
  latitude double precision, longitude double precision, distance_km double precision,
  status text, delivered_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select * from private.save_external_prospector_candidates_v2_impl(
    p_provider, p_query_text, p_filters, p_candidates, p_reservation_id, p_provider_billed_count
  );
$$;

revoke all on function public.save_external_prospector_candidates(text, text, jsonb, jsonb, uuid, integer) from public, anon;
grant execute on function public.save_external_prospector_candidates(text, text, jsonb, jsonb, uuid, integer) to authenticated, service_role;

-- 7. Busca Microsoft Maps passa a usar a reserva --------------------------------
create or replace function public.run_azure_maps_prospector_search(
  p_query text,
  p_country text,
  p_language text default 'pt',
  p_filters jsonb default '{}'::jsonb,
  p_limit integer default 10
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_query text := trim(coalesce(p_query, ''));
  v_country text := lower(trim(coalesce(p_country, '')));
  v_language text := lower(trim(coalesce(p_language, 'pt')));
  v_filters jsonb := coalesce(p_filters, '{}'::jsonb);
  v_requested integer := least(20, greatest(1, coalesce(p_limit, 20)));
  v_reserved integer := 0;
  v_reservation_id uuid;
  v_azure jsonb := jsonb_build_object('places', '[]'::jsonb, 'count', 0);
  v_leads jsonb := '[]'::jsonb;
  v_quota jsonb := '{}'::jsonb;
  v_delivered integer := 0;
  v_error text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if length(v_query) < 3 or length(v_query) > 240 then raise exception 'invalid_query'; end if;
  if v_country not in ('br', 'py', 'ar', 'bo', 'uy') then raise exception 'invalid_country'; end if;
  if v_language not in ('pt', 'es') then
    v_language := case when v_country = 'br' then 'pt' else 'es' end;
  end if;
  if jsonb_typeof(v_filters) <> 'object' then raise exception 'invalid_filters'; end if;

  perform private.current_prospector_tenant_id();

  select q.consumed, q.reservation_id
    into v_reserved, v_reservation_id
  from public.consume_prospector_leads(v_requested) q;

  v_reserved := coalesce(v_reserved, 0);
  if v_reserved < 1 or v_reservation_id is null then
    select to_jsonb(q) into v_quota from public.get_prospector_quota() q;
    return jsonb_build_object(
      'error', 'monthly_quota_exhausted',
      'message', 'Sua franquia mensal de leads foi atingida.',
      'leads', '[]'::jsonb,
      'quota', coalesce(v_quota, '{}'::jsonb)
    );
  end if;

  begin
    v_azure := private.search_azure_maps_candidates_impl(v_query, v_country, v_language, 100);

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'sourceId', coalesce(s.provider_lead_id, s.id::text),
        'name', s.company_name,
        'category', s.category,
        'address', s.address,
        'phone', s.phone,
        'website', s.website,
        'sourceUrl', coalesce(s.source_url, '#'),
        'provider', s.provider,
        'latitude', s.latitude,
        'longitude', s.longitude,
        'distanceKm', s.distance_km,
        'status', s.status,
        'deliveredAt', s.delivered_at,
        'country', v_country
      ) order by s.delivered_at, s.id
    ), '[]'::jsonb)
      into v_leads
    from private.save_external_prospector_candidates_v2_impl(
      'Microsoft Maps',
      v_query,
      v_filters || jsonb_build_object(
        'country', v_country,
        'language', v_language,
        'requested_provider', 'microsoft',
        'azure_maps_requested', true
      ),
      coalesce(v_azure->'places', '[]'::jsonb),
      v_reservation_id,
      0
    ) s;

    v_delivered := jsonb_array_length(v_leads);
  exception when others then
    -- O bloco foi desfeito, então a reserva continua aberta: devolve tudo.
    v_error := sqlerrm;
    perform * from private.settle_prospector_reservation_impl(v_reservation_id, 0, 0);
    select to_jsonb(q) into v_quota from public.get_prospector_quota() q;
    return jsonb_build_object(
      'error', 'prospector_search_failed',
      'message', 'O Microsoft Maps não respondeu agora. Sua franquia não foi consumida.',
      'details', left(v_error, 160),
      'leads', '[]'::jsonb,
      'quota', coalesce(v_quota, '{}'::jsonb)
    );
  end;

  select to_jsonb(q) into v_quota from public.get_prospector_quota() q;

  return jsonb_build_object(
    'leads', coalesce(v_leads, '[]'::jsonb),
    'meta', jsonb_build_object(
      'category', coalesce(nullif(trim(v_filters->>'segment'), ''), 'Empresas'),
      'location', concat_ws(', ', nullif(trim(v_filters->>'neighborhood'), ''), nullif(trim(v_filters->>'city'), ''), nullif(trim(v_filters->>'region'), ''), upper(v_country)),
      'radius', 0,
      'returned', v_delivered,
      'attribution', 'Microsoft Azure Maps / Bing',
      'provider', 'Microsoft Maps',
      'providerBilledCount', 0,
      'azureMapsUsed', true,
      'tookMs', coalesce(nullif(v_azure->>'tookMs', '')::integer, 0)
    ),
    'quota', coalesce(v_quota, '{}'::jsonb)
  );
end;
$$;

-- 8. Fecha funções antigas que devolvem créditos e não são usadas pelo código ---
revoke execute on function public.release_prospector_daily_leads(integer) from public, anon, authenticated;
revoke execute on function public.save_prospector_candidates(text, text, jsonb, jsonb, integer) from public, anon, authenticated;
revoke execute on function public.reserve_google_places_search() from public, anon, authenticated;
revoke execute on function private.save_external_prospector_candidates_impl(text, text, jsonb, jsonb, integer, integer) from public, anon, authenticated;
revoke execute on function private.release_prospector_daily_leads_impl(integer) from public, anon, authenticated;
revoke execute on function private.save_prospector_candidates_impl(text, text, jsonb, jsonb, integer) from public, anon, authenticated;
