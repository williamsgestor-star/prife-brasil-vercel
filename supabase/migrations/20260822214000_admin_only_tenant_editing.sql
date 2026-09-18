-- Centraliza toda edição dos subdomínios no administrador da plataforma.
-- Proprietários mantêm o acesso às ferramentas liberadas, sem permissão de edição.

create or replace function private.can_manage_tenant(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and private.is_platform_admin()
    and exists (
      select 1 from public.tenants where id = target_tenant_id
    );
$$;

create or replace function private.can_manage_tenant_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and private.is_platform_admin()
    and exists (
      select 1
      from public.tenants
      where id::text = split_part(object_name, '/', 1)
    );
$$;

revoke all on function private.can_manage_tenant(uuid) from public, anon, authenticated;
revoke all on function private.can_manage_tenant_path(text) from public, anon, authenticated;

drop policy if exists tenant_site_profiles_select_managed on public.tenant_site_profiles;
create policy tenant_site_profiles_select_managed
  on public.tenant_site_profiles for select
  to authenticated
  using ((select private.can_manage_tenant(tenant_id)));

drop policy if exists tenant_site_profiles_insert_managed on public.tenant_site_profiles;
create policy tenant_site_profiles_insert_managed
  on public.tenant_site_profiles for insert
  to authenticated
  with check ((select private.can_manage_tenant(tenant_id)));

drop policy if exists tenant_site_profiles_update_managed on public.tenant_site_profiles;
create policy tenant_site_profiles_update_managed
  on public.tenant_site_profiles for update
  to authenticated
  using ((select private.can_manage_tenant(tenant_id)))
  with check ((select private.can_manage_tenant(tenant_id)));

create or replace function public.save_tenant_site_profile(
  p_tenant_id uuid,
  p_owner_full_name text,
  p_business_name text,
  p_public_email text,
  p_phone text,
  p_whatsapp text,
  p_address text,
  p_description text,
  p_instagram_url text,
  p_facebook_url text,
  p_youtube_url text,
  p_logo_url text,
  p_cover_url text,
  p_gallery_urls text[],
  p_video_urls text[]
)
returns public.tenant_site_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_owner_user_id uuid;
  result public.tenant_site_profiles;
  normalized_owner_name text;
  normalized_business_name text;
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'admin_access_required';
  end if;

  normalized_owner_name := nullif(trim(coalesce(p_owner_full_name, '')), '');
  normalized_business_name := nullif(trim(coalesce(p_business_name, '')), '');
  if normalized_owner_name is null then raise exception 'owner_name_required'; end if;
  if normalized_business_name is null then raise exception 'business_name_required'; end if;
  if cardinality(coalesce(p_gallery_urls, '{}')) > 12 then raise exception 'gallery_limit'; end if;
  if cardinality(coalesce(p_video_urls, '{}')) > 6 then raise exception 'video_limit'; end if;

  select owner_user_id into target_owner_user_id
  from public.tenants
  where id = p_tenant_id and status = 'active'
  for update;

  if target_owner_user_id is null then raise exception 'active_tenant_not_found'; end if;

  update public.tenants
     set display_name = normalized_business_name,
         updated_at = now()
   where id = p_tenant_id;

  update public.profiles
     set full_name = normalized_owner_name,
         updated_at = now()
   where id = target_owner_user_id;

  insert into public.tenant_site_profiles (
    tenant_id, public_email, phone, whatsapp, address, description,
    instagram_url, facebook_url, youtube_url, logo_url, cover_url,
    gallery_urls, video_urls, updated_by, updated_at
  ) values (
    p_tenant_id,
    nullif(trim(coalesce(p_public_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    nullif(trim(coalesce(p_address, '')), ''),
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_instagram_url, '')), ''),
    nullif(trim(coalesce(p_facebook_url, '')), ''),
    nullif(trim(coalesce(p_youtube_url, '')), ''),
    nullif(trim(coalesce(p_logo_url, '')), ''),
    nullif(trim(coalesce(p_cover_url, '')), ''),
    coalesce(p_gallery_urls, '{}'),
    coalesce(p_video_urls, '{}'),
    auth.uid(),
    now()
  )
  on conflict (tenant_id) do update set
    public_email = excluded.public_email,
    phone = excluded.phone,
    whatsapp = excluded.whatsapp,
    address = excluded.address,
    description = excluded.description,
    instagram_url = excluded.instagram_url,
    facebook_url = excluded.facebook_url,
    youtube_url = excluded.youtube_url,
    logo_url = excluded.logo_url,
    cover_url = excluded.cover_url,
    gallery_urls = excluded.gallery_urls,
    video_urls = excluded.video_urls,
    updated_by = auth.uid(),
    updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke all on function public.save_tenant_site_profile(
  uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, text[], text[]
) from public, anon, authenticated;
grant execute on function public.save_tenant_site_profile(
  uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, text[], text[]
) to authenticated;

drop policy if exists tenant_media_select_managed on storage.objects;
create policy tenant_media_select_managed
  on storage.objects for select
  to authenticated
  using (bucket_id = 'tenant-media' and (select private.can_manage_tenant_path(name)));

drop policy if exists tenant_media_insert_managed on storage.objects;
create policy tenant_media_insert_managed
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'tenant-media' and (select private.can_manage_tenant_path(name)));

drop policy if exists tenant_media_update_managed on storage.objects;
create policy tenant_media_update_managed
  on storage.objects for update
  to authenticated
  using (bucket_id = 'tenant-media' and (select private.can_manage_tenant_path(name)))
  with check (bucket_id = 'tenant-media' and (select private.can_manage_tenant_path(name)));

drop policy if exists tenant_media_delete_managed on storage.objects;
create policy tenant_media_delete_managed
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'tenant-media' and (select private.can_manage_tenant_path(name)));
