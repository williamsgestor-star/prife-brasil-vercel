-- Prospector: troca automática de fonte e leads sem repetição entre fontes.
-- 1) OpenStreetMap passa a ser aceito como fonte gravada.
-- 2) Um lead que já existe no espaço (mesmo telefone, ou mesmo nome na mesma cidade)
--    não é gravado de novo, venha de qualquer fonte (Microsoft, CrustAPI, Google ou OpenStreetMap).
-- 3) Microsoft Azure Maps: cada busca pede 100 empresas (continua sendo 1 das 5.000 buscas grátis)
--    e entrega até 20 leads novos.
-- Pode ser executado mais de uma vez com segurança.

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
  if v_provider not in ('Google Places', 'Microsoft Maps', 'OpenStreetMap') then raise exception 'invalid_provider'; end if;
  if p_reserved_count is null or p_reserved_count < 1 or p_reserved_count > 20 then raise exception 'invalid_reserved_count'; end if;
  if p_provider_billed_count is null or p_provider_billed_count < 0 or p_provider_billed_count > p_reserved_count then raise exception 'invalid_provider_billed_count'; end if;
  if p_candidates is null or jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) > 100 then raise exception 'invalid_candidates'; end if;

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

create or replace function private.prospector_leads_skip_duplicates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_digits text;
  v_name text;
begin
  v_digits := regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
  if length(v_digits) >= 10 then
    if exists (
      select 1 from public.prospector_leads x
      where x.tenant_id = new.tenant_id
        and right(regexp_replace(coalesce(x.phone, ''), '[^0-9]', '', 'g'), 10) = right(v_digits, 10)
    ) then
      return null;
    end if;
  elsif length(v_digits) >= 7 then
    if exists (
      select 1 from public.prospector_leads x
      where x.tenant_id = new.tenant_id
        and regexp_replace(coalesce(x.phone, ''), '[^0-9]', '', 'g') = v_digits
    ) then
      return null;
    end if;
  end if;

  v_name := regexp_replace(lower(public.unaccent(coalesce(new.company_name, ''))), '[^a-z0-9]+', '', 'g');
  if length(v_name) >= 4 and exists (
    select 1 from public.prospector_leads x
    where x.tenant_id = new.tenant_id
      and lower(coalesce(x.city, '')) = lower(coalesce(new.city, ''))
      and regexp_replace(lower(public.unaccent(coalesce(x.company_name, ''))), '[^a-z0-9]+', '', 'g') = v_name
  ) then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists prospector_leads_skip_duplicates on public.prospector_leads;
create trigger prospector_leads_skip_duplicates
  before insert on public.prospector_leads
  for each row execute function private.prospector_leads_skip_duplicates();

create index if not exists prospector_leads_tenant_phone_tail_idx
  on public.prospector_leads (tenant_id, right(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), 10));


