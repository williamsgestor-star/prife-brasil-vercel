-- Limite de requisições (rate limit) compartilhado entre todas as instâncias da Vercel.
-- Rodar uma vez no Supabase: SQL Editor > colar este arquivo > Run.
-- Enquanto não rodar, o site continua funcionando com o limite em memória (mais fraco).
-- As chaves chegam como hash (nunca e-mail ou IP em texto puro).

create table if not exists public.api_rate_limits (
  key text primary key,
  hits integer not null default 0,
  reset_at timestamptz not null
);

create index if not exists api_rate_limits_reset_at_idx on public.api_rate_limits (reset_at);

-- Ninguém lê ou escreve na tabela direto: só pela função abaixo.
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.api_rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
  v_reset timestamptz;
begin
  if p_key is null
     or p_key !~ '^[a-z0-9-]{2,40}:[0-9a-f]{40}$'
     or p_max is null or p_max < 1 or p_max > 10000
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;

  insert into public.api_rate_limits as t (key, hits, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    hits = case when t.reset_at <= now() then 1 else t.hits + 1 end,
    reset_at = case when t.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else t.reset_at end
  returning t.hits, t.reset_at into v_hits, v_reset;

  -- Limpeza ocasional das janelas vencidas há mais de um dia.
  if random() < 0.01 then
    delete from public.api_rate_limits where reset_at < now() - interval '1 day';
  end if;

  allowed := v_hits <= p_max;
  retry_after := greatest(1, ceil(extract(epoch from (v_reset - now())))::integer);
  return next;
end;
$$;

revoke all on function public.api_rate_limit_hit(text, integer, integer) from public;
grant execute on function public.api_rate_limit_hit(text, integer, integer) to anon, authenticated, service_role;
