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
