begin;

create table if not exists public.crm_ai_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.crm_leads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  mode text not null default 'ask' check (mode in ('ask','outreach','objection','followup','client')),
  product text,
  content text not null check (char_length(content) between 1 and 4000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crm_ai_messages_tenant_user_created_idx
  on public.crm_ai_messages (tenant_id, user_id, created_at desc);

create index if not exists crm_ai_messages_lead_created_idx
  on public.crm_ai_messages (lead_id, created_at desc)
  where lead_id is not null;

alter table public.crm_ai_messages enable row level security;

revoke all on public.crm_ai_messages from public, anon;
grant select, insert, delete on public.crm_ai_messages to authenticated;

drop policy if exists crm_ai_messages_select_own on public.crm_ai_messages;
create policy crm_ai_messages_select_own
  on public.crm_ai_messages for select to authenticated
  using (
    user_id = (select auth.uid())
    and (
      (select private.is_platform_admin())
      or (select private.is_tenant_member(tenant_id))
    )
  );

drop policy if exists crm_ai_messages_insert_own on public.crm_ai_messages;
create policy crm_ai_messages_insert_own
  on public.crm_ai_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (select private.is_platform_admin())
      or (select private.is_tenant_member(tenant_id))
    )
    and (
      lead_id is null
      or exists (
        select 1
        from public.crm_leads lead
        where lead.id = lead_id
          and lead.tenant_id = crm_ai_messages.tenant_id
      )
    )
  );

drop policy if exists crm_ai_messages_delete_own on public.crm_ai_messages;
create policy crm_ai_messages_delete_own
  on public.crm_ai_messages for delete to authenticated
  using (
    user_id = (select auth.uid())
    and (
      (select private.is_platform_admin())
      or (select private.is_tenant_member(tenant_id))
    )
  );

commit;