-- Microsoft Azure Maps: 100 candidatos por busca
create or replace function private.search_azure_maps_candidates_impl(
  p_query text,
  p_country text,
  p_language text default 'pt',
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
  v_limit integer := least(100, greatest(1, coalesce(p_limit, 100)));
  v_language_tag text;
  v_api_key text;
  v_url text;
  v_status integer;
  v_content text;
  v_payload jsonb;
  v_places jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  perform private.current_prospector_tenant_id();

  if length(v_query) < 3 or length(v_query) > 240 then
    raise exception 'invalid_query';
  end if;
  if v_country not in ('br', 'py', 'ar', 'bo', 'uy') then
    raise exception 'invalid_country';
  end if;

  v_language_tag := case when v_language = 'pt' then 'pt-BR' else 'es-ES' end;

  select ds.decrypted_secret
    into v_api_key
  from vault.decrypted_secrets ds
  where ds.name = 'AZURE_MAPS_SUBSCRIPTION_KEY'
  order by ds.created_at desc
  limit 1;

  if nullif(v_api_key, '') is null then
    raise exception 'azure_maps_key_not_configured';
  end if;

  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS', '15000');
  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT_MS', '5000');

  v_url := 'https://atlas.microsoft.com/search/fuzzy/json?' || extensions.urlencode(
    jsonb_build_object(
      'api-version', '1.0',
      'query', v_query,
      'countrySet', upper(v_country),
      'language', v_language_tag,
      'idxSet', 'POI',
      'typeahead', 'false',
      'limit', v_limit,
      'subscription-key', v_api_key
    )
  );

  select r.status, r.content
    into v_status, v_content
  from extensions.http((
    'GET',
    v_url,
    array[
      row('Accept', 'application/json')::extensions.http_header,
      row('User-Agent', 'PRIFE-Prospector/1.0')::extensions.http_header
    ],
    null,
    null
  )::extensions.http_request) as r;

  if v_status <> 200 then
    raise exception 'azure_maps_http_%', v_status;
  end if;

  begin
    v_payload := v_content::jsonb;
  exception when others then
    raise exception 'azure_maps_invalid_json';
  end;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'sourceId', 'azure:' || coalesce(nullif(item.value->>'id', ''), md5(coalesce(item.value#>>'{poi,name}', '') || '|' || coalesce(item.value#>>'{address,freeformAddress}', ''))),
      'name', item.value#>>'{poi,name}',
      'category', coalesce(
        nullif(item.value#>>'{poi,classifications,0,names,0,name}', ''),
        nullif(item.value#>>'{poi,categories,0}', ''),
        'Empresa'
      ),
      'address', nullif(item.value#>>'{address,freeformAddress}', ''),
      'phone', nullif(item.value#>>'{poi,phone}', ''),
      'website', case
        when nullif(trim(item.value#>>'{poi,url}'), '') is null then null
        when item.value#>>'{poi,url}' ~* '^https?://' then item.value#>>'{poi,url}'
        else 'https://' || (item.value#>>'{poi,url}')
      end,
      'sourceUrl', 'https://www.bing.com/maps?q=' || extensions.urlencode(
        concat_ws(' ', item.value#>>'{poi,name}', item.value#>>'{address,freeformAddress}')
      ),
      'provider', 'Azure Maps',
      'latitude', nullif(item.value#>>'{position,lat}', '')::double precision,
      'longitude', nullif(item.value#>>'{position,lon}', '')::double precision,
      'countryCode', upper(coalesce(nullif(item.value#>>'{address,countryCode}', ''), v_country))
    ) order by item.ord
  ), '[]'::jsonb)
  into v_places
  from jsonb_array_elements(coalesce(v_payload->'results', '[]'::jsonb)) with ordinality as item(value, ord)
  where item.value->>'type' = 'POI'
    and nullif(trim(item.value#>>'{poi,name}'), '') is not null
    and upper(coalesce(nullif(item.value#>>'{address,countryCode}', ''), v_country)) = upper(v_country)
    and (
      nullif(trim(item.value#>>'{poi,phone}'), '') is not null
      or nullif(trim(item.value#>>'{poi,url}'), '') is not null
    );

  return jsonb_build_object(
    'places', v_places,
    'count', jsonb_array_length(v_places),
    'providerBilledCount', 0,
    'tookMs', nullif(v_payload#>>'{summary,queryTime}', '')::integer,
    'query', v_query,
    'provider', 'Azure Maps'
  );
end;
$$;

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
  v_azure jsonb := jsonb_build_object('places', '[]'::jsonb, 'count', 0);
  v_leads jsonb := '[]'::jsonb;
  v_quota jsonb := '{}'::jsonb;
  v_delivered integer := 0;
  v_error text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if length(v_query) < 3 or length(v_query) > 240 then
    raise exception 'invalid_query';
  end if;
  if v_country not in ('br', 'py', 'ar', 'bo', 'uy') then
    raise exception 'invalid_country';
  end if;
  if v_language not in ('pt', 'es') then
    v_language := case when v_country = 'br' then 'pt' else 'es' end;
  end if;
  if jsonb_typeof(v_filters) <> 'object' then
    raise exception 'invalid_filters';
  end if;

  perform private.current_prospector_tenant_id();

  select q.consumed
    into v_reserved
  from public.consume_prospector_leads(v_requested) q;

  v_reserved := coalesce(v_reserved, 0);
  if v_reserved < 1 then
    select to_jsonb(q) into v_quota
    from public.get_prospector_quota() q;

    return jsonb_build_object(
      'error', 'monthly_quota_exhausted',
      'message', 'Sua franquia mensal de leads foi atingida.',
      'leads', '[]'::jsonb,
      'quota', coalesce(v_quota, '{}'::jsonb)
    );
  end if;

  begin
    v_azure := private.search_azure_maps_candidates_impl(
      v_query,
      v_country,
      v_language,
      100
    );

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
    from private.save_external_prospector_candidates_impl(
      'Microsoft Maps',
      v_query,
      v_filters || jsonb_build_object(
        'country', v_country,
        'language', v_language,
        'requested_provider', 'microsoft',
        'azure_maps_requested', true
      ),
      coalesce(v_azure->'places', '[]'::jsonb),
      v_reserved,
      0
    ) s;

    v_delivered := jsonb_array_length(v_leads);
  exception when others then
    v_error := sqlerrm;

    perform * from private.settle_prospector_quota_impl(
      v_reserved,
      0,
      0
    );

    select to_jsonb(q) into v_quota
    from public.get_prospector_quota() q;

    return jsonb_build_object(
      'error', 'prospector_search_failed',
      'message', 'O Microsoft Maps não respondeu agora. Sua franquia não foi consumida.',
      'details', left(v_error, 160),
      'leads', '[]'::jsonb,
      'quota', coalesce(v_quota, '{}'::jsonb)
    );
  end;

  select to_jsonb(q) into v_quota
  from public.get_prospector_quota() q;

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

revoke all on function public.run_azure_maps_prospector_search(text, text, text, jsonb, integer) from public, anon;
grant execute on function public.run_azure_maps_prospector_search(text, text, text, jsonb, integer) to authenticated;
