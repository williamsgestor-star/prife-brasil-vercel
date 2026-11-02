-- Franquia do Prospector com reservas registradas (etapa 2 de 2).
--
-- Por quê: as versões antigas destas funções recebiam a quantidade reservada do
-- próprio cliente e deixavam ele devolver créditos que nunca reservou. Elas só
-- ficaram no ar enquanto o código antigo estava em produção.
--
-- Aplicar SOMENTE depois que o PR que passa p_reservation_id estiver na main e o
-- deploy da Vercel terminar; antes disso a busca por OpenStreetMap em produção quebra.

drop function if exists public.settle_prospector_quota(integer, integer, integer);
drop function if exists public.save_external_prospector_candidates(text, text, jsonb, jsonb, integer, integer);

-- Reservas abertas durante a etapa 1 podem ter sido "devolvidas" pelas funções
-- antigas sem serem fechadas. Fechamos todas para que não rendam crédito de novo.
-- Uma busca em andamento neste instante perde no máximo a própria reserva (até 20).
update private.prospector_quota_reservations
set settled_at = now()
where settled_at is null;

-- Garante que nenhuma versão por quantidade sobrou com outra assinatura.
do $check$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('settle_prospector_quota', 'save_external_prospector_candidates')
      and not ('uuid'::regtype = any (p.proargtypes::oid[]::regtype[]))
  ) then
    raise exception 'versao_antiga_da_franquia_ainda_existe';
  end if;
end;
$check$;
