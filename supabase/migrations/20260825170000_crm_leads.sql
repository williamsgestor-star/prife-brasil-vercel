create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  source_id text,
  company_name text not null check (char_length(trim(company_name)) between 1 and 180),
  segment text,
  phone text not null check (char_length(regexp_replace(phone, '\\D', '', 'g')) between 7 and 18),
  whatsapp text,
  email text,
  address text,
  website text,
  source text,
  source_url text,
  status text not null default 'novo' check (status in ('novo', 'contatado', 'interessado', 'proposta', 'fechado', 'perdido')),
  notes text,
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, phone)
);

create index if not exists crm_leads_tenant_status_idx
  on public.crm_leads (tenant_id, status, created_at desc);

alter table public.crm_leads enable row level security;

revoke all on public.crm_leads from public, anon;
grant select, insert, update, delete on public.crm_leads to authenticated;

drop policy if exists crm_leads_select_managed on public.crm_leads;
create policy crm_leads_select_managed
  on public.crm_leads for select to authenticated
  using ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)));

drop policy if exists crm_leads_insert_managed on public.crm_leads;
create policy crm_leads_insert_managed
  on public.crm_leads for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)))
  );

drop policy if exists crm_leads_update_managed on public.crm_leads;
create policy crm_leads_update_managed
  on public.crm_leads for update to authenticated
  using ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)))
  with check ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)));

drop policy if exists crm_leads_delete_managed on public.crm_leads;
create policy crm_leads_delete_managed
  on public.crm_leads for delete to authenticated
  using ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)));
