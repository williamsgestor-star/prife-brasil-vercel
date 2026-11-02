import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('franquia do Prospector só devolve créditos de uma reserva registrada', async () => {
  const sql = await read('supabase/migrations/20261102040318_prospector_quota_reservations.sql');
  assert.match(sql, /create table if not exists private\.prospector_quota_reservations/);
  assert.match(sql, /alter table private\.prospector_quota_reservations enable row level security/);
  assert.match(sql, /reservation_id uuid/);
  // A reserva precisa ser do mesmo usuário e empresa e ainda estar aberta.
  assert.match(sql, /x\.tenant_id = resolved_tenant_id\s+and x\.user_id = auth\.uid\(\)\s+and x\.settled_at is null\s+for update/);
  assert.match(sql, /raise exception 'reservation_not_found'/);
  // Quantidade vem do banco, não do cliente.
  assert.match(sql, /order by u\.ord limit v_reserved/);
  assert.doesNotMatch(sql, /p_reserved_count integer,\s*p_delivered_count/);
  // Limite por empresa volta a valer.
  assert.match(sql, /prospector_monthly_lead_limit/);
  assert.match(sql, /prospector_unlimited/);
  // Funções antigas que devolviam créditos perdem o acesso de usuários logados.
  assert.match(sql, /revoke execute on function public\.release_prospector_daily_leads\(integer\) from public, anon, authenticated/);
  assert.match(sql, /revoke execute on function public\.save_prospector_candidates\(/);
  assert.match(sql, /revoke execute on function public\.reserve_google_places_search\(\)/);
  for (const fn of sql.matchAll(/create (?:or replace )?function ([\w.]+)\([^)]*\)[\s\S]*?as \$\$/g)) {
    if (/security definer/.test(fn[0])) assert.match(fn[0], /set search_path = ''/, `${fn[1]} sem search_path`);
  }
});

test('etapa 2 remove as versões antigas por quantidade', async () => {
  const sql = await read('supabase/migrations/20261102050000_prospector_quota_drop_legacy.sql');
  assert.match(sql, /drop function if exists public\.settle_prospector_quota\(integer, integer, integer\)/);
  assert.match(sql, /drop function if exists public\.save_external_prospector_candidates\(text, text, jsonb, jsonb, integer, integer\)/);
  assert.match(sql, /update private\.prospector_quota_reservations\s+set settled_at = now\(\)\s+where settled_at is null/);
  assert.match(sql, /versao_antiga_da_franquia_ainda_existe/);
});

test('rota do Prospector usa o id da reserva', async () => {
  const route = await read('app/api/leads/route.ts');
  assert.match(route, /reservation\?\.reservation_id/);
  assert.match(route, /p_reservation_id: reservationId/);
  assert.doesNotMatch(route, /p_reserved_count:/);
});
