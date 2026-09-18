create index if not exists access_requests_reviewed_by_idx
  on public.access_requests (reviewed_by);

create index if not exists profiles_tenant_id_idx
  on public.profiles (tenant_id);

drop function if exists public.ensure_access_request(text, text, text);

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_platform_admin();
$$;

revoke all on function public.is_current_user_admin() from public, anon, authenticated;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists profiles_update_own_name on public.profiles;
create policy profiles_update_own_name
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists access_requests_update_own_details on public.access_requests;
create policy access_requests_update_own_details
  on public.access_requests for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update (full_name, updated_at) on public.profiles to authenticated;
grant update (full_name, requested_subdomain_slug, requested_business_name, updated_at)
  on public.access_requests to authenticated;
