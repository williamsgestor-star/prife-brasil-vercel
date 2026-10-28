# Prife Brasil — instruções para o Claude

Site e sistema da Prife Brasil (prife-brasil.com): página principal, subdomínios por empresa (tenant), painel admin, CRM, Prospector e a assistente Itera.
Dono: Williams (WR Creative Digital). Responda sempre em português.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript, código em `app/`.
- Supabase (projeto `jmingbhpyyfsganoougf`, PostgreSQL 17): auth multiempresa, RLS, Storage (`tenant-media`), Edge Functions em `supabase/functions/`.
- Deploy: Vercel, automático a cada push na `main`. Push na `main` = produção.
- O `README.md` e os arquivos `vinext`/`wrangler`/`.openai/` são resto do template inicial. Ignore-os; o que vale é este arquivo.

## Comandos
- `npm run dev`: servidor local.
- `node --test tests/*.test.mjs`: testes rápidos (leem o código-fonte, não precisam de build). Rode antes de propor um push.
- `npm test`: faz o build completo antes dos testes; use só para diagnóstico.
- `npx eslint <arquivo>`: lint de um arquivo.

## Regras fixas
- Mostre uma prévia (branch/PR com deploy de preview da Vercel) antes de qualquer mudança ir para a `main`.
- Nunca edite uma migração que já está em `supabase/migrations/`: ela já rodou no banco. Crie uma nova com a skill `/nova-migracao`.
- O histórico de migrações do banco foi alinhado com o repositório em 28/10/2026 (registros `repair-registro-repo`). Mantenha o número do arquivo igual ao registrado no banco.
- Nunca peça, exiba nem grave chaves secretas. Variáveis ficam na Vercel e nos segredos do Supabase; passe ao Williams o comando para ele colar.
- A chave `service_role` só pode aparecer em Edge Functions, nunca em código que roda no navegador nem em `NEXT_PUBLIC_*`.
- Toda tabela nova em `public` nasce com RLS ligado e políticas usando `(select auth.uid())`.
- Funções `SECURITY DEFINER` precisam de `set search_path = ''` e de checagem interna de admin/dono do tenant.
- Dados de leads e do CRM são dados pessoais (LGPD): nada de exportar, logar ou enviar para serviços externos sem pedido explícito.
- Limite de upload do bucket `tenant-media`: 10 MB (vídeos). Imagens são convertidas para WebP no editor antes do envio.
- Pendência conhecida: a chave do Azure Maps (`AZURE_MAPS_SUBSCRIPTION_KEY`) retorna 401 até o Williams trocá-la.

## Automações do Claude Code neste repositório
- Hook antes de editar: bloqueia `.env*`, `package-lock.json` e migrações existentes.
- Hook depois de editar: roda o ESLint no arquivo alterado.
- Subagente `revisor-seguranca`: chame antes de mexer em login, cobrança, RLS, funções de admin ou CRM.
- Skill `/nova-migracao`: cria e aplica migrações sem dessincronizar o histórico.
