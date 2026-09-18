# Notas de publicação — Prife Brasil

Atualizado em 24/08/2026 para a publicação definitiva.

## Backend confirmado

- Projeto Supabase: `jmingbhpyyfsganoougf`
- URL: `https://jmingbhpyyfsganoougf.supabase.co`
- Estado verificado: ativo e saudável
- Região: `us-east-2`
- Banco: PostgreSQL 17

## Variáveis do Site

Configure na hospedagem, sem gravar valores privados no repositório:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jmingbhpyyfsganoougf.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave publica conectada>
GOOGLE_PLACES_API_KEY=<opcional>
```

A chave `service_role` não é necessária para este Site e não deve ser colocada no navegador.

## Estado do banco verificado

O banco existente já contém as tabelas e funções usadas pelo código:

- `public.tenants`
- `public.profiles`
- `public.access_requests`
- `public.tenant_members`
- `public.tenant_features`
- `public.tenant_site_profiles`
- bucket público `tenant-media`

As tabelas públicas estão com RLS habilitado. O banco possui dados ativos de usuários, tenants e arquivos; portanto, ele deve ser reutilizado e não recriado.

## Migrações: não executar automaticamente

O histórico registrado no Supabase possui versões diferentes dos nomes/timestamps exportados no pacote, embora o esquema final necessário já esteja presente. Não execute em lote a pasta `supabase/migrations/` na publicação temporária sem reconciliação manual.

Migrações registradas no projeto conectado:

- `20260822152525_auth_multitenancy`
- `20260822153221_auth_hardening`
- `20260822230013_visual_site_builder`
- `20260822230145_remove_legacy_site_profile_rpc`
- `20260822232442_fix_admin_media_upload_policies`

## URL definitiva e autenticação

URL canônica configurada na aplicação: `https://prife-brasil.com`

1. A URL acima está configurada na hospedagem como `NEXT_PUBLIC_SITE_URL`.
2. Mantenha a origem definitiva e o callback abaixo nas URLs permitidas no Supabase Auth:
   - `https://prife-brasil.com`
   - `https://prife-brasil.com/auth/callback`
   - `https://www.prife-brasil.com`
   - `https://www.prife-brasil.com/auth/callback`
   - `https://damasceno.prife-brasil.com`
   - `https://damasceno.prife-brasil.com/auth/callback`
3. Teste o fluxo OTP por e-mail em `/login`.
4. Teste `/admin/acessos`, `/admin/empresas`, `/painel`, `/leads` e `/ponto-vivo`.
5. Preserve a URL temporária como fallback até a validação completa dos domínios definitivos.

## Observações de segurança

O Supabase Advisor sinalizou que `private.platform_admins` está sem RLS. Não foi aplicada correção automática porque habilitar RLS sem revisar políticas pode bloquear fluxos administrativos. O esquema `private` tem privilégios restritos no SQL exportado, e as funções administrativas verificam `private.is_platform_admin()`, mas a advertência deve ser revisada antes da troca definitiva do domínio.

O Advisor também sinalizou funções `SECURITY DEFINER`. No código exportado:

- `get_public_tenant_site_profile` é pública de propósito e retorna somente o perfil público do tenant ativo.
- As funções administrativas verificam autenticação e `private.is_platform_admin()` antes de alterar dados.

Nenhuma alteração de segurança foi aplicada durante a transferência para evitar mudança de comportamento.
