alter table public.tenant_features
  add column if not exists crm_stage_labels jsonb not null default '{}'::jsonb;

alter table public.tenant_features
  drop constraint if exists tenant_features_crm_stage_labels_valid;
alter table public.tenant_features
  add constraint tenant_features_crm_stage_labels_valid
  check (
    jsonb_typeof(crm_stage_labels) = 'object'
    and octet_length(crm_stage_labels::text) <= 2048
  );

revoke update on table public.tenant_features from anon, authenticated;
grant update (crm_stage_labels, updated_at) on table public.tenant_features to authenticated;

drop policy if exists tenant_features_update_crm_labels on public.tenant_features;
create policy tenant_features_update_crm_labels
  on public.tenant_features
  for update
  to authenticated
  using (
    (select private.is_platform_admin())
    or (select private.is_tenant_member(tenant_id))
  )
  with check (
    (select private.is_platform_admin())
    or (select private.is_tenant_member(tenant_id))
  );
