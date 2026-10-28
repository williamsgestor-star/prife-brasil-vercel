---
name: nova-migracao
description: Cria e aplica uma nova migração do Supabase da Prife Brasil mantendo o arquivo do repositório e o histórico do banco com o mesmo número. Use quando o Williams pedir uma mudança no banco (tabela, coluna, função, política, índice, bucket).
disable-model-invocation: true
---

# Nova migração (Prife Brasil)

Projeto Supabase: `jmingbhpyyfsganoougf`. O histórico do banco foi alinhado com `supabase/migrations/` em 28/10/2026. Esta skill existe para ele não sair de sincronia de novo.

## Passos
1. **Entenda o estado atual** antes de escrever SQL: leia as migrações relacionadas e consulte o banco (Supabase MCP `list_tables` / `execute_sql` só leitura).
2. **Crie o arquivo** `supabase/migrations/<AAAAMMDDHHMMSS>_<nome_em_snake_case>.sql` com a hora atual em UTC (`date -u +%Y%m%d%H%M%S`). Nunca edite uma migração existente.
3. **Escreva o SQL seguindo as regras**:
   - idempotente sempre que possível (`if not exists`, `create or replace`);
   - tabela nova em `public`: `enable row level security` + políticas com `(select auth.uid())`;
   - função `SECURITY DEFINER`: `set search_path = ''`, nomes totalmente qualificados e checagem de admin/dono do tenant antes de escrever;
   - revogue `execute` de `anon` em funções que não são públicas;
   - comentário no topo explicando o porquê em português.
4. **Mostre o SQL ao Williams e espere o "ok"**. É banco de produção.
5. **Aplique com o mesmo número do arquivo**:
   - rode o conteúdo do arquivo com `execute_sql`;
   - registre no histórico: `insert into supabase_migrations.schema_migrations (version, name, statements) values ('<AAAAMMDDHHMMSS>', '<nome>', array[]::text[]) on conflict (version) do nothing;`
   - não use `apply_migration` do MCP: ele grava um número diferente do arquivo e dessincroniza o histórico.
6. **Confira**: consulte o objeto criado e rode `get_advisors` (security) para pegar RLS faltando.
7. **Atualize os testes** em `tests/` se a migração mudar uma regra que já é testada, e rode `node --test tests/*.test.mjs`.
8. Commit do arquivo em uma branch e PR com prévia; nada direto na `main`.
