-- Expose Azure Maps as a selectable Prospector source while keeping its key in Vault.

create or replace function public.get_prospector_provider_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  perform private.current_prospector_tenant_id();

  return jsonb_build_object(
    'microsoft', exists (
      select 1
      from vault.secrets s
      where s.name = 'AZURE_MAPS_SUBSCRIPTION_KEY'
    ),
    'google', false
  );
end;
$$;

revoke all on function public.get_prospector_provider_status() from public, anon;
grant execute on function public.get_prospector_provider_status() to authenticated;

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
  v_requested integer := least(10, greatest(1, coalesce(p_limit, 10)));
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
      v_reserved
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

