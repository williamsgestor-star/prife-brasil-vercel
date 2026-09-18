create table if not exists public.tenant_site_profiles (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  public_email text check (public_email is null or char_length(public_email) <= 254),
  phone text check (phone is null or char_length(phone) <= 40),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 40),
  address text check (address is null or char_length(address) <= 300),
  description text check (description is null or char_length(description) <= 1500),
  instagram_url text check (instagram_url is null or char_length(instagram_url) <= 1000),
  facebook_url text check (facebook_url is null or char_length(facebook_url) <= 1000),
  youtube_url text check (youtube_url is null or char_length(youtube_url) <= 1000),
  logo_url text check (logo_url is null or char_length(logo_url) <= 2000),
  cover_url text check (cover_url is null or char_length(cover_url) <= 2000),
  gallery_urls text[] not null default '{}',
  video_urls text[] not null default '{}',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_site_profiles_gallery_limit check (cardinality(gallery_urls) <= 12),
  constraint tenant_site_profiles_video_limit check (cardinality(video_urls) <= 6)
);

create index if not exists tenant_site_profiles_updated_by_idx
  on public.tenant_site_profiles (updated_by);

insert into public.tenant_site_profiles (tenant_id)
select id from public.tenants
on conflict (tenant_id) do nothing;

create or replace function private.create_tenant_site_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.tenant_site_profiles (tenant_id)
  values (new.id)
  on conflict (tenant_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_tenant_created_create_site_profile on public.tenants;
create trigger on_tenant_created_create_site_profile
  after insert on public.tenants
  for each row execute function private.create_tenant_site_profile();

create or replace function private.can_manage_tenant(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (private.is_platform_admin() or private.is_tenant_member(target_tenant_id));
$$;

create or replace function private.can_manage_tenant_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    private.is_platform_admin()
    or exists (
      select 1
      from public.tenant_members tm
      where tm.tenant_id::text = split_part(object_name, '/', 1)
        and tm.user_id = auth.uid()
    )
  );
$$;

revoke all on function private.create_tenant_site_profile() from public, anon, authenticated;
revoke all on function private.can_manage_tenant(uuid) from public, anon, authenticated;
revoke all on function private.can_manage_tenant_path(text) from public, anon, authenticated;

alter table public.tenant_site_profiles enable row level security;

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

grant select, insert, update on public.tenant_site_profiles to authenticated;

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
  if not private.can_manage_tenant(p_tenant_id) then
    raise exception 'tenant_access_denied';
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tenant-media',
  'tenant-media',
  true,
  52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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
