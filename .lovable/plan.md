
## Plano: PWA + Web Push para celular

Adiciona notificações no celular (Android e iPhone) reaproveitando 100% o sistema de notificações in-app já implementado. Toda vez que uma linha for inserida em `notifications`, um trigger dispara uma edge function que envia o push para os dispositivos do usuário.

### 1. PWA (instalável na tela inicial)
Já temos `manifest.json` e `theme-color` no `index.html`. Falta:
- **Service worker** (`public/sw.js`) — recebe eventos `push` e mostra a notificação nativa do SO. Também trata clique (abre o app na rota `/`).
- **Registro do SW** em `src/main.tsx` com guard pra não registrar dentro do iframe do editor Lovable nem em `id-preview--*` (evita cache obsoleto). Só ativa em produção (`agendamentosmuniz.lovable.app`).
- Ícones 192/512 já referenciados no manifest — assumir que existem; se faltarem, gerar.

### 2. Tabela `push_subscriptions`
Guarda as inscrições Web Push de cada dispositivo:
- `user_id` (uuid)
- `endpoint` (text, único) — URL do push service do navegador
- `p256dh` (text), `auth` (text) — chaves de criptografia da inscrição
- `user_agent` (text, opcional) — pra debug
- RLS: usuário só vê/insere/deleta as próprias inscrições.

### 3. VAPID keys (chaves do Web Push)
- Gerar par VAPID (público/privado) — script único rodado no sandbox via `web-push`.
- Chave **pública** vai hardcoded no frontend (é pública por design).
- Chave **privada** + `VAPID_SUBJECT` (mailto:contato@muniz...) viram secrets na edge function.

### 4. Frontend: registro de inscrição
Novo hook `usePushSubscription(userId)`:
- Detecta se o navegador suporta (`'serviceWorker' in navigator && 'PushManager' in window`).
- Botão "Ativar notificações no celular" no dropdown do `NotificationBell` (ou auto-trigger após login).
- Pede permissão → cria `PushSubscription` com a VAPID public key → faz upsert na tabela `push_subscriptions` por `endpoint`.
- Botão "Desativar" desinscreve e remove a linha.

### 5. Edge function `send-push-notification`
- Recebe `{ notification_id }`.
- Busca a notificação + todas as `push_subscriptions` do `user_id`.
- Envia push para cada endpoint usando `web-push` (Deno-compatible via npm specifier).
- Se um endpoint retornar 404/410 (inscrição expirada), deleta a linha.
- Roda com service role, `verify_jwt = false` (chamada interna pelo trigger).

### 6. Trigger no banco
`AFTER INSERT ON notifications` → chama a edge function via `pg_net.http_post` passando `notification_id`. Async, não bloqueia o insert. Como precisa de URL + anon key, vai pelo tool de **insert** (não migration) seguindo o padrão dos crons já existentes.

### Fluxo completo (exemplo: nova reunião)
1. Pré-vendedor cria reunião → INSERT em `meetings`
2. Trigger `notify_admins_new_meeting` (já existe) → INSERT em `notifications` para cada admin
3. **Novo** trigger `on_notification_created` → `pg_net` chama `send-push-notification`
4. Edge function envia push pra todos os celulares dos admins inscritos
5. Service worker mostra notificação nativa no celular (mesmo com app fechado)
6. Em paralelo, o realtime já existente atualiza o sino in-app

### Limitações que vou comunicar
- **iPhone**: precisa instalar o site na tela inicial (Adicionar à Tela de Início no Safari). Sem isso, push não funciona — limitação da Apple.
- **Editor Lovable**: o service worker é desativado dentro do iframe do editor. Precisa testar no app publicado (`agendamentosmuniz.lovable.app`).
- Permissão de notificação só pode ser pedida via interação do usuário (clique no botão).

### Arquivos a criar/alterar
- **Novo**: `public/sw.js`, `src/hooks/usePushSubscription.ts`, edge function `send-push-notification`, migração da tabela `push_subscriptions`.
- **Alterar**: `src/main.tsx` (registro do SW), `src/components/NotificationBell.tsx` (botão ativar/desativar push).
- **Operacional**: gerar VAPID keys, adicionar 2 secrets (`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), criar trigger via insert tool.

### Ordem de execução após aprovação
1. Gerar VAPID keys e pedir os 2 secrets
2. Migração da tabela `push_subscriptions`
3. Criar service worker + registro + hook + UI
4. Criar edge function `send-push-notification`
5. Criar trigger `on_notification_created` via insert tool
