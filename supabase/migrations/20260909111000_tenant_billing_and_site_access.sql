-- Controle de ativacao, mensalidade e bloqueio automatico por vencimento.
alter table public.tenants
  add column if not exists site_enabled boolean not null default true,
  add column if not exists billing_started_at timestamptz not null default now(),
  add column if not exists billing_due_at timestamptz not null default (now() + interval '30 days'),
  add column if not exists activation_fee numeric(10,2) not null default 500.00,
  add column if not exists monthly_fee numeric(10,2) not null default 29.90,
  add column if not exists last_payment_at timestamptz,
  add column if not exists billing_exempt boolean not null default false;

update public.tenants
set billing_started_at = now(),
    billing_due_at = now() + interval '30 days',
    activation_fee = 500.00,
    monthly_fee = 29.90
where slug <> 'williams';

-- O tenant Williams tambem atende o dominio principal www.prife-brasil.com.
-- Por isso o principal fica isento do bloqueio automatico de mensalidade.
update public.tenants
set billing_exempt = true,
    site_enabled = true,
    activation_fee = 500.00,
    monthly_fee = 29.90
where slug = 'williams';

create or replace function public.admin_set_tenant_site_enabled(
  p_tenant_id uuid,
  p_enabled boolean
)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.tenants;
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'admin_access_required';
  end if;

  update public.tenants
     set site_enabled = coalesce(p_enabled, false),
         updated_at = now()
   where id = p_tenant_id
  returning * into result;

  if result.id is null then raise exception 'tenant_not_found'; end if;
  return result;
end;
$$;

revoke all on function public.admin_set_tenant_site_enabled(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_tenant_site_enabled(uuid, boolean) to authenticated;

create or replace function public.admin_mark_tenant_monthly_paid(p_tenant_id uuid)
returns public.tenants
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.tenants;
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'admin_access_required';
  end if;

  update public.tenants
     set last_payment_at = now(),
         billing_due_at = greatest(billing_due_at, now()) + interval '30 days',
         site_enabled = true,
         updated_at = now()
   where id = p_tenant_id
  returning * into result;

  if result.id is null then raise exception 'tenant_not_found'; end if;
  return result;
end;
$$;

revoke all on function public.admin_mark_tenant_monthly_paid(uuid) from public, anon, authenticated;
grant execute on function public.admin_mark_tenant_monthly_paid(uuid) to authenticated;

create or replace function public.get_public_tenant_site_profile(p_slug text)
returns table (
  slug text,
  business_name text,
  owner_name text,
  public_email text,
  whatsapp_country_code text,
  whatsapp_area_code text,
  whatsapp_local_number text,
  whatsapp text,
  description text,
  instagram_url text,
  youtube_url text,
  leader_role text,
  leader_heading text,
  leader_quote text,
  leader_image_url text,
  gallery_urls text[],
  gallery_titles text[],
  gallery_descriptions text[],
  video_urls text[],
  video_titles text[],
  video_descriptions text[],
  visual_settings jsonb,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.slug, t.display_name, p.full_name,
         sp.public_email,
         sp.whatsapp_country_code, sp.whatsapp_area_code, sp.whatsapp_local_number, sp.whatsapp,
         sp.description, sp.instagram_url, sp.youtube_url, sp.leader_role, sp.leader_heading,
         sp.leader_quote, sp.leader_image_url, sp.gallery_urls, sp.gallery_titles, sp.gallery_descriptions,
         sp.video_urls, sp.video_titles, sp.video_descriptions, sp.visual_settings, sp.updated_at
  from public.tenants t
  join public.profiles p on p.id = t.owner_user_id
  join public.tenant_site_profiles sp on sp.tenant_id = t.id
  where t.slug = lower(trim(p_slug))
    and t.status = 'active'
    and t.site_enabled = true
    and (t.billing_exempt = true or t.billing_due_at >= now())
  limit 1;
$$;

revoke all on function public.get_public_tenant_site_profile(text) from public, anon, authenticated;
grant execute on function public.get_public_tenant_site_profile(text) to anon, authenticated;
