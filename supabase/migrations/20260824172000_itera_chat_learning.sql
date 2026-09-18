create table if not exists public.itera_chat_exchanges (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  tenant_slug text not null,
  language text not null,
  visitor_question text not null,
  assistant_answer text not null,
  conversation_context text,
  show_whatsapp boolean not null default false,
  knowledge_status text not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  search_document tsvector generated always as (
    to_tsvector('simple', coalesce(visitor_question, '') || ' ' || coalesce(assistant_answer, ''))
  ) stored,
  constraint itera_chat_tenant_slug_check
    check (tenant_slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'),
  constraint itera_chat_language_check check (language in ('pt', 'es', 'en')),
  constraint itera_chat_question_length_check
    check (char_length(visitor_question) between 1 and 300),
  constraint itera_chat_answer_length_check
    check (char_length(assistant_answer) between 1 and 1800),
  constraint itera_chat_context_length_check
    check (conversation_context is null or char_length(conversation_context) <= 40),
  constraint itera_chat_knowledge_status_check
    check (knowledge_status in ('pending', 'approved', 'rejected'))
);

create index if not exists itera_chat_exchanges_created_at_idx
  on public.itera_chat_exchanges (created_at desc);

create index if not exists itera_chat_exchanges_tenant_created_idx
  on public.itera_chat_exchanges (tenant_slug, created_at desc);

create index if not exists itera_chat_exchanges_reviewed_by_idx
  on public.itera_chat_exchanges (reviewed_by);

create index if not exists itera_chat_exchanges_search_idx
  on public.itera_chat_exchanges using gin (search_document);

alter table public.itera_chat_exchanges enable row level security;

revoke all on table public.itera_chat_exchanges from anon, authenticated;
grant insert on table public.itera_chat_exchanges to anon, authenticated;
grant select, update, delete on table public.itera_chat_exchanges to authenticated;

drop policy if exists itera_chat_insert_public on public.itera_chat_exchanges;
create policy itera_chat_insert_public
on public.itera_chat_exchanges
for insert
to anon, authenticated
with check (
  knowledge_status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists itera_chat_select_admin on public.itera_chat_exchanges;
create policy itera_chat_select_admin
on public.itera_chat_exchanges
for select
to authenticated
using ((select public.is_current_user_admin()));

drop policy if exists itera_chat_update_admin on public.itera_chat_exchanges;
create policy itera_chat_update_admin
on public.itera_chat_exchanges
for update
to authenticated
using ((select public.is_current_user_admin()))
with check ((select public.is_current_user_admin()));

drop policy if exists itera_chat_delete_admin on public.itera_chat_exchanges;
create policy itera_chat_delete_admin
on public.itera_chat_exchanges
for delete
to authenticated
using ((select public.is_current_user_admin()));

comment on table public.itera_chat_exchanges is
  'Historico sanitizado do Assistente iTERA. Respostas ficam pendentes ate revisao humana antes de alimentar a base oficial.';
