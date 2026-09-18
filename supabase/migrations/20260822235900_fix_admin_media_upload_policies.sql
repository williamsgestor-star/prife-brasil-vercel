-- Keep tenant media writes restricted to platform administrators without
-- requiring RLS to execute private tenant helper functions.

drop policy if exists tenant_site_profiles_select_managed on public.tenant_site_profiles;
create policy tenant_site_profiles_select_managed
  on public.tenant_site_profiles for select to authenticated
  using ((select private.is_platform_admin()));

drop policy if exists tenant_site_profiles_insert_managed on public.tenant_site_profiles;
create policy tenant_site_profiles_insert_managed
  on public.tenant_site_profiles for insert to authenticated
  with check ((select private.is_platform_admin()));

drop policy if exists tenant_site_profiles_update_managed on public.tenant_site_profiles;
create policy tenant_site_profiles_update_managed
  on public.tenant_site_profiles for update to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));

drop policy if exists tenant_media_select_managed on storage.objects;
create policy tenant_media_select_managed
  on storage.objects for select to authenticated
  using (
    bucket_id = 'tenant-media'
    and (select private.is_platform_admin())
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(leader|cover|logo|gallery|videos)/[0-9a-f-]{36}\.[a-z0-9]{1,10}$'
  );

drop policy if exists tenant_media_insert_managed on storage.objects;
create policy tenant_media_insert_managed
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tenant-media'
    and (select private.is_platform_admin())
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(leader|cover|logo|gallery|videos)/[0-9a-f-]{36}\.[a-z0-9]{1,10}$'
  );

drop policy if exists tenant_media_update_managed on storage.objects;
create policy tenant_media_update_managed
  on storage.objects for update to authenticated
  using (
    bucket_id = 'tenant-media'
    and (select private.is_platform_admin())
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(leader|cover|logo|gallery|videos)/[0-9a-f-]{36}\.[a-z0-9]{1,10}$'
  )
  with check (
    bucket_id = 'tenant-media'
    and (select private.is_platform_admin())
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(leader|cover|logo|gallery|videos)/[0-9a-f-]{36}\.[a-z0-9]{1,10}$'
  );

drop policy if exists tenant_media_delete_managed on storage.objects;
create policy tenant_media_delete_managed
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tenant-media'
    and (select private.is_platform_admin())
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/(leader|cover|logo|gallery|videos)/[0-9a-f-]{36}\.[a-z0-9]{1,10}$'
  );
