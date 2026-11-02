-- Liga o RLS nas 4 tabelas que ainda estavam sem (auditoria de 02/11/2026).
-- Nenhuma delas tinha acesso direto pela API; o app só usa essas tabelas por
-- funções SECURITY DEFINER, que continuam funcionando.
--
-- Já aplicada no banco em 02/11/2026 pelo MCP do Supabase (versão 20261102035441);
-- este arquivo só alinha o repositório com o histórico do banco.

alter table private.platform_admins enable row level security;
alter table vox.musicas enable row level security;
alter table vox.oracoes enable row level security;
alter table vox.limites enable row level security;
