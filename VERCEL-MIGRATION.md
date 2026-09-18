# PRIFE Brasil — publicação no Vercel

Esta ramificação mantém o aplicativo e o Supabase existentes e troca apenas os
comandos padrão de desenvolvimento e compilação para o Next.js nativo do Vercel.

## Configuração do projeto

- Framework Preset: Next.js
- Node.js: 22.x
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: padrão do Next.js (não preencher)

## Variáveis de ambiente

Cadastre no painel do Vercel todas as chaves listadas em `.env.example` para
Production, Preview e Development. Não envie valores secretos ao GitHub.

## Migração de domínios

Publique e teste primeiro no endereço temporário `vercel.app`. Somente depois
adicione os subdomínios ao projeto e altere os CNAMEs na HostGator, um por vez.
O domínio principal `www.prife-brasil.com` deve ser o último.
