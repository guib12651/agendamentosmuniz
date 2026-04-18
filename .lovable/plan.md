
## Plano: Notificações in-app

Sino no header com badge de não-lidas + dropdown com lista. Três gatilhos:

### 1. Nova reunião agendada (admins)
- **Como**: trigger no Postgres em `meetings AFTER INSERT` que insere uma notificação para cada admin (consulta `user_roles` com role='admin').
- **Realtime**: cliente assina mudanças na tabela `notifications` filtradas por `user_id = auth.uid()`. Toast aparece + badge incrementa.

### 2. Lembrete 30 min antes (pré-vendedor)
- **Como**: edge function `check-meeting-reminders` rodando a cada 5 min via `pg_cron`. Busca reuniões cujo `date+time` cai entre "agora+25min" e "agora+30min", status=pending, e que ainda não tenham notificação do tipo `reminder` para aquele meeting_id. Insere notificação para o `user_id` da reunião.
- Coluna `meeting_id` + tipo evita duplicatas.

### 3. Resumo diário 09:10 (admins)
- **Como**: edge function `daily-summary` rodando via `pg_cron` às 12:10 UTC (=09:10 BRT). Conta reuniões do dia (total, por pré-vendedor, presencial vs online) e insere uma notificação tipo `summary` para cada admin com o texto montado.

### Estrutura da tabela `notifications`
```
id uuid pk
user_id uuid (destinatário)
type text ('new_meeting' | 'reminder' | 'summary')
title text
message text
meeting_id uuid null (referência opcional)
read boolean default false
created_at timestamptz default now()
```
- RLS: usuário vê/atualiza/deleta apenas as próprias.
- Index em `(user_id, read, created_at desc)`.
- Adicionar tabela ao publication `supabase_realtime`.

### UI
- **`src/components/NotificationBell.tsx`** (novo): ícone Bell no header com badge vermelho do contador não-lidas. Popover com lista das últimas 20: título, mensagem, tempo relativo ("há 5 min"), indicador de não-lida. Clicar marca como lida. Botão "Marcar todas como lidas" e "Limpar todas".
- **`src/hooks/useNotifications.ts`** (novo): busca inicial + subscription realtime + helpers (markAsRead, markAllAsRead, deleteAll). Toast (sonner) ao receber nova notificação.
- **`src/pages/Index.tsx`**: monta `<NotificationBell />` no header ao lado do nome do usuário.

### Migração SQL (resumo)
1. Criar tabela `notifications` + RLS + índice + realtime publication.
2. Função `notify_admins_new_meeting()` + trigger `AFTER INSERT ON meetings`.
3. Habilitar `pg_cron` e `pg_net`.
4. Criar 2 cron jobs apontando para as edge functions (a cada 5 min e diário 12:10 UTC) — feitos via tool de insert (não migração) por conterem URL/anon key.

### Edge functions
- `supabase/functions/check-meeting-reminders/index.ts`
- `supabase/functions/daily-summary/index.ts`
- Ambas usam service role key, sem `verify_jwt` (chamadas pelo cron).

### Arquivos a criar/alterar
- **Novo**: migração SQL, `NotificationBell.tsx`, `useNotifications.ts`, 2 edge functions.
- **Alterar**: `src/pages/Index.tsx` (adicionar sino no header).
