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
  v_limit integer := least(20, greatest(1, coalesce(p_limit, 10)));
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

revoke all on function private.search_azure_maps_candidates_impl(text, text, text, integer) from public, anon, authenticated;

create or replace function private.run_crustapi_prospector_search_impl(
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
  v_tenant_id uuid;
  v_user_id uuid;
  v_query text := trim(coalesce(p_query, ''));
  v_country text := lower(trim(coalesce(p_country, '')));
  v_language text := lower(trim(coalesce(p_language, 'pt')));
  v_filters jsonb := coalesce(p_filters, '{}'::jsonb);
  v_requested integer := least(10, greatest(1, coalesce(p_limit, 10)));
  v_reserved integer := 0;
  v_search_id uuid;
  v_crust jsonb := jsonb_build_object('places', '[]'::jsonb, 'count', 0);
  v_azure jsonb := jsonb_build_object('places', '[]'::jsonb, 'count', 0);
  v_candidates jsonb := '[]'::jsonb;
  v_leads jsonb := '[]'::jsonb;
  v_quota jsonb := '{}'::jsonb;
  v_provider_billed integer := 0;
  v_delivered integer := 0;
  v_provider_name text := 'CrustAPI · Google Maps + Azure Maps';
  v_crust_error text;
  v_azure_error text;
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

  v_tenant_id := private.current_prospector_tenant_id();
  v_user_id := auth.uid();

  select q.consumed
    into v_reserved
  from public.consume_prospector_leads(v_requested) q;

  v_reserved := coalesce(v_reserved, 0);
  if v_reserved < 1 then
    select to_jsonb(q)
      into v_quota
    from public.get_prospector_quota() q;

    return jsonb_build_object(
      'error', 'monthly_quota_exhausted',
      'message', 'Sua franquia mensal de leads foi atingida.',
      'leads', '[]'::jsonb,
      'quota', coalesce(v_quota, '{}'::jsonb)
    );
  end if;

  begin
    begin
      v_crust := private.search_crustapi_candidates_impl(
        v_query,
        v_country,
        v_language,
        1,
        v_reserved
      );
    exception when others then
      v_crust_error := left(sqlerrm, 120);
    end;

    begin
      v_azure := private.search_azure_maps_candidates_impl(
        v_query,
        v_country,
        v_language,
        v_reserved
      );
    exception when others then
      v_azure_error := left(sqlerrm, 120);
    end;

    v_provider_billed := least(
      v_reserved,
      greatest(0, coalesce((v_crust->>'count')::integer, 0))
    );
    v_candidates := coalesce(v_crust->'places', '[]'::jsonb) || coalesce(v_azure->'places', '[]'::jsonb);

    if jsonb_array_length(coalesce(v_crust->'places', '[]'::jsonb)) = 0
       and jsonb_array_length(coalesce(v_azure->'places', '[]'::jsonb)) > 0 then
      v_provider_name := 'Azure Maps';
    elsif jsonb_array_length(coalesce(v_crust->'places', '[]'::jsonb)) > 0
       and jsonb_array_length(coalesce(v_azure->'places', '[]'::jsonb)) = 0 then
      v_provider_name := 'CrustAPI · Google Maps';
    end if;

    if jsonb_array_length(v_candidates) = 0 and v_crust_error is not null and v_azure_error is not null then
      raise exception 'prospector_providers_unavailable';
    end if;

    insert into public.prospector_searches (
      tenant_id,
      requested_by,
      provider,
      query_text,
      filters,
      requested_count,
      reserved_count,
      delivered_count,
      status
    ) values (
      v_tenant_id,
      v_user_id,
      v_provider_name,
      v_query,
      v_filters || jsonb_build_object(
        'country', v_country,
        'language', v_language,
        'quota_mode', 'monthly',
        'provider_billed_count', v_provider_billed,
        'azure_maps_requested', v_azure_error is null
      ),
      jsonb_array_length(v_candidates),
      v_reserved,
      0,
      'processing'
    )
    returning id into v_search_id;

    with raw as (
      select
        e.ord,
        nullif(trim(e.value->>'sourceId'), '') as source_id,
        nullif(trim(e.value->>'name'), '') as company_name,
        coalesce(nullif(trim(e.value->>'category'), ''), nullif(trim(v_filters->>'segment'), ''), 'Empresa') as category,
        nullif(trim(e.value->>'address'), '') as address,
        nullif(trim(e.value->>'phone'), '') as phone,
        nullif(trim(e.value->>'website'), '') as website,
        nullif(trim(e.value->>'sourceUrl'), '') as source_url,
        coalesce(nullif(trim(e.value->>'provider'), ''), v_provider_name) as provider,
        nullif(e.value->>'latitude', '')::double precision as latitude,
        nullif(e.value->>'longitude', '')::double precision as longitude,
        nullif(e.value->>'rating', '')::numeric as rating,
        nullif(e.value->>'reviewsCount', '')::integer as reviews_count,
        private.prospector_fingerprint(
          coalesce(nullif(trim(e.value->>'provider'), ''), v_provider_name),
          e.value->>'sourceId',
          e.value->>'name',
          e.value->>'phone',
          e.value->>'website',
          e.value->>'address'
        ) as fingerprint
      from jsonb_array_elements(v_candidates) with ordinality as e(value, ord)
      where nullif(trim(e.value->>'name'), '') is not null
        and (
          nullif(trim(e.value->>'phone'), '') is not null
          or nullif(trim(e.value->>'website'), '') is not null
        )
    ), unique_candidates as (
      select distinct on (r.fingerprint) r.*
      from raw r
      order by r.fingerprint, r.ord
    ), fresh as (
      select u.*
      from unique_candidates u
      where not exists (
        select 1
        from public.prospector_leads x
        where x.tenant_id = v_tenant_id
          and x.fingerprint = u.fingerprint
      )
      order by u.ord
      limit v_reserved
    ), inserted as (
      insert into public.prospector_leads (
        tenant_id,
        search_id,
        created_by,
        fingerprint,
        provider,
        provider_lead_id,
        company_name,
        category,
        phone,
        whatsapp,
        website,
        address,
        city,
        state,
        country,
        latitude,
        longitude,
        status,
        source_url,
        source_payload,
        delivered_at,
        created_at,
        updated_at,
        stage_updated_at
      )
      select
        v_tenant_id,
        v_search_id,
        v_user_id,
        f.fingerprint,
        f.provider,
        f.source_id,
        f.company_name,
        f.category,
        f.phone,
        f.phone,
        f.website,
        f.address,
        nullif(trim(v_filters->>'city'), ''),
        nullif(trim(v_filters->>'region'), ''),
        v_country,
        f.latitude,
        f.longitude,
        'new',
        f.source_url,
        jsonb_build_object(
          'rating', f.rating,
          'reviewsCount', f.reviews_count,
          'providerBilledCount', case when f.provider = 'Azure Maps' then 0 else v_provider_billed end
        ),
        now(),
        now(),
        now(),
        now()
      from fresh f
      on conflict on constraint prospector_leads_tenant_id_fingerprint_key do nothing
      returning public.prospector_leads.*
    )
    select
      coalesce(jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'sourceId', coalesce(i.provider_lead_id, i.id::text),
          'name', i.company_name,
          'category', i.category,
          'address', i.address,
          'phone', i.phone,
          'website', i.website,
          'sourceUrl', coalesce(i.source_url, '#'),
          'provider', i.provider,
          'latitude', i.latitude,
          'longitude', i.longitude,
          'distanceKm', null,
          'status', i.status,
          'deliveredAt', i.delivered_at,
          'country', i.country
        ) order by i.delivered_at, i.id
      ), '[]'::jsonb),
      count(*)::integer
      into v_leads, v_delivered
    from inserted i;

    perform *
    from private.settle_prospector_quota_impl(
      v_reserved,
      v_delivered,
      v_provider_billed
    );

    update public.prospector_searches
    set delivered_count = v_delivered,
        status = 'completed',
        completed_at = now()
    where id = v_search_id;

    insert into public.prospector_lead_events (
      tenant_id,
      lead_id,
      actor_user_id,
      event_type,
      from_stage,
      to_stage,
      metadata
    )
    select
      v_tenant_id,
      l.id,
      v_user_id,
      'lead_created',
      null,
      'new',
      jsonb_build_object(
        'search_id', v_search_id,
        'provider', l.provider,
        'quota_mode', 'monthly'
      )
    from public.prospector_leads l
    where l.search_id = v_search_id;

  exception when others then
    v_error := sqlerrm;

    if v_reserved > 0 then
      perform *
      from private.settle_prospector_quota_impl(
        v_reserved,
        0,
        least(v_reserved, v_provider_billed)
      );
    end if;

    if v_search_id is not null then
      update public.prospector_searches
      set delivered_count = 0,
          status = 'failed',
          error_code = left(v_error, 120),
          completed_at = now()
      where id = v_search_id;
    end if;

    select to_jsonb(q)
      into v_quota
    from public.get_prospector_quota() q;

    return jsonb_build_object(
      'error', 'prospector_search_failed',
      'message', 'Não foi possível concluir a busca de empresas agora.',
      'details', left(v_error, 160),
      'leads', '[]'::jsonb,
      'quota', coalesce(v_quota, '{}'::jsonb)
    );
  end;

  select to_jsonb(q)
    into v_quota
  from public.get_prospector_quota() q;

  return jsonb_build_object(
    'leads', coalesce(v_leads, '[]'::jsonb),
    'meta', jsonb_build_object(
      'category', coalesce(nullif(trim(v_filters->>'segment'), ''), 'Empresas'),
      'location', concat_ws(', ', nullif(trim(v_filters->>'neighborhood'), ''), nullif(trim(v_filters->>'city'), ''), nullif(trim(v_filters->>'region'), ''), upper(v_country)),
      'radius', 0,
      'returned', v_delivered,
      'attribution', v_provider_name,
      'provider', v_provider_name,
      'providerBilledCount', v_provider_billed,
      'azureMapsUsed', v_azure_error is null,
      'creditsRemaining', nullif(v_crust->>'creditsRemaining', '')::integer,
      'tookMs', coalesce(nullif(v_crust->>'tookMs', '')::integer, 0) + coalesce(nullif(v_azure->>'tookMs', '')::integer, 0)
    ),
    'quota', coalesce(v_quota, '{}'::jsonb)
  );
end;
$$;

