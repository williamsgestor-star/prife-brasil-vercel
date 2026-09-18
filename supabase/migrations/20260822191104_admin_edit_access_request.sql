create or replace function public.admin_update_access_request(
  p_request_id uuid,
  p_full_name text,
  p_requested_subdomain_slug text,
  p_requested_business_name text
)
returns public.access_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_slug text;
  normalized_name text;
  normalized_full_name text;
  target_user_id uuid;
  result public.access_requests;
begin
  if not private.is_platform_admin() then
    raise exception 'admin_required';
  end if;

  normalized_slug := lower(trim(coalesce(p_requested_subdomain_slug, '')));
  normalized_name := nullif(trim(coalesce(p_requested_business_name, '')), '');
  normalized_full_name := nullif(trim(coalesce(p_full_name, '')), '');

  if normalized_full_name is null then raise exception 'full_name_required'; end if;
  if normalized_name is null then raise exception 'business_name_required'; end if;
  if normalized_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then
    raise exception 'invalid_subdomain';
  end if;

  update public.access_requests
     set full_name = normalized_full_name,
         requested_subdomain_slug = normalized_slug,
         requested_business_name = normalized_name,
         updated_at = now()
   where id = p_request_id and status = 'pending'
  returning * into result;

  target_user_id := result.user_id;

  if target_user_id is null then raise exception 'pending_request_not_found'; end if;

  update public.profiles
     set full_name = normalized_full_name, updated_at = now()
   where id = target_user_id;

  return result;
end;
$$;

revoke all on function public.admin_update_access_request(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_update_access_request(uuid, text, text, text)
  to authenticated;
