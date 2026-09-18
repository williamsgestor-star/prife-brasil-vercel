# Controle de ativacao e mensalidade

Atualizado em 09/09/2026.

## Regras

- Ativacao: R$ 500,00.
- Mensalidade: R$ 29,90.
- Subdominios novos recebem vencimento em 30 dias.
- O administrador pode ativar ou desativar o site manualmente.
- Registrar a mensalidade renova o vencimento por mais 30 dias e reativa o site.
- Quando vencido, o site publico, o Prospector e as ferramentas protegidas ficam indisponiveis automaticamente.
- O tenant `williams` permanece isento do bloqueio automatico porque tambem atende `www.prife-brasil.com`.

## Painel administrativo

Cada empresa mostra no proprio cartao:

- status ATIVO/BLOQUEADO;
- data de inicio;
- dias restantes;
- valor de ativacao;
- valor da mensalidade.

Ao selecionar a empresa, o administrador tambem visualiza vencimento e possui os botoes:

- Ativar site / Desativar site;
- Registrar mensalidade R$ 29,90.

## Protecoes implementadas

- `get_public_tenant_site_profile`: so retorna tenant ativo, habilitado e dentro do vencimento (ou isento).
- `/leads`: bloqueia tenant desativado ou vencido antes de consultar/entregar leads.
- `requireApprovedAccess`: bloqueia Prospector e PontoVivo para tenant desativado ou vencido.
- Pagina publica: um tenant bloqueado nao faz fallback para o conteudo do Williams; exibe uma tela propria de indisponibilidade.

## Verificacao

- Banco de producao confirmado no Supabase `jmingbhpyyfsganoougf`.
- `williams`: ativo e isento de bloqueio automatico.
- `damasceno`: ativo, ciclo mensal configurado.
- Teste local `tests/billing-source.test.mjs`: 4/4 aprovado.
- A compilacao completa nao foi executada neste ambiente porque o registro npm externo nao possui resolucao de rede; os arquivos alterados foram validados sintaticamente pelo compilador TypeScript disponivel no ambiente.
