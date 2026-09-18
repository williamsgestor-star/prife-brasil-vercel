-- Editor visual seguro por subdomínio. O administrador controla conteúdo e aparência
-- sem permitir a injeção de HTML, JavaScript ou CSS arbitrário.

alter table public.tenant_site_profiles
  add column if not exists visual_settings jsonb not null default '{
    "colors":{"accent":"#20ddea","accentSecondary":"#49f3c6","background":"#020921","surface":"#071a43","text":"#f3fbff"},
    "fontFamily":"manrope","fontScale":100,"contentWidth":1240,"radius":22,
    "buttonStyle":"pill","cardStyle":"glass","motion":"full",
    "sections":["hero","about","global","products","gallery","leader","journey","faq","contact"],
    "hiddenSections":[],"texts":{}
  }'::jsonb;

alter table public.tenant_site_profiles
  drop constraint if exists tenant_site_profiles_visual_settings_object;
alter table public.tenant_site_profiles
  add constraint tenant_site_profiles_visual_settings_object
  check (jsonb_typeof(visual_settings) = 'object' and pg_column_size(visual_settings) <= 20000);

drop function if exists public.save_tenant_site_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text[],text[],text[],text[],text[],text[]);

create or replace function public.save_tenant_site_profile(
  p_tenant_id uuid,
  p_owner_full_name text,
  p_business_name text,
  p_public_email text,
  p_phone text,
  p_whatsapp text,
  p_whatsapp_country_code text,
  p_whatsapp_area_code text,
  p_whatsapp_local_number text,
  p_address text,
  p_description text,
  p_instagram_url text,
  p_facebook_url text,
  p_youtube_url text,
  p_logo_url text,
  p_cover_url text,
  p_leader_role text,
  p_leader_heading text,
  p_leader_quote text,
  p_leader_image_url text,
  p_gallery_urls text[],
  p_gallery_titles text[],
  p_gallery_descriptions text[],
  p_video_urls text[],
  p_video_titles text[],
  p_video_descriptions text[],
  p_visual_settings jsonb
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
  normalized_country_code text;
  normalized_area_code text;
  normalized_local_number text;
  normalized_whatsapp text;
begin
  if auth.uid() is null or not private.is_platform_admin() then raise exception 'admin_access_required'; end if;
  normalized_owner_name := nullif(trim(coalesce(p_owner_full_name, '')), '');
  normalized_business_name := nullif(trim(coalesce(p_business_name, '')), '');
  normalized_country_code := nullif(regexp_replace(coalesce(p_whatsapp_country_code, ''), '\\D', '', 'g'), '');
  normalized_area_code := nullif(regexp_replace(coalesce(p_whatsapp_area_code, ''), '\\D', '', 'g'), '');
  normalized_local_number := nullif(regexp_replace(coalesce(p_whatsapp_local_number, ''), '\\D', '', 'g'), '');
  normalized_whatsapp := concat_ws('', normalized_country_code, normalized_area_code, normalized_local_number);
  if normalized_owner_name is null then raise exception 'owner_name_required'; end if;
  if normalized_business_name is null then raise exception 'business_name_required'; end if;
  if normalized_country_code is null or normalized_local_number is null then raise exception 'whatsapp_required'; end if;
  if cardinality(coalesce(p_gallery_urls, '{}')) > 12 then raise exception 'gallery_limit'; end if;
  if cardinality(coalesce(p_video_urls, '{}')) > 6 then raise exception 'video_limit'; end if;
  if jsonb_typeof(coalesce(p_visual_settings, '{}'::jsonb)) <> 'object' or pg_column_size(coalesce(p_visual_settings, '{}'::jsonb)) > 20000 then raise exception 'invalid_visual_settings'; end if;

  select owner_user_id into target_owner_user_id from public.tenants where id = p_tenant_id and status = 'active' for update;
  if target_owner_user_id is null then raise exception 'active_tenant_not_found'; end if;
  update public.tenants set display_name = normalized_business_name, updated_at = now() where id = p_tenant_id;
  update public.profiles set full_name = normalized_owner_name, updated_at = now() where id = target_owner_user_id;

  insert into public.tenant_site_profiles (
    tenant_id, public_email, phone, whatsapp, whatsapp_country_code, whatsapp_area_code, whatsapp_local_number,
    address, description, instagram_url, facebook_url, youtube_url, logo_url, cover_url,
    leader_role, leader_heading, leader_quote, leader_image_url,
    gallery_urls, gallery_titles, gallery_descriptions, video_urls, video_titles, video_descriptions,
    visual_settings, updated_by, updated_at
  ) values (
    p_tenant_id, nullif(trim(coalesce(p_public_email, '')), ''), nullif(trim(coalesce(p_phone, '')), ''), normalized_whatsapp,
    normalized_country_code, normalized_area_code, normalized_local_number,
    nullif(trim(coalesce(p_address, '')), ''), nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_instagram_url, '')), ''), nullif(trim(coalesce(p_facebook_url, '')), ''), nullif(trim(coalesce(p_youtube_url, '')), ''),
    nullif(trim(coalesce(p_logo_url, '')), ''), nullif(trim(coalesce(p_cover_url, '')), ''), nullif(trim(coalesce(p_leader_role, '')), ''),
    nullif(trim(coalesce(p_leader_heading, '')), ''), nullif(trim(coalesce(p_leader_quote, '')), ''), nullif(trim(coalesce(p_leader_image_url, '')), ''),
    coalesce(p_gallery_urls, '{}'), coalesce(p_gallery_titles, '{}'), coalesce(p_gallery_descriptions, '{}'),
    coalesce(p_video_urls, '{}'), coalesce(p_video_titles, '{}'), coalesce(p_video_descriptions, '{}'),
    coalesce(p_visual_settings, '{}'::jsonb), auth.uid(), now()
  ) on conflict (tenant_id) do update set
    public_email=excluded.public_email, phone=excluded.phone, whatsapp=excluded.whatsapp,
    whatsapp_country_code=excluded.whatsapp_country_code, whatsapp_area_code=excluded.whatsapp_area_code, whatsapp_local_number=excluded.whatsapp_local_number,
    address=excluded.address, description=excluded.description, instagram_url=excluded.instagram_url, facebook_url=excluded.facebook_url,
    youtube_url=excluded.youtube_url, logo_url=excluded.logo_url, cover_url=excluded.cover_url, leader_role=excluded.leader_role,
    leader_heading=excluded.leader_heading, leader_quote=excluded.leader_quote, leader_image_url=excluded.leader_image_url,
    gallery_urls=excluded.gallery_urls, gallery_titles=excluded.gallery_titles, gallery_descriptions=excluded.gallery_descriptions,
    video_urls=excluded.video_urls, video_titles=excluded.video_titles, video_descriptions=excluded.video_descriptions,
    visual_settings=excluded.visual_settings, updated_by=auth.uid(), updated_at=now()
  returning * into result;
  return result;
