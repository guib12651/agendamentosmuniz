## Criar usuários pelo app (apenas Admin)

Adicionar funcionalidade para que administradores criem novos logins diretamente na aba **Gerenciar Usuários**, sem precisar usar o painel do backend.

### Fluxo na interface
- Novo botão **"+ Novo Usuário"** no topo da página `/usuarios`.
- Ao clicar, abre um modal com:
  - **Nome de exibição** (ex: "João Silva")
  - **Usuário (login)** (ex: "joao") — sem espaços, minúsculo
  - **Senha** (mínimo 6 caracteres) + botão de mostrar/ocultar
  - **Função**: Administrador, Pré-vendedor, Vendedor ou Consultor
- Ao confirmar, o usuário é criado e aparece imediatamente na lista, já podendo ser bloqueado/desbloqueado ou ter a função alterada.

### Como funciona por trás (técnico)
- Criar uma **edge function** `create-user` (protegida) que:
  1. Valida que quem chamou é admin (via JWT + checagem em `user_roles`).
  2. Usa o service role para `supabase.auth.admin.createUser` com email `{username}@muniz.internal` e `email_confirm: true`.
  3. Insere registro em `profiles` (id, username, display_name, role) e em `user_roles`.
  4. Retorna sucesso ou erro tratado (ex: "Usuário já existe").
- No frontend, `GerenciarUsuarios.tsx` chama essa função via `supabase.functions.invoke('create-user', ...)` e recarrega a lista.
- Validação client-side com **zod** (username único em letras minúsculas, senha ≥ 6 caracteres, display_name obrigatório).

### Segurança
- Somente admins conseguem invocar (checagem dupla: RLS-like dentro da função + UI escondida).
- Senha nunca é logada.
- Username é normalizado para minúsculo e sem espaços antes da criação do email interno.
