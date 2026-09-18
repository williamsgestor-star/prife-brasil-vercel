begin;

alter table public.itera_chat_exchanges
  add column if not exists session_key_hash text;

alter table public.itera_chat_exchanges
  drop constraint if exists itera_chat_session_key_hash_format;

alter table public.itera_chat_exchanges
  add constraint itera_chat_session_key_hash_format
  check (session_key_hash is null or session_key_hash ~ '^[0-9a-f]{64}$');

create index if not exists itera_chat_session_memory_idx
  on public.itera_chat_exchanges (session_id, tenant_slug, language, created_at desc)
  where session_key_hash is not null;

grant select on public.itera_chat_exchanges to anon;

drop policy if exists itera_chat_select_own_session on public.itera_chat_exchanges;
create policy itera_chat_select_own_session
  on public.itera_chat_exchanges
  for select
  to anon
  using (
    session_key_hash is not null
    and session_key_hash = coalesce(
      (current_setting('request.headers', true)::json ->> 'x-itera-session-hash'),
      ''
    )
  );

commit;
