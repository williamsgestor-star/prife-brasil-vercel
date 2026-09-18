drop policy if exists itera_chat_select_own_session on public.itera_chat_exchanges;
create policy itera_chat_select_own_session
  on public.itera_chat_exchanges
  for select
  to anon
  using (
    session_key_hash is not null
    and session_key_hash = (
      select coalesce(
        current_setting('request.headers', true)::json ->> 'x-itera-session-hash',
        ''
      )
    )
  );