end;
$$;

revoke all on function public.save_tenant_site_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text[],text[],text[],text[],text[],text[],jsonb) from public, anon, authenticated;
grant execute on function public.save_tenant_site_profile(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text[],text[],text[],text[],text[],text[],jsonb) to authenticated;

drop function if exists public.get_public_tenant_site_profile(text);
create function public.get_public_tenant_site_profile(p_slug text)
returns table (
  slug text, business_name text, owner_name text,
  whatsapp_country_code text, whatsapp_area_code text, whatsapp_local_number text, whatsapp text,
  description text, instagram_url text, youtube_url text, leader_role text, leader_heading text,
  leader_quote text, leader_image_url text, gallery_urls text[], gallery_titles text[], gallery_descriptions text[],
  video_urls text[], video_titles text[], video_descriptions text[], visual_settings jsonb, updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select t.slug, t.display_name, p.full_name,
         sp.whatsapp_country_code, sp.whatsapp_area_code, sp.whatsapp_local_number, sp.whatsapp,
         sp.description, sp.instagram_url, sp.youtube_url, sp.leader_role, sp.leader_heading,
         sp.leader_quote, sp.leader_image_url, sp.gallery_urls, sp.gallery_titles, sp.gallery_descriptions,
         sp.video_urls, sp.video_titles, sp.video_descriptions, sp.visual_settings, sp.updated_at
  from public.tenants t join public.profiles p on p.id = t.owner_user_id
  join public.tenant_site_profiles sp on sp.tenant_id = t.id
  where t.slug = lower(trim(p_slug)) and t.status = 'active' limit 1;
$$;
revoke all on function public.get_public_tenant_site_profile(text) from public, anon, authenticated;
grant execute on function public.get_public_tenant_site_profile(text) to anon, authenticated;

create or replace function public.apply_tenant_visual_settings_to_all(p_source_tenant_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare source_settings jsonb; affected integer;
begin
  if auth.uid() is null or not private.is_platform_admin() then raise exception 'admin_access_required'; end if;
  select visual_settings into source_settings from public.tenant_site_profiles where tenant_id = p_source_tenant_id;
  if source_settings is null then raise exception 'source_profile_not_found'; end if;
  update public.tenant_site_profiles set visual_settings = source_settings, updated_by = auth.uid(), updated_at = now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.apply_tenant_visual_settings_to_all(uuid) from public, anon, authenticated;
grant execute on function public.apply_tenant_visual_settings_to_all(uuid) to authenticated;
