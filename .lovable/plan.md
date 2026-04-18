
## Continuação: PWA + Web Push

Retomar da etapa 3 do plano original. Próximo passo imediato: pedir os 2 secrets.

### Pedir secrets
- `VAPID_PRIVATE_KEY` — chave privada gerada (eu já tenho o valor, vou pré-preencher no pedido)
- `VAPID_SUBJECT` — `mailto:contato@munizconsultorias.com.br` (pré-preenchido; usuário pode trocar pelo email dele)

### Depois dos secrets aprovados (sem nova aprovação)
1. `public/sw.js` — service worker que escuta `push` e mostra notificação nativa; clique abre `/`
2. `src/main.tsx` — registra SW só em produção, fora do iframe do editor
3. `src/hooks/usePushSubscription.ts` — detecta suporte, pede permissão, faz subscribe com VAPID public key, upsert em `push_subscriptions` por `endpoint`, e unsubscribe
4. `src/components/NotificationBell.tsx` — adicionar item "Ativar/Desativar notificações no celular" no topo do dropdown
5. Edge function `supabase/functions/send-push-notification/index.ts` — recebe `notification_id`, busca subscriptions do user, envia via `web-push` (npm specifier), apaga endpoints 404/410. `verify_jwt = false` no `config.toml`
6. Trigger `on_notification_created` via insert tool — `AFTER INSERT ON notifications` chama a função via `pg_net.http_post` com `notification_id`, async

### Arquivo único modificado fora do plano
`src/integrations/supabase/types.ts` já tem `push_subscriptions` (auto-gerado pela migração anterior), nada a fazer.
