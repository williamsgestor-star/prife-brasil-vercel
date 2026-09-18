# Transferência do projeto Prife Brasil

Este pacote contém o código-fonte e os arquivos públicos do site principal e dos subdomínios. Ele não inclui senhas, chaves privadas, dependências instaladas, arquivos temporários nem o vínculo da conta original do Sites.

## Caminho mais rápido na outra conta

1. Entre na sua outra conta pessoal do ChatGPT.
2. Abra uma conversa nova no modo de trabalho e envie o arquivo `prife-brasil-transferencia.zip`.
3. Envie esta mensagem junto com o arquivo:

   > Continue este projeto como um novo Site. Importe o código sem alterar o visual nem as funcionalidades. O site usa o mesmo projeto Supabase já existente. Primeiro instale as dependências, valide o build e publique em uma URL temporária. Não altere o DNS nem o domínio principal antes de eu testar e autorizar.

4. Conecte a integração do Supabase na nova conta usando o mesmo acesso do projeto atual.
5. Peça para configurar no novo Site as variáveis listadas em `.env.example`.
6. Teste a URL temporária. Somente depois, vincule `prife-brasil.com`, `www.prife-brasil.com` e os subdomínios.

## Dados do projeto atual

- Domínio principal: `prife-brasil.com`
- Subdomínio existente: `damasceno.prife-brasil.com`
- Referência do Supabase: `jmingbhpyyfsganoougf`
- URL pública do Supabase: `https://jmingbhpyyfsganoougf.supabase.co`
- Login: `/login`
- Painel de acessos: `/admin/acessos`
- Painel de edição: `/painel`
- Prospector: `/leads`

## Importante

- Mantenha o site atual publicado enquanto o novo é preparado.
- O banco, os usuários e os conteúdos permanecem no Supabase; não é necessário copiar o banco se o novo Site continuar usando o mesmo projeto.
- A chave pública do Supabase deve ser obtida no painel do próprio Supabase ou pela integração conectada na nova conta.
- A chave `GOOGLE_PLACES_API_KEY` é opcional e não estava configurada no Site na data deste pacote. Sem ela, o Prospector usa a fonte aberta de dados implementada no projeto.
- Não envie a chave secreta `service_role` para chats nem a coloque no navegador.

## Para preservar também esta conversa

Na conta atual, use **Configurações > Controles de dados > Exportar dados**. Na outra conta, envie o arquivo `conversations.json` em uma conversa nova para servir como referência. Isso não transfere automaticamente o histórico para a barra lateral, mas ajuda a recuperar decisões anteriores.
