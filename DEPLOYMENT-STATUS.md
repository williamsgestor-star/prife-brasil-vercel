# Status de publicação — Prife Brasil

Data: 24/08/2026

## Supabase conectado

- Projeto: `jmingbhpyyfsganoougf`
- Status: `ACTIVE_HEALTHY`
- Região: `us-east-2`
- PostgreSQL: `17`
- URL: `https://jmingbhpyyfsganoougf.supabase.co`
- Chave configurada: chave moderna `sb_publishable_...` ativa
- `service_role`: não utilizada e não incluída

## Banco conferido

O banco existente já contém:

- `public.tenants`
- `public.profiles`
- `public.access_requests`
- `public.tenant_members`
- `public.tenant_features`
- `public.tenant_site_profiles`
- `private.platform_admins`
- bucket público `tenant-media`

Também estão disponíveis as funções utilizadas pelo código:

- `admin_update_access_request`
- `approve_access_request`
- `reject_access_request`
- `is_current_user_admin`
- `get_public_tenant_site_profile`
- `save_tenant_site_profile`
- `apply_tenant_visual_settings_to_all`

Os logs recentes confirmam respostas `200` do RPC público, acesso às mídias do bucket e login OTP concluído com sucesso no domínio atual.

## Migrações

O histórico remoto não usa os mesmos timestamps do pacote local. O schema final e as funções necessárias já estão presentes, portanto as oito migrações locais não devem ser reaplicadas automaticamente. Antes de qualquer alteração futura, deve-se reconciliar o histórico remoto com o diretório `supabase/migrations`.

## Aviso de segurança

O advisor do Supabase sinalizou `private.platform_admins` sem RLS. Não foi aplicada correção automática, porque ativar RLS sem políticas pode interromper as funções administrativas. A tabela está no schema `private`, e o pacote revoga permissões diretas; mesmo assim, a recomendação deve ser revisada antes do lançamento definitivo.

Também há alertas de funções `SECURITY DEFINER`. Algumas são intencionais para a arquitetura atual, mas devem manter verificações internas de administrador/tenant.

## Publicação

O pacote está pronto para ser entregue ao construtor remoto com:

- código e mídias preservados;
- `.openai/hosting.json` restaurado;
- `.env.production` configurado para o mesmo Supabase;
- DNS atual sem alterações.

Depois de criada a URL temporária, adicionar essa URL às configurações permitidas do Supabase Auth e testar:

- `/`
- `/login`
- `/admin/acessos`
- `/admin/empresas`
- `/painel`
- `/leads`
- `/ponto-vivo`
