# Novas chaves de notificações

Esta preparação não altera Secrets, não conecta o projeto externo e não implanta funções. O Cloud atual continua usando a chave pública anterior até a nova configuração ser aplicada.

## 1. Gerar as chaves no seu computador

Instale Node.js LTS, baixe o código atualizado do projeto e abra o terminal na pasta extraída. Execute:

```sh
node scripts/generate-vapid.mjs
```

O comando salva `muniz-vapid-secrets.txt` na sua pasta pessoal, fora do projeto. Não substitui um arquivo existente. Abra esse arquivo localmente; não envie seu conteúdo ao chat. Guarde uma cópia em um gerenciador de senhas. No Windows, confira também as permissões de acesso ao arquivo.

## 2. Configurar no projeto externo

Na área de Secrets das Edge Functions do seu projeto externo, cadastre:

- `VAPID_PUBLIC_KEY`: valor público do arquivo.
- `VAPID_PRIVATE_KEY`: valor privado do mesmo arquivo.
- `VAPID_SUBJECT`: mantenha o contato já cadastrado.

As chaves precisam ser do mesmo par. Não gere uma segunda chave para o frontend.

## 3. Configurar o app

A chave pública precisa ser configurada no ambiente de compilação como `VITE_VAPID_PUBLIC_KEY`, com o mesmo valor de `VAPID_PUBLIC_KEY`. Ela não é segredo. Cadastrar apenas um Secret da função não configura o app.

Se o app continuar sendo editado no Lovable, envie **somente a chave pública** no chat para que ela seja aplicada à configuração do app. Nunca envie `VAPID_PRIVATE_KEY`.

## 4. Implantar e ativar

Implante o código atualizado de `supabase/functions/send-push-notification/index.ts` no projeto externo. Confirme a conexão do app ao projeto externo antes de testar. Os gatilhos de notificações e seus endereços também devem apontar para o projeto externo; este ajuste de chaves não migra os gatilhos.

Após publicar a versão com a nova chave pública, cada usuário deverá abrir o app e ativar as notificações novamente. O app identifica a inscrição antiga e, ao ativar, tenta substituí-la pela inscrição do novo par.

## 5. Verificar

Teste em um dispositivo real: entrar, ativar notificações, gerar uma notificação legítima para esse usuário e confirmar o recebimento com o app em segundo plano. Confira também os resultados de envio e erros nos logs da função externa, sem registrar chaves privadas.

Não remova o Cloud antigo antes de validar todos os fluxos da migração. Esta troca não configura o OCR.