create or replace function public.admin_create_tenant(
  p_owner_email text,
  p_owner_full_name text,
  p_tenant_slug text,
  p_tenant_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text;
  normalized_full_name text;
  normalized_slug text;
  normalized_tenant_name text;
  target_user_id uuid;
  new_tenant_id uuid;
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'admin_access_required';
  end if;

  normalized_email := lower(trim(coalesce(p_owner_email, '')));
  normalized_full_name := nullif(trim(coalesce(p_owner_full_name, '')), '');
  normalized_slug := lower(trim(coalesce(p_tenant_slug, '')));
  normalized_tenant_name := nullif(trim(coalesce(p_tenant_name, '')), '');

  if normalized_email = '' then raise exception 'owner_email_required'; end if;
  if normalized_full_name is null then raise exception 'owner_name_required'; end if;
  if normalized_tenant_name is null then raise exception 'business_name_required'; end if;
  if normalized_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then
    raise exception 'invalid_subdomain';
  end if;
  if normalized_slug in ('www', 'admin', 'api', 'mail', 'app', 'painel', 'suporte') then
    raise exception 'reserved_subdomain';
  end if;

  select p.id into target_user_id
  from public.profiles p
  where lower(p.email) = normalized_email
  limit 1;

  if target_user_id is null then raise exception 'owner_account_not_found'; end if;
  if exists (select 1 from public.tenants t where t.owner_user_id = target_user_id) then
    raise exception 'owner_already_has_tenant';
  end if;

  insert into public.tenants (slug, display_name, owner_user_id)
  values (normalized_slug, normalized_tenant_name, target_user_id)
  returning id into new_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (new_tenant_id, target_user_id, 'owner');

  insert into public.tenant_features (tenant_id)
  values (new_tenant_id);

  update public.profiles
     set full_name = normalized_full_name,
         tenant_id = new_tenant_id,
         approval_status = 'approved',
         updated_at = now()
   where id = target_user_id;

  update public.access_requests
     set full_name = normalized_full_name,
         requested_subdomain_slug = normalized_slug,
         requested_business_name = normalized_tenant_name,
         status = 'approved',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   where user_id = target_user_id;

  return jsonb_build_object(
    'tenant_id', new_tenant_id,
    'slug', normalized_slug,
    'display_name', normalized_tenant_name,
    'owner_user_id', target_user_id,
    'owner_full_name', normalized_full_name,
    'owner_email', normalized_email
  );
end;
$$;

revoke all on function public.admin_create_tenant(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_create_tenant(text, text, text, text)
  to authenticated;
