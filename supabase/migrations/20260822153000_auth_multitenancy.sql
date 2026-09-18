create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists private.platform_admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

insert into private.platform_admins (email)
values ('williams.gestor@gmail.com')
on conflict (email) do nothing;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  display_name text not null check (char_length(display_name) between 2 and 120),
  owner_user_id uuid not null unique references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  tenant_id uuid references public.tenants(id) on delete set null,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  requested_subdomain_slug text check (
    requested_subdomain_slug is null or
    requested_subdomain_slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
  ),
  requested_business_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create unique index if not exists tenant_members_one_owner_per_tenant
  on public.tenant_members (tenant_id)
  where role = 'owner';

create unique index if not exists tenant_members_one_tenant_per_owner
  on public.tenant_members (user_id)
  where role = 'owner';

create table if not exists public.tenant_features (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  prospector_enabled boolean not null default true,
  ponto_vivo_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.platform_admins a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function private.is_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.tenant_members tm
    where tm.tenant_id = target_tenant_id
      and tm.user_id = auth.uid()
  );
$$;

revoke all on function private.is_platform_admin() from public, anon, authenticated;
revoke all on function private.is_tenant_member(uuid) from public, anon, authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_tenant_member(uuid) to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_name text;
begin
  resolved_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '');

  insert into public.profiles (id, email, full_name)
  values (new.id, lower(coalesce(new.email, '')), resolved_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = now();

  insert into public.access_requests (user_id, email, full_name)
  values (new.id, lower(coalesce(new.email, '')), resolved_name)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

create or replace function public.ensure_access_request(
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
  result public.access_requests;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  normalized_slug := lower(trim(p_requested_subdomain_slug));
  if normalized_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then
    raise exception 'invalid_subdomain';
  end if;

  update public.profiles
     set full_name = nullif(trim(p_full_name), ''),
         updated_at = now()
   where id = auth.uid();

  insert into public.access_requests (
    user_id,
    email,
    full_name,
    requested_subdomain_slug,
    requested_business_name,
    status,
    reviewed_by,
    reviewed_at,
    updated_at
  )
  values (
    auth.uid(),
    lower(coalesce(auth.jwt() ->> 'email', '')),
    nullif(trim(p_full_name), ''),
    normalized_slug,
    nullif(trim(p_requested_business_name), ''),
    'pending',
    null,
    null,
    now()
  )
  on conflict (user_id) do update
    set full_name = excluded.full_name,
        requested_subdomain_slug = excluded.requested_subdomain_slug,
        requested_business_name = excluded.requested_business_name,
        status = case when public.access_requests.status = 'approved' then 'approved' else 'pending' end,
        reviewed_by = case when public.access_requests.status = 'approved' then public.access_requests.reviewed_by else null end,
        reviewed_at = case when public.access_requests.status = 'approved' then public.access_requests.reviewed_at else null end,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.approve_access_request(
  p_request_id uuid,
  p_tenant_slug text,
  p_tenant_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.access_requests;
  new_tenant_id uuid;
  normalized_slug text;
begin
  if not private.is_platform_admin() then
    raise exception 'admin_required';
  end if;

  normalized_slug := lower(trim(p_tenant_slug));
  if normalized_slug !~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$' then
    raise exception 'invalid_subdomain';
  end if;

  select * into request_row
  from public.access_requests
  where id = p_request_id and status = 'pending'
  for update;

  if request_row.id is null then
    raise exception 'pending_request_not_found';
  end if;

  insert into public.tenants (slug, display_name, owner_user_id)
  values (normalized_slug, trim(p_tenant_name), request_row.user_id)
  returning id into new_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (new_tenant_id, request_row.user_id, 'owner');

  insert into public.tenant_features (tenant_id)
  values (new_tenant_id);

  update public.profiles
     set tenant_id = new_tenant_id,
         approval_status = 'approved',
         updated_at = now()
   where id = request_row.user_id;

  update public.access_requests
     set status = 'approved',
         requested_subdomain_slug = normalized_slug,
         requested_business_name = trim(p_tenant_name),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   where id = request_row.id;

  return new_tenant_id;
end;
$$;

create or replace function public.reject_access_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  if not private.is_platform_admin() then
    raise exception 'admin_required';
  end if;

  update public.access_requests
     set status = 'rejected',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   where id = p_request_id and status = 'pending'
  returning user_id into target_user_id;

  if target_user_id is null then
    raise exception 'pending_request_not_found';
  end if;

  update public.profiles
     set approval_status = 'rejected',
         updated_at = now()
   where id = target_user_id;
end;
$$;

revoke all on function public.is_current_user_admin() from public, anon, authenticated;
revoke all on function public.ensure_access_request(text, text, text) from public, anon, authenticated;
revoke all on function public.approve_access_request(uuid, text, text) from public, anon, authenticated;
revoke all on function public.reject_access_request(uuid) from public, anon, authenticated;

grant execute on function public.is_current_user_admin() to authenticated;
grant execute on function public.ensure_access_request(text, text, text) to authenticated;
grant execute on function public.approve_access_request(uuid, text, text) to authenticated;
grant execute on function public.reject_access_request(uuid) to authenticated;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.access_requests enable row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_features enable row level security;

drop policy if exists tenants_select_authorized on public.tenants;
create policy tenants_select_authorized
  on public.tenants for select
  to authenticated
  using (private.is_platform_admin() or private.is_tenant_member(id));

drop policy if exists profiles_select_authorized on public.profiles;
create policy profiles_select_authorized
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or private.is_platform_admin());

drop policy if exists access_requests_select_authorized on public.access_requests;
create policy access_requests_select_authorized
  on public.access_requests for select
  to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());

drop policy if exists tenant_members_select_authorized on public.tenant_members;
create policy tenant_members_select_authorized
  on public.tenant_members for select
  to authenticated
  using (user_id = (select auth.uid()) or private.is_platform_admin());

drop policy if exists tenant_features_select_authorized on public.tenant_features;
create policy tenant_features_select_authorized
  on public.tenant_features for select
  to authenticated
  using (private.is_platform_admin() or private.is_tenant_member(tenant_id));

grant select on public.tenants to authenticated;
grant select on public.profiles to authenticated;
grant select on public.access_requests to authenticated;
grant select on public.tenant_members to authenticated;
grant select on public.tenant_features to authenticated;
