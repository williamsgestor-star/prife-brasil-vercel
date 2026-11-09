-- Checklist legal (LGPD) — mudança só ADITIVA, não altera nem apaga dados existentes.
--
-- 1) public.legal_acceptances: guarda a prova do aceite dos Termos de uso e da Política de
--    Privacidade (e, separado, do consentimento de marketing) feito pelo distribuidor na
--    solicitação de acesso: data/hora, versão do texto, texto exato mostrado e origem (site).
--    Cada pessoa só grava e lê os próprios registros; o administrador da plataforma lê todos.
--    Não há UPDATE nem DELETE para usuários: o registro é a prova e não pode ser editado.
--
-- 2) public.crm_contact_blocklist: lista de bloqueio "não contatar" de cada empresa (tenant).
--    Guarda só o telefone codificado (SHA-256 dos dígitos), sem nome nem outros dados.
--    O Prospector e a importação de CSV deixam de colocar esses números no CRM de novo.

create table if not exists public.legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text check (user_email is null or char_length(user_email) <= 320),
  document text not null check (document in ('termos_privacidade', 'marketing')),
  version text not null check (char_length(version) between 1 and 80),
  accepted boolean not null,
  accepted_text text not null check (char_length(accepted_text) between 1 and 2000),
  origin text not null check (char_length(origin) between 1 and 300),
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists legal_acceptances_user_created_idx
  on public.legal_acceptances (user_id, created_at desc);

alter table public.legal_acceptances enable row level security;

revoke all on public.legal_acceptances from public, anon;
grant select, insert on public.legal_acceptances to authenticated;

drop policy if exists legal_acceptances_insert_own on public.legal_acceptances;
create policy legal_acceptances_insert_own
  on public.legal_acceptances for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists legal_acceptances_select_own_or_admin on public.legal_acceptances;
create policy legal_acceptances_select_own_or_admin
  on public.legal_acceptances for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_platform_admin()));

create table if not exists public.crm_contact_blocklist (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  phone_hash text not null check (phone_hash ~ '^[0-9a-f]{64}$'),
  reason text check (reason is null or char_length(reason) <= 300),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, phone_hash)
);

alter table public.crm_contact_blocklist enable row level security;

revoke all on public.crm_contact_blocklist from public, anon;
grant select, insert, delete on public.crm_contact_blocklist to authenticated;

drop policy if exists crm_contact_blocklist_select_managed on public.crm_contact_blocklist;
create policy crm_contact_blocklist_select_managed
  on public.crm_contact_blocklist for select to authenticated
  using ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)));

drop policy if exists crm_contact_blocklist_insert_managed on public.crm_contact_blocklist;
create policy crm_contact_blocklist_insert_managed
  on public.crm_contact_blocklist for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and ((select private.is_platform_admin()) or (select private.is_tenant_member(tenant_id)))
  );

-- Só o administrador da plataforma pode tirar um número da lista (ex.: a pessoa voltou a autorizar).
drop policy if exists crm_contact_blocklist_delete_admin on public.crm_contact_blocklist;
create policy crm_contact_blocklist_delete_admin
  on public.crm_contact_blocklist for delete to authenticated
  using ((select private.is_platform_admin()));
